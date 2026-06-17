//
// sseqPlayer.js
//--------------------
// Provides an interface for playing SSEQs onto an AudioContext.
// by RHY3756547
//

import { sbnk_instrument } from "../formats/sbnk";
import { sdat } from "../formats/sdat";
import { SsarSeqEntry } from "../formats/ssar";
import { SSEQWaveCache, SSEQWaveCache_wave } from "./SSEQWaveCache";
import { SSEQThread } from "./sseqThread";

type outputTarget = PannerNode | GainNode;
type SSEQPlayer_properties = {
	bpm: number;
	bpmMultiplier: number;
	transpose: number;
	volume: number;
};

export type SSEQPlayer_param = {
	bpm?: number;
	bpmMultiplier?: number;
	transpose?: number;
	volume?: number;
};

type SSEQNoteGain = GainNode & {
	ended?: boolean;
};

type SSEQBankEntry = sdat["sections"]["$INFO"][2][number];
type SBNKPlayableInstrument = Extract<sbnk_instrument, { type: 1 }> | Extract<sbnk_instrument, { type: 2 }>["entries"][number];

export type ThreadM = {
	ended: boolean;
	noteEndsAt: number;
	relTime: number;
	note: SSEQNoteGain;
	pitched: boolean;
	src: AudioBufferSourceNode;
	start: number;
	base: number;
	snd: SSEQWaveCache_wave;
};

//
export class SSEQPlayer {
	CYCLE_TIME: number;
	private _outputTarget: outputTarget;
	properties: SSEQPlayer_properties;
	ctx: AudioContext;
	private _sseqHead: SsarSeqEntry;
	private _sdat: sdat;
	lastNoteEnd: number;
	threads: SSEQThread[];
	trackAlloc: number;
	trackStarted: number;
	bank: SSEQBankEntry | null;
	vars: number[];
	dead: boolean;
	masterGain: GainNode;
	threadsToKill: number[];
	baseAudioTime: number;
	remainder: number;
	constructor(sseqHead: SsarSeqEntry, sdat: sdat, ctx: AudioContext, outputTarget: outputTarget, properties: SSEQPlayer_param | null) {
		//a virtual machine, super fun obviously
		//
		//player handles loaded sounds.

		this.CYCLE_TIME = 0.0052;

		this._outputTarget = outputTarget;

		this.properties = {
			bpm: 120,
			bpmMultiplier: 1,
			transpose: 0,
			volume: 1,
		};

		if (properties != null) {
			for (let p in properties) {
				if (properties.hasOwnProperty(p)) {
					const t = p as keyof SSEQPlayer_properties;
					const val = properties[t];
					if (val !== undefined) this.properties[t] = val;
				}
			}
		}

		this.ctx = ctx;
		this._sseqHead = sseqHead;
		this._sdat = sdat;
		this.lastNoteEnd = 0;

		this.threads = [];

		this.trackAlloc = 0;
		this.trackStarted = 0;

		this.bank = null;
		this.vars = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		this.dead = false;

		this.masterGain = this.ctx.createGain();
		// console.log(`seqvol: ${(sseqHead.vol) / 0x7F}`)
		this.masterGain.gain.value = parseFloat(`${(this._sseqHead.vol * this.properties.volume) / 0x7f}`);
		this.masterGain.connect(this._outputTarget != null ? this._outputTarget : this.ctx.destination);

		this.startThread(this._sseqHead.pc); //starts a thread with its initial pc pos
		this.loadBank(this._sseqHead.bank);

		this.threadsToKill = [];
		this.baseAudioTime = this.ctx.currentTime;

		const buffer = 0.02;
		this.remainder = 0;

		this.tick();
	}

	tick() {
		let time = (this.ctx.currentTime - this.baseAudioTime) * ((48 * this.properties.bpm) / 60) + this.remainder;
		this.remainder = time % 1;
		time = Math.floor(time);
		this.baseAudioTime = this.ctx.currentTime;

		for (let i = 0; i < this.threads.length; i++) {
			this.threads[i].tick(time);
		}

		while (this.threadsToKill.length > 0) {
			const threadIndex = this.threadsToKill.pop();
			if (threadIndex != null) this.threads.splice(threadIndex, 1);
		}

		if (this.threads.length == 0 && this.ctx.currentTime > this.lastNoteEnd) this.dead = true;
	}

	startThread(pc: number) {
		const thread = new SSEQThread(this._sseqHead.seq.data, pc, this);
		this.threads.push(thread);
	}

