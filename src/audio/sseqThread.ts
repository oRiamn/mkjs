import { SSEQPlayer, ThreadM } from "./sseqPlayer";

type SSEQInstruction = (this: SSEQThread, inst: number) => void;
type SSEQArgumentReader = (last: number) => number;

export class SSEQThread {
	private _VOLMUL: number;
	private _pc: number;
	private _prog: Uint8Array;
	private _player: SSEQPlayer;
	private _comparisonResult: boolean;
	private _force: boolean;
	private _forceCommand: number;
	private _forceValue: number;
	private _forceSpecial: number;
	decay: number | null;
	buffer: number;
	wait: number;
	offT: number;
	program: number;
	pitchBendRange: number;
	pitchBend: number;
	portaKey: number;
	portaTime: number;
	sweepPitch: number;
	transpose: number;
	attack: number | null;
	delay: number | null;
	sustain: number | null;
	release: number | null;
	tie: number;
	noteWait: boolean;
	loopPtr: number;
	loopTimes: number;
	private _ctx: AudioContext;
	private _gainL: GainNode;
	private _gainR: GainNode;
	private _merger: ChannelMergerNode;
	pan: number;
	gain: GainNode;
	lastNote: ThreadM | null;
	dead: boolean;
	stack: number[];
	private _InstArgs: SSEQArgumentReader[][];
	private _Instructions: SSEQInstruction[];
	private _varFunc: ((a: number, b: number) => void)[];
	private _boolFunc: ((a: number, b: number) => boolean)[];

