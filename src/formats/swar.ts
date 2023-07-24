//
// swar.js
//--------------------
// Reads swar files.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
//

import { swav } from "./swav";
import { MKSUtils } from "./utils";

export class swar implements MKJSDataFormator {
	input: MKJSDataInput;
	samples: swav[];
	constructor(input: MKJSDataInput) {
		this.input = input;
		if (this.input != null) {
			this.load(this.input);
		}
	}

	load(input: MKJSDataInput) {
		var view = new DataView(input);
		var offset = 0;

		var stamp = MKSUtils.asciireadChar(view, 0x0) + MKSUtils.asciireadChar(view, 0x1) + MKSUtils.asciireadChar(view, 0x2) + MKSUtils.asciireadChar(view, 0x3);
		if (stamp != "SWAR") throw "SWAR invalid. Expected SWAR, found " + stamp;
		offset += 16; //skip magic number, size and number of blocks
		var data = MKSUtils.asciireadChar(view, offset) + MKSUtils.asciireadChar(view, offset + 1) + MKSUtils.asciireadChar(view, offset + 2) + MKSUtils.asciireadChar(view, offset + 3);
		if (data != "DATA") throw "SWAV invalid, expected DATA, found " + data;
		offset += 40; //skip reserved 0s and size

		var nSamples = view.getUint32(offset, true);
		offset += 4;

		this.samples = [];
		for (var i = 0; i < nSamples; i++) {
			const dv = new DataView(input, view.getUint32(offset, true));
			this.samples.push(new swav(dv, false, true));
			offset += 4;
		}
	}
}