	terminateThread(thread: SSEQThread) {
		this.threadsToKill.push(this.threads.indexOf(thread));
	}

	setTempo(bpm: number) {
		//sets tempo of threads and alters their wait times to adjust
		this.properties.bpm = bpm * this.properties.bpmMultiplier;
	}

	loadBank(bn: number) {
		this.bank = this._sdat.sections["$INFO"][2][bn];
		if (this.bank != null) {
			for (let i = 0; i < 4; i++) {
				if (this.bank.waveArcs[i] != 0xffff) {
					SSEQWaveCache.cacheWaveArc(this.bank.waveArcs[i]);
				}
			}
		}
	}

	cutNoteShort(thread: SSEQThread, note: ThreadM) {
		try {
			//can throw exception if note has already ended.
			if (note.ended) return;
			const time = thread.calculateCurrentTime();
			const baseTime = time == Infinity ? this.ctx.currentTime : time;
			if (baseTime > note.noteEndsAt) return;
			const releaseTime = note.relTime;
			note.note.gain.cancelScheduledValues(baseTime);
			note.note.gain.linearRampToValueAtTime(0, baseTime + releaseTime); //then release
			note.src.stop(baseTime + releaseTime);
			if (baseTime + releaseTime > this.lastNoteEnd) this.lastNoteEnd = baseTime + releaseTime;
		} catch (e) {}
	}

	setTranspose(newT: number) {
		this.properties.transpose = newT;
		for (let i = 0; i < this.threads.length; i++) {
			const note = this.threads[i].lastNote;
			if (note != null) this.updateNoteFreq(this.threads[i], note);
		}
	}

	updateNoteFreq(thread: SSEQThread, note: ThreadM) {
		const noteOffsets =
			(note.pitched ? (thread.pitchBend / 0x7f) * thread.pitchBendRange : 0) + thread.transpose + this.properties.transpose;
		note.src.playbackRate.setValueAtTime(
			this._noteToFreq(note.start + noteOffsets) / note.base / note.snd.info.mul,
			this.ctx.currentTime
		);
	}

	kill() {
		//smoothly kills a sequence. If you want to instantly kill it, disconnect and then dereference it.
		this.lastNoteEnd = 0;
		for (let i = 0; i < this.threads.length; i++) {
			const note = this.threads[i].lastNote;
			if (note != null) this.cutNoteShort(this.threads[i], note);
			this.threads.splice(i--, 1);
		}
	}