	constructor(prog: Uint8Array, pc: number, player: SSEQPlayer) {
		this._VOLMUL = 1 / 4;

		this._pc = pc;
		this._prog = prog;
		this._player = player;
		this._comparisonResult = false;

		//hacky implementation for certain instructions forcing the values of the next. thanks guys for making me have to do this
		this._force = false;
		this._forceCommand = 0;
		this._forceValue = 0;
		this._forceSpecial = 0;

		this.decay = null;

		this.buffer = 10; //the distance in beats where we queue notes to fire.
		this.wait = 0;
		this.offT = 0;

		this.program = 0;
		this.pitchBendRange = 1;
		this.pitchBend = 0;
		this.portaKey = 0x80; //is a byte, top bit is on/off (set is off).
		this.portaTime = 0;
		this.sweepPitch = 0;
		this.transpose = 0;

		this.attack = null;
		this.delay = null;
		this.sustain = null;
		this.release = null;

		this.tie = 0;

		this.noteWait = true;
		this.loopPtr = 0;
		this.loopTimes = 0;

		//set up volume and pan controls
		this._ctx = this._player.ctx;
		this._gainL = this._ctx.createGain();
		this._gainR = this._ctx.createGain();
		this._gainL.gain.value = parseFloat("1");
		this._gainR.gain.value = parseFloat("1");
		this._merger = this._ctx.createChannelMerger(2);

		this.pan = 0;

		this.gain = this._player.ctx.createGain();
		this.gain.connect(this._gainL);
		this.gain.connect(this._gainR);

		this.gain.gain.value = parseFloat(`${this._VOLMUL}`);

		//splitter.connect(gainL, 0);
		//splitter.connect(gainR, 1);
		this._gainL.connect(this._merger, 0, 0);
		this._gainR.connect(this._merger, 0, 1);
		this._merger.connect(this._player.masterGain, 0, 0);
		//end audio setup

		this.lastNote = null;
		this.dead = false;

		this.stack = [];

		// prettier-ignore
		this._InstArgs = [ //starts at 0x80
			[this._readVariableLength], [this._readVariableLength], [], [], [], [], [], [], [], [], [], [], [], [], [], [], //0x80-0x8F
			[], [], [], [this._read8, this._read24], [this._read24], [this._read24], [], [], [], [], [], [], [], [], [], [], //0x90-0x9F
			[this._read8, this._readSpecial, this._read16, this._read16], [this._read8, this._readSpecial], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
			[this._read8, this._read8], [this._read8, this._read8], [this._read8, this._read8], [this._read8, this._read8], [this._read8, this._read8], [this._read8, this._read8], [this._read8, this._read8], [], [this._read8, this._read8], [this._read8, this._read8], [this._read8, this._read8], [this._read8, this._read8], [this._read8, this._read8], [this._read8, this._read8], [], [], //0xB0-0xBF
			[this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8],
			[this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [this._read8], [], [], [], [], [], [], [], [], [],
			[this._read16], [this._read16], [this._read16], [], [], [], [], [], [], [], [], [], [], [], [], [],
			[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
		]

		this._Instructions = [];

		this._Instructions[0xfe] = () => {
			//track definition
			this._player.trackAlloc = this._read16();
		};

		this._Instructions[0x93] = () => {
			//track definition
			const trackID = this._prog[this._pc++];
			let newPC = this._prog[this._pc++];
			newPC |= this._prog[this._pc++] << 8;
			newPC |= this._prog[this._pc++] << 16;

			const bit = 1 << trackID;
			if (!(this._player.trackStarted & bit) && this._player.trackAlloc & bit) {
				this._player.trackStarted |= bit;
				this._player.startThread(newPC);
			}
		};

		this._Instructions[0x80] = () => {
			//rest
			const length = this._forcableValueFunc(false, this._readVariableLength.bind(this));
			this.wait += length;
		};

		this._Instructions[0x81] = () => {
			//bank or program change
			const dat = this._forcableValueFunc(false, this._readVariableLength.bind(this));
			this.program = dat & 0x7f;
			const bank = dat >> 7;
			if (bank != 0) this._player.loadBank(bank);
		};

		this._Instructions[0x94] = () => {
			//JUMP
			let newPC = this._prog[this._pc++];
			newPC |= this._prog[this._pc++] << 8;
			newPC |= this._prog[this._pc++] << 16;
			this._pc = newPC;
		};

		this._Instructions[0x95] = () => {
			//CALL
			let newPC = this._prog[this._pc++];
			newPC |= this._prog[this._pc++] << 8;
			newPC |= this._prog[this._pc++] << 16;
			this.stack.push(this._pc);
			this._pc = newPC;
		};

		this._Instructions[0xfd] = () => {
			//RETURN
			if (this.stack.length == 0) {
				this._Instructions[0xff].call(this, 0xff);
				return;
			}
			this._pc = this.stack.pop()!;
		};

		//LOGIC INSTRUCTIONS

		this._Instructions[0xa0] = () => {
			//random
			this._force = true; //this command forces the input to the next command to be a generated random number
			this._forceCommand = this._prog[this._pc++];
			if (this._forceCommand < 0x80 || (this._forceCommand >= 0xb0 && this._forceCommand <= 0xbd))
				this._forceSpecial = this._prog[this._pc++];
			const min = this._reads16();
			const max = this._reads16();
			this._forceValue = Math.floor(Math.random() * (max - min + 1)) + min;
		};

		this._Instructions[0xa1] = () => {
			//from var
			this._force = true; //this command forces the input to the next command to be from a variable. use with caution probably!
			this._forceCommand = this._prog[this._pc++];
			if (this._forceCommand < 0x80 || (this._forceCommand >= 0xb0 && this._forceCommand <= 0xbd))
				this._forceSpecial = this._prog[this._pc++];
			this._forceValue = this._player.vars[this._prog[this._pc++]];
		};

		this._varFunc = [
			//"=", "+=", "-=", "*=", "/=", "[Shift]", "[Rand]"
			(a, b) => {
				this._player.vars[a] = b;
			},
			(a, b) => {
				this._player.vars[a] += b;
			},
			(a, b) => {
				this._player.vars[a] -= b;
			},
			(a, b) => {
				this._player.vars[a] *= b;
			},
			(a, b) => {
				this._player.vars[a] = Math.floor(this._player.vars[a] / b);
			},
			(a, b) => {
				if (b < 0) this._player.vars[a] = this._player.vars[a] >> -b;
				else this._player.vars[a] = this._player.vars[a] << b;
			},
			(a, b) => {
				if (b < 0) this._player.vars[a] = -(Math.floor(Math.random() * 256) % (1 - b));
				else this._player.vars[a] = -(Math.floor(Math.random() * 256) % (b + 1));
			},
		];

		this._Instructions[0xb0] = this._varInst;
		this._Instructions[0xb1] = this._varInst;
		this._Instructions[0xb2] = this._varInst;
		this._Instructions[0xb3] = this._varInst;
		this._Instructions[0xb4] = this._varInst;
		this._Instructions[0xb5] = this._varInst;
		this._Instructions[0xb6] = this._varInst;

		this._boolFunc = [
			(a, b) => {
				return this._player.vars[a] == b;
			},
			(a, b) => {
				return this._player.vars[a] >= b;
			},
			(a, b) => {
				return this._player.vars[a] > b;
			},
			(a, b) => {
				return this._player.vars[a] <= b;
			},
			(a, b) => {
				return this._player.vars[a] < b;
			},
			(a, b) => {
				return this._player.vars[a] != b;
			},
		];

		this._Instructions[0xb8] = this._boolInst;
		this._Instructions[0xb9] = this._boolInst;
		this._Instructions[0xba] = this._boolInst;
		this._Instructions[0xbb] = this._boolInst;
		this._Instructions[0xbc] = this._boolInst;
		this._Instructions[0xbd] = this._boolInst;

		this._Instructions[0xa2] = () => {
			//if#
			if (!this._comparisonResult) {
				//skip next
				const inst = this._prog[this._pc++];
				if (inst < 0x80) {
					this._read8();
					this._readVariableLength();
				} else {
					const cmds = this._InstArgs[inst - 0x80];
					let last = 0;
					for (let i = 0; i < cmds.length; i++) {
						last = cmds[i].bind(this)(last);
					}
				}
			}
		};

		//END LOGIC INSTRUCTIONS

		this._Instructions[0xc0] = () => {
			const value = this._forcableValue();
			this._setPan((value - 64) / 64);
		}; //pan
		this._Instructions[0xc1] = () => {
			const value = this._forcableValue();
			this.gain.gain.setValueAtTime((value / 0x7f) * this._VOLMUL, this._scheduleTime(this.calculateCurrentTime()));
		}; //volume
		this._Instructions[0xc2] = () => {
			const value = this._forcableValue();
			this._player.masterGain.gain.setValueAtTime(value / 0x7f, this._scheduleTime(this.calculateCurrentTime()));
		}; //master volume
		this._Instructions[0xc3] = () => {
			this.transpose = this._forcableValue();
			if (this.transpose & 0x80) this.transpose -= 256;
		}; //transpose
		this._Instructions[0xc4] = () => {
			this.pitchBend = this._forcableValue();
			if (this.pitchBend & 128) this.pitchBend -= 256;
			if (this.lastNote) {
				this.lastNote.pitched = true;
				this._player.updateNoteFreq(this, this.lastNote);
			}
		}; //pitch bend
		this._Instructions[0xc5] = () => {
			this.pitchBendRange = this._prog[this._pc++];
		}; //pitch bend range
		this._Instructions[0xc6] = () => {}; //track priority

		this._Instructions[0xc7] = () => {
			this.noteWait = this._prog[this._pc++] > 0;
		}; //mono/poly

		this._Instructions[0xc8] = () => {
			this.tie = this._prog[this._pc++];
			if (this.lastNote != null) this._player.cutNoteShort(this, this.lastNote);
			this.lastNote = null;
		}; //tie
		this._Instructions[0xc9] = () => {
			this.portaKey = this._prog[this._pc++];
		}; //portamento control
		this._Instructions[0xca] = () => {}; //modulation depth
		this._Instructions[0xcb] = () => {}; //modulation speed
		this._Instructions[0xcc] = () => {}; //modulation type
		this._Instructions[0xcd] = () => {}; //modulation range
		this._Instructions[0xce] = () => {
			this.portaKey = (this.portaKey & 0x7f) | (+!this._prog[this._pc++] << 7); //portamento on/off
		};
		this._Instructions[0xcf] = () => {
			this.portaTime = this._forcableValue();
		}; //portamento time
		this._Instructions[0xd0] = () => {
			this.attack = this._forcableValue();
		}; //attack rate
		this._Instructions[0xd1] = () => {
			this.decay = this._forcableValue();
		}; //decay rate
		this._Instructions[0xd2] = () => {
			this.sustain = this._forcableValue();
		}; //sustain rate
		this._Instructions[0xd3] = () => {
			this.release = this._forcableValue();
		}; //release rate

		this._Instructions[0xd4] = () => {
			this.loopTimes = this._forcableValue();
			this.loopPtr = this._pc;
		}; //loop start
		this._Instructions[0xfc] = () => {
			if (this.loopTimes-- > 0) this._pc = this.loopPtr;
		}; //loop end

		this._Instructions[0xd5] = () => {}; //expression
		this._Instructions[0xd6] = () => {}; //print variable
		this._Instructions[0xe0] = () => {
			this._pc++;
			this._pc++;
		}; //modulation delay

		this._Instructions[0xe1] = () => {
			let value = this._prog[this._pc++];
			value |= this._prog[this._pc++] << 8;
			this._player.setTempo(value);
		}; //set BPM

		this._Instructions[0xe3] = () => {
			this.sweepPitch = this._forcableValueFunc(false, this._reads16.bind(this));
		}; //sweep pitch

		this._Instructions[0xff] = () => {
			if (this.lastNote != null) this._player.cutNoteShort(this, this.lastNote);
			this._player.terminateThread(this);
			this.dead = true;
		}; //end of track
	}

	private _boolInst(inst: number) {
		const varNum = this._forcableValue(true);
		let arg = this._forcableValue();
		if (arg & 0x80) arg -= 256;
		this._comparisonResult = this._boolFunc[inst - 0xb8].bind(this)(varNum, arg);
	}

	private _varInst(inst: number) {
		const varNum = this._forcableValue(true);
		let arg = this._forcableValue();
		if (arg & 0x80) arg -= 256;
		if (inst == 0xb4 && arg == 0) return;
		this._varFunc[inst - 0xb0].bind(this)(varNum, arg);
	}

	tick(time: number) {
		this.wait -= time;
		this.offT = 0;
		let insts = 0;

		while (this.wait < this.buffer && !this.dead) {
			const inst = this._force ? this._forceCommand : this._prog[this._pc++];
			if (inst < 0x80) this._noteOn(inst);
			else if (this._Instructions[inst] != null) this._Instructions[inst].bind(this)(inst);
			else throw "bad instruction??";

			if (this._force && inst != 0xa0 && inst != 0xa1) this._force = false;

			if (++insts > 10000) {
				this._Instructions[0xff].call(this, 0xff);
				console.error("audio thread locked up");
			}
		}

		if (this.wait == Infinity && this.lastNote != null && this.lastNote.note.ended) this._Instructions[0xff].call(this, 0xff);
	}

	private _noteOn(num: number) {
		if (num == 0) return; //NOP
		const velocity = this._forcableValue(true);
		let length = this._forcableValueFunc(false, this._readVariableLength.bind(this));
		if (length == 0) length = Infinity;
		this.lastNote = this._player.playNote(this, velocity, length, num);
		if (this.noteWait) this.wait += length;
	}

	private _ticksToMs(ticks: number) {
		return (ticks / 48) * (60000 / this._player.properties.bpm);
	}

	private _readVariableLength() {
		let read = this._prog[this._pc++];
		let value = read & 0x7f;
		while (read & 0x80) {
			read = this._prog[this._pc++];
			value = (value << 7) | (read & 0x7f);
		}
		return value;
	}

	calculateCurrentTime() {
		const time = this._player.baseAudioTime + this._ticksToMs(this.wait - this._player.remainder) / 1000;
		return this._scheduleTime(time);
	}

	private _scheduleTime(time: number) {
		if (!Number.isFinite(time)) return this._ctx.currentTime;
		return Math.max(time, this._ctx.currentTime);
	}

	private _read16() {
		let value = this._prog[this._pc++];
		value |= this._prog[this._pc++] << 8;
		return value;
	}

	private _reads16() {
		let value = this._read16();
		if (value & 0x8000) value -= 0x10000;
		return value;
	}

	private _read8() {
		return this._prog[this._pc++];
	}

	private _readSpecial(last: number) {
		if (last < 0x80 || (last >= 0xb0 && last < 0xbd)) return this._prog[this._pc++];
		else return 0;
	}

	private _read24() {
		let value = this._prog[this._pc++];
		value |= this._prog[this._pc++] << 8;
		value |= this._prog[this._pc++] << 16;
		return value;
	}

	private _forcableValueFunc(special: boolean, func: () => number) {
		if (this._force) return special ? this._forceSpecial : this._forceValue;
		else return func();
	}

	private _forcableValue(special?: boolean) {
		if (this._force) return special ? this._forceSpecial : this._forceValue;
		else return this._prog[this._pc++];
	}

	private _setPan(value: number) {
		this.pan = value;
		if (value > 0) {
			this._gainR.gain.value = parseFloat("1");
			this._gainL.gain.value = parseFloat(`${1 - value}`);
		} else {
			this._gainR.gain.value = parseFloat(`${1 + value}`);
			this._gainL.gain.value = parseFloat("1");
		}
	}
}
