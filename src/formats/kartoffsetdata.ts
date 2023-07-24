//
// kartoffsetdata.js
//--------------------
// Provides functionality to read mario kart ds kart wheel and character model offsets.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
//

import { MKSUtils } from "./utils";


type kartoffsetdata_kart = {
	name: string;
	frontTireSize: number;
	wheels: vec3[];
	chars: vec3[];
}

export class kartoffsetdata implements MKJSDataFormator {
	input: MKJSDataInput;
	karts: kartoffsetdata_kart[];

	constructor(input: MKJSDataInput) {
		this.input = input;
		if (this.input != null) {
			this.load(this.input);
		}

	}

	load(input: MKJSDataInput) {
		var view = new DataView(input);
		var off = 0;
		var karts = []
		for (var i = 0; i < 37; i++) {
			const name = this.readString(view, off, 0x10);
			off += 0x10;
			const frontTireSize = view.getInt32(off, true) / 4096;
			off += 4;

			var wheels = [];
			for (var j = 0; j < 4; j++) {
				var pos = vec3.create();
				pos[0] = view.getInt32(off, true) / 4096;
				pos[1] = view.getInt32(off + 4, true) / 4096;
				pos[2] = view.getInt32(off + 8, true) / 4096;
				off += 12;
				wheels.push(pos);
			}

			var chars = [];
			for (var j = 0; j < 13; j++) {
				var pos = vec3.create();
				pos[0] = view.getInt32(off, true) / 4096;
				pos[1] = view.getInt32(off + 4, true) / 4096;
				pos[2] = view.getInt32(off + 8, true) / 4096;
				off += 12;
				chars.push(pos);
			}

			wheels = wheels;
			chars = chars;

			karts.push({
				name,
				frontTireSize,
				wheels,
				chars
			});
		}
		this.karts = karts;
	}

	readString(view: DataView, offset: number, length: number) {
		var str = "";
		for (var i = 0; i < length; i++) {
			var b = view.getUint8(offset++);
			if (b != 0) str += MKSUtils.asciiFromCharCode(b);
		}
		return str;
	}
}