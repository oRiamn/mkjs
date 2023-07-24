//
// sdat.js
//--------------------
// Reads sdat archives.
// Right now this just loads literally every resource in the sdat since in js there is no such thing as half loading a 
// file from local storage, so why not just load it once and store in a usable format.
//
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
//

import { sbnk } from "./sbnk";
import { ssar } from "./ssar";
import { sseq } from "./sseq";
import { swar } from "./swar";
import { MKSUtils } from "./utils";


export type sdat_section_0 = {
	fileID: number,
	seq: sseq,
	pc: number,
	unknown: number,
	bank: number,
	vol: number,
	cpr: number,
	ppr: number,
	ply: number,
	nextOff: number,
}

type sdat_section_1 = {
	fileID: number,
	arc: ssar,
	unknown: number,
	nextOff: number,
}

type sdat_section_2 = {
	fileID: number,
	unknown: number,
	bank: sbnk,
	waveArcs: number[],
	nextOff: number
}

type sdat_section_3 = {
	fileID: number,
	arc: swar,
	unknown: number,
	nextOff: number,
}

type sdat_section_4 = undefined;

type sdat_section_5 = undefined;

type sdat_section_6 = undefined;

type sdat_section_7 = {
	fileID: number,
	unknown: number,
	vol: number,
	pri: number,
	ply: number,
	nextOff: number,
}


export type sdat_section = sdat_section_0 | sdat_section_1 | sdat_section_2 | sdat_section_3 | sdat_section_4 | sdat_section_5 | sdat_section_6 | sdat_section_7;


type sdat_fat = {
	off: number
	size: number
}

export class sdat implements MKJSDataFormator {
	input: MKJSDataInput;
	sections: {
		"$FAT ": sdat_fat[],
		"$INFO": [
			sdat_section_0[],
			sdat_section_1[],
			sdat_section_2[],
			sdat_section_3[],
			sdat_section_4[],
			sdat_section_5[],
			sdat_section_6[],
			sdat_section_7[]
		],
		"$FILE": undefined
	};
	recordInfoFunc: any;
	buffer: any;

	sectionFunc: {
		[x: string]: (view: DataView, off: number) => any;
	};

