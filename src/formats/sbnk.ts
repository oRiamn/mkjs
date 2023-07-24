//
// sbnk.js
//--------------------
// Reads sbnk files.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
//

import { MKSUtils } from "./utils";

type sbnk_param = {
	swav: number;
	swar: number;
	note: number;
	freq: number;
	attack: number;
	decay: number;
	sustainLvl: number;
	release: number;
	pan: number;
}

type sbnk_param_record0 = {
	type: 0
}


type sbnk_param_record1 = sbnk_param & {
	type: 1;
}

type sbnk_param_record2 = {
	type: 2;
	lower: number;
	upper: number;
	entries: sbnk_param[];
}

type sbnk_param_record3 = {
	type: 3,
	regions: number[],
	entries: sbnk_param[],
}


export type sbnk_instrument = sbnk_param_record0 | sbnk_param_record1 |  sbnk_param_record2 | sbnk_param_record3;

export class sbnk implements MKJSDataFormator {
	input: MKJSDataInput;
	dataOff: number;
	instruments: sbnk_instrument[];
	constructor(input: MKJSDataInput) {
		this.input = input;
		if (this.input != null) {
			this.load(this.input);
		}
	}

	load(input: MKJSDataInput): void {
		var view = new DataView(input);
		var offset = 0;

		var stamp = MKSUtils.asciireadChar(view, 0x0) + MKSUtils.asciireadChar(view, 0x1) + MKSUtils.asciireadChar(view, 0x2) + MKSUtils.asciireadChar(view, 0x3);
		if (stamp != "SBNK") throw "SWAV invalid. Expected SWAV, found " + stamp;
		offset += 16;
		var data = MKSUtils.asciireadChar(view, offset) + MKSUtils.asciireadChar(view, offset + 1) + MKSUtils.asciireadChar(view, offset + 2) + MKSUtils.asciireadChar(view, offset + 3);
		if (data != "DATA") throw "SWAV invalid, expected DATA, found " + data;
		offset += 8;

		offset += 32; //skip reserved

		var numInst = view.getUint32(offset, true);
		this.instruments = [];
		offset += 4;
		for (var i = 0; i < numInst; i++) {
			var fRecord = view.getUint8(offset);
			var nOffset = view.getUint16(offset + 1, true);

			if (fRecord == 0) {
				this.instruments.push({ type: 0 });
			} else if (fRecord < 16) { //note/wave definition
				this.instruments.push({
					type: 1,
					...this._readParams(view, nOffset)
				});
			} else if (fRecord == 16) {
				const lower = view.getUint8(nOffset++);
				const upper = view.getUint8(nOffset++);
				const entries = []
				var notes = (upper - lower) + 1;
				for (var j = 0; j < notes; j++) {
					entries.push(this._readParams(view, nOffset + 2));
					nOffset += 12;
				}
				this.instruments.push({
					type: 2,
					lower,
					upper,
					entries
				});
			} else if (fRecord == 17) {
				const regions: number[] = [];
				for (var j = 0; j < 8; j++) {
					var dat = view.getUint8(nOffset + j);
					if (dat != 0) regions.push(dat);
					else break;
				}
				const entries: sbnk_param[] = [];
				nOffset += 8;
				for (var j = 0; j < regions.length; j++) {
					entries.push(this._readParams(view, nOffset + 2));
					nOffset += 12;
				}
				this.instruments.push({
					type: 3,
					regions,
					entries,
				});
			}

			offset += 4;
		}
	}

	_readParams(view: DataView, off: number): sbnk_param {
		const swav = view.getUint16(off, true);
		const swar = view.getUint16(off + 2, true);
		const note = view.getUint8(off + 4);
		const freq = this._noteToFreq(note);
		const attack = view.getUint8(off + 5);
		const decay = view.getUint8(off + 6);
		const sustainLvl = view.getUint8(off + 7);
		const release = view.getUint8(off + 8);
		const pan = view.getUint8(off + 9);
		return {
			swav,
			swar,
			note,
			freq,
			attack,
			decay,
			sustainLvl,
			release,
			pan,
		};
	}

	_noteToFreq(n: number): number {
		return Math.pow(2, (n - 49) / 12) * 440;
	}
}