//
// sseq.js
//--------------------
// Reads sseq files.
// by RHY3756547
//

import { MKSUtils } from "./utils";

export class sseq implements MKJSDataFormator {
	input: MKJSDataInput;
	data: Uint8Array;

	constructor(input: MKJSDataInput) {
		this.input = input;
		this.data = undefined;
		if (this.input != null) {
			this.load(this.input);
		}
	}

	load(input: MKJSDataInput) {
		var view = new DataView(input);
		var offset = 0;

		var stamp = MKSUtils.asciireadChar(view, 0x0) + MKSUtils.asciireadChar(view, 0x1) + MKSUtils.asciireadChar(view, 0x2) + MKSUtils.asciireadChar(view, 0x3);
		if (stamp != "SSEQ") throw "SSEQ invalid. Expected SSEQ, found " + stamp;
		offset += 16;
		var data = MKSUtils.asciireadChar(view, offset) + MKSUtils.asciireadChar(view, offset + 1) + MKSUtils.asciireadChar(view, offset + 2) + MKSUtils.asciireadChar(view, offset + 3);
		if (data != "DATA") throw "SWAV invalid, expected DATA, found " + data;
		offset += 8;

		this.data = new Uint8Array(input.slice(view.getUint32(offset, true)));
	}
}