	playNote(thread: SSEQThread, velocity: number, duration: number, num: number): ThreadM | null {
		// if (thread.wait < 0) // console.log(`warning - MIDI buffer overflowed! ${thread.wait}`);
		velocity /= 127;
		if (this.bank == null || this.bank.bank.instruments == null) return null;
		const rawInst = this.bank.bank.instruments[thread.program];
		if (rawInst == null) return null;
		const inst = this._getInst(rawInst, num);
		if (inst == null) {
			// debugger;
			return null;
		}

		const fireNote = true;
		let note: SSEQNoteGain;
		let source: AudioBufferSourceNode;
		let snd: SSEQWaveCache_wave;
		if (thread.tie && thread.lastNote != null) {
			note = thread.lastNote.note;
			source = thread.lastNote.src;
			snd = thread.lastNote.snd;
		} else {
			note = this.ctx.createGain();
			note.connect(thread.gain);
			snd = SSEQWaveCache.getWave(this.bank.waveArcs[inst.swar], inst.swav);
			source = this.ctx.createBufferSource();
			source.loop = snd.info.bLoop == 1;

			source.loopStart = snd.info.loopSTime;
			source.loopEnd = snd.buf.duration;

			source.buffer = snd.buf;
			source.connect(note);
		}

		const noteOffsets = thread.transpose + this.properties.transpose; // (thread.pitchBend/0x7F)*thread.pitchBendRange+

		const baseTime = thread.calculateCurrentTime();
		const realDur = thread.tie ? Infinity : this._ticksToMs(duration) / 1000;

		const targetFreq = this._noteToFreq(num + noteOffsets) / inst.freq / snd.info.mul;
		if (thread.portaKey & 0x80)
			source.playbackRate.value = targetFreq; //sound frequency may have been adjusted for the device to support it
		else {
			//handle porta
			//we need to calculate the sweep time then apply a linear transform to the playback rate to get there
			//when portaTime is 0 we use the length of the note
			const sweepPitch = thread.sweepPitch + (thread.portaKey - num) * (1 << 6);

			source.playbackRate.setValueAtTime(this._noteToFreq(thread.portaKey + noteOffsets) / inst.freq / snd.info.mul, baseTime);

			if (thread.portaTime == 0 && duration != Infinity)
				source.playbackRate.exponentialRampToValueAtTime(targetFreq, baseTime + this._ticksToMs(duration) / 1000);
			else {
				const timeS = thread.portaTime * thread.portaTime;
				const time = this._ticksToMs((Math.abs(sweepPitch) * timeS) >> 11) / 1000;
				source.playbackRate.exponentialRampToValueAtTime(targetFreq, baseTime + time);
			}
		}

		//sequence the note

		const atk = thread.attack != null ? thread.attack : inst.attack;
		const dec = thread.decay != null ? thread.decay : inst.decay;
		const sus = thread.sustain != null ? thread.sustain : inst.sustainLvl;
		const rel = thread.release != null ? thread.release : inst.release;

		const attackTime = this._calculateRequiredAttackCycles(this._convertAttToRate(atk)) * this.CYCLE_TIME; //(255/convertAttToRate(inst.attack))*0.016; //0.01;
		const decayTime = ((92544 / this._convertFallToRate(dec)) * (1 - sus / 0x7f) * this.CYCLE_TIME) / 2;
		const releaseTime = ((92544 / this._convertFallToRate(rel)) * (sus / 0x7f) * this.CYCLE_TIME) / 2;

		if (!thread.tie || thread.lastNote == null) {
			note.gain.value = 0.0;
			note.gain.setValueAtTime(0.0, baseTime); //initially 0
			note.gain.linearRampToValueAtTime(velocity, baseTime + attackTime); //attack
			note.gain.linearRampToValueAtTime((velocity * sus) / 0x7f, baseTime + attackTime + decayTime); //decay

			source.start(baseTime);

			source.onended = function () {
				note.ended = true;
				source.disconnect();
			};
		}

		if (realDur != Infinity) {
			if (baseTime + attackTime + decayTime < baseTime + realDur)
				note.gain.linearRampToValueAtTime((velocity * sus) / 0x7f, baseTime + realDur); //sustain until
			note.gain.linearRampToValueAtTime(0, baseTime + realDur + releaseTime); //then release
			source.stop(baseTime + realDur + releaseTime);

			if (baseTime + realDur + releaseTime > this.lastNoteEnd) this.lastNoteEnd = baseTime + realDur + releaseTime;
		}

		return {
			src: source,
			base: inst.freq,
			start: num,
			note: note,
			relTime: releaseTime,
			snd: snd,
			noteEndsAt: baseTime + realDur,
			ended: false,
			pitched: false,
		};
	}

	private _calculateRequiredAttackCycles(att: number) {
		let value = 92544;
		let ticks = 0;
		while (value > 0) {
			value = Math.floor((att * value) / 255);
			ticks++;
		}
		return ticks;
	}

	private _convertAttToRate(attack: number) {
		const table = [0x00, 0x01, 0x05, 0x0e, 0x1a, 0x26, 0x33, 0x3f, 0x49, 0x54, 0x5c, 0x64, 0x6d, 0x74, 0x7b, 0x7f, 0x84, 0x89, 0x8f];
		if (attack & 0x80) return 0;
		else if (attack >= 0x6f) return table[0x7f - attack];
		else return 0xff - attack;
	}

	private _convertFallToRate(fall: number) {
		if (fall & 0x80) return 0;
		else if (fall == 0x7f) return 0xffff;
		else if (fall == 0x7e) return 0x3c00;
		else if (fall < 0x32) return ((fall << 1) + 1) & 0xffff;
		else return (0x1e00 / (0x7e - fall)) & 0xffff;
	}

	private _noteToFreq(n: number) {
		return Math.pow(2, (n - 49) / 12) * 440;
	}

	private _getInst(inst: sbnk_instrument, note: number): SBNKPlayableInstrument | null {
		switch (inst.type) {
			case 0:
				return null;
			case 1:
				return inst;
			case 2:
				return inst.entries[Math.max(inst.lower, Math.min(inst.upper, note)) - inst.lower];
			case 3:
				for (let i = 0; i < inst.regions.length; i++) {
					if (note <= inst.regions[i]) return inst.entries[i];
				}
				return null;
		}
	}

	private _ticksToMs(ticks: number) {
		return (ticks / 48) * (60000 / this.properties.bpm);
	}
}