	constructor(input: MKJSDataInput) {
		this.input = input;
		this.sections = {
			"$FAT ": undefined,
			"$INFO": undefined,
			"$FILE": undefined,
		};

		this.sectionFunc = {}

		this.sectionFunc["$INFO"] = (view, off): sdat_section[][] => {
			var obj: sdat_section[][] = [];
			for (var i = 0; i < 8; i++) {
				var relOff = off + view.getUint32(off + i * 4, true) - 8;
				var count = view.getUint32(relOff, true);
				obj[i] = [];
				relOff += 4;
				var last: sdat_section = null;
				for (var j = 0; j < count; j++) {
					var infoOff = view.getUint32(relOff, true);
					//WRONG
					last = this.recordInfoFunc[i](view, off + infoOff - 8);//(infoOff == 0 && last != null)?last.nextOff:(off+infoOff-8));
					obj[i][j] = last;
					relOff += 4;
				}
			}
			return obj;
		}

		this.sectionFunc["$FAT "] = (view: DataView, off: number): sdat_fat[] => {
			var a = [];
			var count = view.getUint32(off, true);
			off += 4;
			for (var i = 0; i < count; i++) {
				a.push({
					off: view.getUint32(off, true),
					size: view.getUint32(off + 4, true)
				});
				off += 16;
			}
			return a;
		}

		this.sectionFunc["$FILE"] = (view: DataView, off: number) => {
			// console.log("file");
		}

		this.recordInfoFunc = []

		this.recordInfoFunc[0] = (view: DataView, off: number): sdat_section_0 => {
			const fileID = view.getUint16(off, true);
			const seq = new sseq(this._getFile(fileID));
			const pc = 0;
			const unknown = view.getUint16(off + 2, true);
			const bank = view.getUint16(off + 4, true);
			const vol = view.getUint8(off + 6);
			const cpr = view.getUint8(off + 7);
			const ppr = view.getUint8(off + 8);
			const ply = view.getUint8(off + 9);
			const nextOff = off + 10;
			return {
				fileID,
				seq,
				pc,
				unknown,
				bank,
				vol,
				cpr,
				ppr,
				ply,
				nextOff,
			};
		}
		this.recordInfoFunc[1] = (view: DataView, off: number): sdat_section_1 => {
			const fileID = view.getUint16(off, true);
			const arc = new ssar(this._getFile(fileID));
			const unknown = view.getUint16(off + 2, true);
			const nextOff = off + 4;
			return {
				fileID,
				arc,
				unknown,
				nextOff,
			};
		}
		this.recordInfoFunc[2] = (view: DataView, off: number): sdat_section_2 => {
			const fileID = view.getUint16(off, true);
			const unknown = view.getUint16(off + 2, true);
			const bank = new sbnk(this._getFile(fileID));
			const waveArcs = [];
			off += 4;
			for (var i = 0; i < 4; i++) {
				waveArcs[i] = view.getUint16(off, true);
				off += 2;
			}
			const nextOff = off;
			return {
				fileID,
				unknown,
				bank,
				waveArcs,
				nextOff
			};
		}
		this.recordInfoFunc[3] = (view: DataView, off: number): sdat_section_3 => {
			const fileID = view.getUint16(off, true);
			const unknown = view.getUint16(off + 2, true);
			const arc = new swar(this._getFile(fileID));
			const nextOff = off + 4;
			return {
				fileID,
				unknown,
				arc,
				nextOff,
			};
		}

		this.recordInfoFunc[4] = (view: DataView, off: number) => { }
		this.recordInfoFunc[5] = (view: DataView, off: number) => { }
		this.recordInfoFunc[6] = (view: DataView, off: number) => { }

		this.recordInfoFunc[7] = (view: DataView, off: number): sdat_section_7 => {
			const fileID = view.getUint16(off, true);
			const unknown = view.getUint16(off + 2, true);
			const vol = view.getUint8(off + 4);
			const pri = view.getUint8(off + 5);
			const ply = view.getUint8(off + 6);
			const nextOff = off + 7;
			return {
				fileID,
				unknown,
				vol,
				pri,
				ply,
				nextOff,
			};
		}


		if (this.input != null) {
			this.load(this.input);
		}

	}


	load(input: MKJSDataInput) {
		this.buffer = input;
		var view = new DataView(input);
		var header = null;
		var offset = 0;

		var stamp = MKSUtils.asciireadChar(view, 0x0) + MKSUtils.asciireadChar(view, 0x1) + MKSUtils.asciireadChar(view, 0x2) + MKSUtils.asciireadChar(view, 0x3);
		if (stamp != "SDAT") throw "SDAT invalid. Expected SDAT, found " + stamp;

		var unknown1 = view.getUint32(0x4, true);
		var filesize = view.getUint32(0x8, true);
		var headsize = view.getUint16(0xC, true);
		var numSections = view.getUint16(0xE, true);
		var sectionOffsets = [];
		var sectionSizes = [];
		for (var i = 3; i > -1; i--) { //reverse order so we can process files into js objects
			var off = (view.getUint32(0x10 + i * 8, true));
			var size = (view.getUint32(0x14 + i * 8, true));
			if (size != 0) this._readSection(view, off);
		}
	}

	_readSection(view: DataView, off: number) {
		var stamp = "$" + MKSUtils.asciireadChar(view, off) + MKSUtils.asciireadChar(view, off + 1) + MKSUtils.asciireadChar(view, off + 2) + MKSUtils.asciireadChar(view, off + 3);
		if (this.sectionFunc[stamp] != null) {
			const k = stamp as keyof typeof this.sections
			this.sections[k] = this.sectionFunc[stamp](view, off + 8);
		}
		else console.error("Invalid section in SDAT! No handler for section type " + stamp.substr(1, 4));
	}

	_getFile(fid: number) {
		var file = this.sections["$FAT "][fid];
		if (file != null) {
			return this.buffer.slice(file.off, file.off + file.size);
		}
	}
}