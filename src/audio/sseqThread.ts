import { SSEQPlayer, ThreadM } from "./sseqPlayer";

export class SSEQThread {
	_VOLMUL: number;
	_pc: number;
	_prog: Uint8Array;
	_player: SSEQPlayer;
	_comparisonResult: boolean;
	_force: boolean;
	_forceCommand: number;
	_forceValue: number;
	_forceSpecial: number;
	decay: any;
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
	attack: number;
	delay: null;
	sustain: number;
	release: number;
	tie: number;
	noteWait: boolean;
	loopPtr: number;
	loopTimes: number;
	_ctx: any;
	_gainL: any;
	_gainR: any;
	_merger: any;
	_splitter: any;
	pan: number;
	gain: any;
	lastNote: ThreadM;
	dead: boolean;
	stack: any[];
	_InstArgs: ((last: any) => any)[][];
	_Instructions: any[];
	_varFunc: ((a: any, b: any) => void)[];
	_boolFunc: ((a: any, b: any) => boolean)[];

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

		this.decay = undefined;

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
		this._splitter = this._ctx.createChannelSplitter(2);

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

		this._Instructions[0xFE] = () => { //track definition
			this._player.trackAlloc = this._read16();
		}

		this._Instructions[0x93] = () => { //track definition
			var trackID = this._prog[this._pc++];
			var newPC = this._prog[this._pc++];
			newPC |= this._prog[this._pc++] << 8;
			newPC |= this._prog[this._pc++] << 16;

			var bit = 1 << trackID;
			if ((!(this._player.trackStarted & bit)) && (this._player.trackAlloc & bit)) {
				this._player.trackStarted |= bit;
				this._player.startThread(newPC);
			}
		}

		this._Instructions[0x80] = () => { //rest
			var length = this._forcableValueFunc(false, this._readVariableLength.bind(this));
			this.wait += length;
		}

		this._Instructions[0x81] = () => { //bank or program change
			var dat = this._forcableValueFunc(false, this._readVariableLength.bind(this));
			this.program = dat & 0x7F;
			var bank = dat >> 7;
			if (bank != 0) this._player.loadBank(bank);
		}

		this._Instructions[0x94] = () => { //JUMP
			var newPC = this._prog[this._pc++];
			newPC |= this._prog[this._pc++] << 8;
			newPC |= this._prog[this._pc++] << 16;
			this._pc = newPC;
		}

		this._Instructions[0x95] = () => { //CALL
			var newPC = this._prog[this._pc++];
			newPC |= this._prog[this._pc++] << 8;
			newPC |= this._prog[this._pc++] << 16;
			this.stack.push(this._pc);
			this._pc = newPC;
		}

		this._Instructions[0xFD] = () => { //RETURN
			if (this.stack.length == 0) this._Instructions[0xFF].bind(this)();
			this._pc = this.stack.pop();
		}

		//LOGIC INSTRUCTIONS

		this._Instructions[0xA0] = () => { //random
			this._force = true; //this command forces the input to the next command to be a generated random number
			this._forceCommand = this._prog[this._pc++];
			if (this._forceCommand < 0x80 || (this._forceCommand >= 0xB0 && this._forceCommand <= 0xBD)) this._forceSpecial = this._prog[this._pc++];
			var min = this._reads16();
			var max = this._reads16();
			this._forceValue = Math.floor(Math.random() * (max - min + 1)) + min;
		}

		this._Instructions[0xA1] = () => { //from var
			this._force = true; //this command forces the input to the next command to be from a variable. use with caution probably!
			this._forceCommand = this._prog[this._pc++];
			if (this._forceCommand < 0x80 || (this._forceCommand >= 0xB0 && this._forceCommand <= 0xBD)) this._forceSpecial = this._prog[this._pc++];
			this._forceValue = this._player.vars[this._prog[this._pc++]];
		}

		this._varFunc = [ //"=", "+=", "-=", "*=", "/=", "[Shift]", "[Rand]"
			(a, b) => { this._player.vars[a] = b },
			(a, b) => { this._player.vars[a] += b },
			(a, b) => { this._player.vars[a] -= b },
			(a, b) => { this._player.vars[a] *= b },
			(a, b) => { this._player.vars[a] = Math.floor(this._player.vars[a] / b) },
			(a, b) => {
				if (b < 0) this._player.vars[a] = this._player.vars[a] >> (-b);
				else this._player.vars[a] = this._player.vars[a] << b;
			},
			(a, b) => {
				if (b < 0) this._player.vars[a] = -(Math.floor(Math.random() * 256) % (1 - b));
				else this._player.vars[a] = -(Math.floor(Math.random() * 256) % (b + 1));
			}
		]

