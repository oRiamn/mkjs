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
	fileID: number;
	seq: sseq;
	pc: number;
	unknown: number;
	bank: number;
	vol: number;
	cpr: number;
	ppr: number;
	ply: number;
	nextOff: number;
};

type sdat_section_1 = {
	fileID: number;
	arc: ssar;
	unknown: number;
	nextOff: number;
};

type sdat_section_2 = {
	fileID: number;
	unknown: number;
	bank: sbnk;
	waveArcs: number[];
	nextOff: number;
};

type sdat_section_3 = {
	fileID: number;
	arc: swar;
	unknown: number;
	nextOff: number;
};

type sdat_section_4 = undefined;

type sdat_section_5 = undefined;

type sdat_section_6 = undefined;

type sdat_section_7 = {
	fileID: number;
	unknown: number;
	vol: number;
	pri: number;
	ply: number;
	nextOff: number;
};

export type sdat_section =
	| sdat_section_0
	| sdat_section_1
	| sdat_section_2
	| sdat_section_3
	| sdat_section_4
	| sdat_section_5
	| sdat_section_6
	| sdat_section_7;

type sdat_fat = {
	off: number;
	size: number;
};

type sdat_sections = {
	"$FAT ": sdat_fat[];
	$INFO: [
		sdat_section_0[],
		sdat_section_1[],
		sdat_section_2[],
		sdat_section_3[],
		sdat_section_4[],
		sdat_section_5[],
		sdat_section_6[],
		sdat_section_7[],
	];
	$FILE: undefined;
};

type sdat_section_data = sdat_sections[keyof sdat_sections];
type sdat_section_func = (view: DataView, off: number) => sdat_section_data;
type sdat_record_info_func = (view: DataView, off: number) => sdat_section;

export class sdat implements MKJSDataFormator {
	input: MKJSDataInput;
	sections: sdat_sections;
	recordInfoFunc: sdat_record_info_func[];
	buffer!: MKJSDataInput;

	sectionFunc: {
		[x: string]: sdat_section_func | undefined;
	};

	constructor(input: MKJSDataInput) {
		this.input = input;
		this.sections = {
			"$FAT ": undefined!,
			$INFO: undefined!,
			$FILE: undefined!,
		};

		this.sectionFunc = {};

		this.sectionFunc["$INFO"] = (view, off): sdat_sections["$INFO"] => {
			let obj: sdat_section[][] = [];
			for (let i = 0; i < 8; i++) {
				let relOff = off + view.getUint32(off + i * 4, true) - 8;
				let count = view.getUint32(relOff, true);
				obj[i] = [];
				relOff += 4;
				let last: sdat_section;
				for (let j = 0; j < count; j++) {
					let infoOff = view.getUint32(relOff, true);
					//WRONG
					last = this.recordInfoFunc[i](view, off + infoOff - 8); //(infoOff == 0 && last != null)?last.nextOff:(off+infoOff-8));
					obj[i][j] = last;
					relOff += 4;
				}
			}
			return obj as sdat_sections["$INFO"];
		};

		this.sectionFunc["$FAT "] = (view: DataView, off: number): sdat_fat[] => {
			let a = [];
			let count = view.getUint32(off, true);
			off += 4;
			for (let i = 0; i < count; i++) {
				a.push({
					off: view.getUint32(off, true),
					size: view.getUint32(off + 4, true),
				});
				off += 16;
			}
			return a;
		};

		this.sectionFunc["$FILE"] = (_view: DataView, _off: number) => {
			// console.log("file");
			return undefined;
		};

		this.recordInfoFunc = [];

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
		};
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
		};
		this.recordInfoFunc[2] = (view: DataView, off: number): sdat_section_2 => {
			const fileID = view.getUint16(off, true);
			const unknown = view.getUint16(off + 2, true);
			const bank = new sbnk(this._getFile(fileID));
			const waveArcs = [];
			off += 4;
			for (let i = 0; i < 4; i++) {
				waveArcs[i] = view.getUint16(off, true);
				off += 2;
			}
			const nextOff = off;
			return {
				fileID,
				unknown,
				bank,
				waveArcs,
				nextOff,
			};
		};
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
		};

		this.recordInfoFunc[4] = (_view: DataView, _off: number) => undefined;
		this.recordInfoFunc[5] = (_view: DataView, _off: number) => undefined;
		this.recordInfoFunc[6] = (_view: DataView, _off: number) => undefined;

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
		};

		if (this.input != null) {
			this.load(this.input);
		}
	}

	load(input: MKJSDataInput) {
		input = MKSUtils.prepareInput(input);
		this.buffer = input;
		const view = new DataView(input);

		let stamp =
			MKSUtils.asciireadChar(view, 0x0) +
			MKSUtils.asciireadChar(view, 0x1) +
			MKSUtils.asciireadChar(view, 0x2) +
			MKSUtils.asciireadChar(view, 0x3);
		if (stamp != "SDAT") throw `SDAT invalid. Expected SDAT, found ${stamp}`;

		view.getUint32(0x4, true);
		view.getUint32(0x8, true);
		view.getUint16(0xc, true);
		view.getUint16(0xe, true);
		for (let i = 3; i > -1; i--) {
			//reverse order so we can process files into js objects
			let off = view.getUint32(0x10 + i * 8, true);
			let size = view.getUint32(0x14 + i * 8, true);
			if (size != 0) this._readSection(view, off);
		}
	}

	private _readSection(view: DataView, off: number) {
		let stamp = `$${MKSUtils.asciireadChar(view, off)}${MKSUtils.asciireadChar(view, off + 1)}${MKSUtils.asciireadChar(view, off + 2)}${MKSUtils.asciireadChar(view, off + 3)}`;
		const sectionHandler = this.sectionFunc[stamp];
		if (sectionHandler != null) {
			const section = sectionHandler(view, off + 8);
			switch (stamp) {
				case "$FAT ":
					this.sections["$FAT "] = section as sdat_sections["$FAT "];
					break;
				case "$INFO":
					this.sections["$INFO"] = section as sdat_sections["$INFO"];
					break;
				case "$FILE":
					this.sections["$FILE"] = section as sdat_sections["$FILE"];
					break;
			}
		} else console.error(`Invalid section in SDAT! No handler for section type ${stamp.substr(1, 4)}`);
	}

	private _getFile(fid: number): ArrayBuffer {
		let file = this.sections["$FAT "][fid];
		if (file == null) throw new Error(`SDAT file ID invalid: ${fid}`);
		return (this.buffer as ArrayBuffer).slice(file.off, file.off + file.size);
	}
}
