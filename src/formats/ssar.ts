//
// ssar.js
//--------------------
// Reads ssar files.
// by RHY3756547
//

import { MKSUtils } from "./utils";

export type SsarSeqEntry = {
    pc: number;
    seq: {
        data: Uint8Array;
    };
    bank: number;
    vol: number;
    cpr: number;
    ppr: number;
    ply: number;
}

export class ssar implements MKJSDataFormator {
	input: MKJSDataInput;
	dataOff: number;
	data: Uint8Array;
	entries: SsarSeqEntry[];
	constructor(input: MKJSDataInput) {
		this.input = input;
		this.dataOff = undefined;
		this.data = undefined;
		this.entries = undefined;

		if (this.input != null) {
			this.load(this.input);
		}
	}

	load(input: MKJSDataInput) {
		var view = new DataView(input);
		var offset = 0;

		var stamp = MKSUtils.asciireadChar(view, 0x0) + MKSUtils.asciireadChar(view, 0x1) + MKSUtils.asciireadChar(view, 0x2) + MKSUtils.asciireadChar(view, 0x3);
		if (stamp != "SSAR") throw "SSAR invalid. Expected SSAR, found " + stamp;
		offset += 16;
		var data = MKSUtils.asciireadChar(view, offset) + MKSUtils.asciireadChar(view, offset + 1) + MKSUtils.asciireadChar(view, offset + 2) + MKSUtils.asciireadChar(view, offset + 3);
		if (data != "DATA") throw "SSAR invalid, expected DATA, found " + data;
		offset += 8;

		this.dataOff = view.getUint32(offset, true);
		this.data = new Uint8Array(view.buffer.slice(this.dataOff));
		var count = view.getUint32(offset + 4, true);
		this.entries = [];

		offset += 8;
		for (var i = 0; i < count; i++) {
			this.entries.push(this._readSeqEntry(view, offset));
			offset += 12;
		}
	}

	_readSeqEntry(view: DataView, off: number): SsarSeqEntry {
		const pc = view.getUint32(off, true);
		const seq = { data: this.data };
		const bank = view.getUint16(off + 4, true);
		const vol = view.getUint8(off + 6);
		const cpr = view.getUint8(off + 7);
		const ppr = view.getUint8(off + 8);
		const ply = view.getUint8(off + 9);

		return {
			pc,
			seq,
			bank,
			vol,
			cpr,
			ppr,
			ply,
		};
	}
}