		this._Instructions[0xB0] = this._varInst;
		this._Instructions[0xB1] = this._varInst;
		this._Instructions[0xB2] = this._varInst;
		this._Instructions[0xB3] = this._varInst;
		this._Instructions[0xB4] = this._varInst;
		this._Instructions[0xB5] = this._varInst;
		this._Instructions[0xB6] = this._varInst;


		this._boolFunc = [
			(a, b) => { return this._player.vars[a] == b },
			(a, b) => { return this._player.vars[a] >= b },
			(a, b) => { return this._player.vars[a] > b },
			(a, b) => { return this._player.vars[a] <= b },
			(a, b) => { return this._player.vars[a] < b },
			(a, b) => { return this._player.vars[a] != b },
		]

		this._Instructions[0xB8] = this._boolInst;
		this._Instructions[0xB9] = this._boolInst;
		this._Instructions[0xBA] = this._boolInst;
		this._Instructions[0xBB] = this._boolInst;
		this._Instructions[0xBC] = this._boolInst;
		this._Instructions[0xBD] = this._boolInst;

		this._Instructions[0xA2] = () => { //if#
			if (!this._comparisonResult) {
				//skip next
				var inst = this._prog[this._pc++];
				if (inst < 0x80) {
					this._read8();
					this._readVariableLength();
				} else {
					var cmds = this._InstArgs[inst - 0x80];
					var last = 0;
					for (var i = 0; i < cmds.length; i++) {
						last = cmds[i].bind(this)(last);
					}
				}
			}
		}

		//END LOGIC INSTRUCTIONS

		this._Instructions[0xC0] = () => { var value = this._forcableValue(); this._setPan((value - 64) / 64) } //pan
		this._Instructions[0xC1] = () => { var value = this._forcableValue(); this.gain.gain.setValueAtTime((value / 0x7F) * this._VOLMUL, this.calculateCurrentTime()); } //volume
		this._Instructions[0xC2] = () => { var value = this._forcableValue(); this._player.masterGain.gain.setValueAtTime(value / 0x7F, this.calculateCurrentTime()); } //master volume
		this._Instructions[0xC3] = () => { this.transpose = this._forcableValue(); if (this.transpose & 0x80) this.transpose -= 256; } //transpose
		this._Instructions[0xC4] = () => {
			this.pitchBend = this._forcableValue();
			if (this.pitchBend & 128) this.pitchBend -= 256;
			if (this.lastNote) {
				this.lastNote.pitched = true;
				this._player.updateNoteFreq(this, this.lastNote);
			}
		} //pitch bend
		this._Instructions[0xC5] = () => { this.pitchBendRange = this._prog[this._pc++]; } //pitch bend range
		this._Instructions[0xC6] = () => { var value = this._prog[this._pc++]; } //track priority

		this._Instructions[0xC7] = () => { this.noteWait = (this._prog[this._pc++] > 0); } //mono/poly

		this._Instructions[0xC8] = () => { this.tie = this._prog[this._pc++]; if (this.lastNote != null) this._player.cutNoteShort(this, this.lastNote); this.lastNote = null; } //tie
		this._Instructions[0xC9] = () => { this.portaKey = this._prog[this._pc++]; } //portamento control
		this._Instructions[0xCA] = () => { var value = this._forcableValue(); } //modulation depth
		this._Instructions[0xCB] = () => { var value = this._forcableValue(); } //modulation speed
		this._Instructions[0xCC] = () => { var value = this._prog[this._pc++]; } //modulation type
		this._Instructions[0xCD] = () => { var value = this._prog[this._pc++]; } //modulation range
		this._Instructions[0xCE] = () => { 
			this.portaKey = (this.portaKey & 0x7F) | (+(!this._prog[this._pc++]) << 7); //portamento on/off
		} 
		this._Instructions[0xCF] = () => { this.portaTime = this._forcableValue(); } //portamento time
		this._Instructions[0xD0] = () => { this.attack = this._forcableValue(); } //attack rate
		this._Instructions[0xD1] = () => { this.decay = this._forcableValue(); } //decay rate
		this._Instructions[0xD2] = () => { this.sustain = this._forcableValue(); } //sustain rate
		this._Instructions[0xD3] = () => { this.release = this._forcableValue(); } //release rate

		this._Instructions[0xD4] = () => { this.loopTimes = this._forcableValue(); this.loopPtr = this._pc; } //loop start
		this._Instructions[0xFC] = () => { if (this.loopTimes-- > 0) this._pc = this.loopPtr; } //loop end

		this._Instructions[0xD5] = () => { var value = this._forcableValue(); } //expression
		this._Instructions[0xD6] = () => { var value = this._prog[this._pc++]; } //print variable
		this._Instructions[0xE0] = () => { var value = this._prog[this._pc++]; value |= this._prog[this._pc++] << 8 } //modulation delay

		this._Instructions[0xE1] = () => {
			var value = this._prog[this._pc++];
			value |= this._prog[this._pc++] << 8;
			this._player.setTempo(value);
		} //set BPM

		this._Instructions[0xE3] = () => { this.sweepPitch = this._forcableValueFunc(false, this._reads16.bind(this)); } //sweep pitch

		this._Instructions[0xFF] = () => {
			if (this.lastNote != null) this._player.cutNoteShort(this, this.lastNote);
			this._player.terminateThread(this);
			this.dead = true;
		} //end of track

	}

	_boolInst(inst: number) {
		var varNum = this._forcableValue(true);
		var arg = this._forcableValue();
		if (arg & 0x80) arg -= 256;
		this._comparisonResult = this._boolFunc[inst - 0xB8].bind(this)(varNum, arg);
	}

	_varInst(inst: number) {
		var varNum = this._forcableValue(true);
		var arg = this._forcableValue();
		if (arg & 0x80) arg -= 256;
		if (inst == 0xB4 && arg == 0) return;
		this._varFunc[inst - 0xB0].bind(this)(varNum, arg)
	}

	tick(time: number) {
		this.wait -= time;
		this.offT = 0;
		var insts = 0;

		while (this.wait < this.buffer && !this.dead) {
			var inst = (this._force) ? this._forceCommand : this._prog[this._pc++];
			if (inst < 0x80) this._noteOn(inst);
			else if (this._Instructions[inst] != null) this._Instructions[inst].bind(this)(inst);
			else throw "bad instruction??";

			if (this._force && inst != 0xA0 && inst != 0xA1) this._force = false;

			if (++insts > 10000) { this._Instructions[0xFF].bind(this)(); console.error("audio thread locked up") };
		}

		if (this.wait == Infinity && this.lastNote != null && this.lastNote.note.ended) this._Instructions[0xFF].bind(this)();
	}

	_noteOn(num: number) {
		if (num == 0) return; //NOP
		var velocity = this._forcableValue(true);
		var length = this._forcableValueFunc(false, this._readVariableLength.bind(this));
		if (length == 0) length = Infinity;
		this.lastNote = this._player.playNote(this, velocity, length, num);
		if (this.noteWait) this.wait += length;
	}

	_ticksToMs(ticks: number) {
		return (ticks / 48) * (60000 / this._player.properties.bpm);
	}

	_readVariableLength() {
		var read = this._prog[this._pc++];
		var value = read & 0x7F;
		while (read & 0x80) {
			var read = this._prog[this._pc++];
			value = (value << 7) | (read & 0x7F);
		}
		return value;

	}

	calculateCurrentTime() {
		return this._player.baseAudioTime + this._ticksToMs(this.wait - this._player.remainder) / 1000;
	}

	_read16() {
		var value = this._prog[this._pc++];
		value |= this._prog[this._pc++] << 8;
		return value;
	}

	_reads16() {
		var value = this._read16();
		if (value & 0x8000) value -= 0x10000;
		return value;
	}

	_read8() {
		return this._prog[this._pc++];
	}

	_readSpecial(last: number) {
		if (last < 0x80 || (last >= 0xB0 && last < 0xBD)) return this._prog[this._pc++];
		else return 0;
	}

	_read24() {
		var value = this._prog[this._pc++];
		value |= this._prog[this._pc++] << 8;
		value |= this._prog[this._pc++] << 16;
		return value;
	}

	_forcableValueFunc(special: boolean, func: { (): number; (): any; }) {
		if (this._force) return special ? this._forceSpecial : this._forceValue;
		else return func();
	}

	_forcableValue(special?: boolean) {
		if (this._force) return special ? this._forceSpecial : this._forceValue;
		else return this._prog[this._pc++];
	}

	_setPan(value: number) {
		this.pan = value;
		if (value > 0) {
			this._gainR.gain.value = parseFloat("1");
			this._gainL.gain.value = parseFloat(`${1 - value}`);
		} else {
			this._gainR.gain.value = parseFloat(`${1 + value}`);
			this._gainL.gain.value = parseFloat("1");
		}
	}

	_noteToFreq(n: number) {
		return Math.pow(2, (n - 49) / 12) * 440;
	}
}