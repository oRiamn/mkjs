//
// kartoffsetdata.js
//--------------------
// Provides functionality to read mario kart ds kart wheel and character model offsets.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
//

import { MKSUtils } from "./utils";

export type kartoffsetdata_tire_name = "kart_tire_L" | "kart_tire_M" | "kart_tire_S";

export type kartoffsetdata_kart = {
	name: kartoffsetdata_tire_name;
	frontTireSize: number;
	wheels: vec3[];
	chars: vec3[];
};

export class kartoffsetdata implements MKJSDataFormator {
	input: MKJSDataInput;
	karts!: kartoffsetdata_kart[];

	constructor(input: MKJSDataInput) {
		this.input = input;
		if (this.input != null) {
			this.load(this.input);
		}
	}

	load(input: MKJSDataInput) {
		input = MKSUtils.prepareInput(input);
		const view = new DataView(input);
		let off = 0;
		const karts: kartoffsetdata_kart[] = [];
		for (let i = 0; i < 37; i++) {
			const name = this.readString(view, off, 0x10);
			off += 0x10;
			const frontTireSize = view.getInt32(off, true) / 4096;
			off += 4;

			const wheels = [];
			for (let j = 0; j < 4; j++) {
				const pos = vec3.create();
				pos[0] = view.getInt32(off, true) / 4096;
				pos[1] = view.getInt32(off + 4, true) / 4096;
				pos[2] = view.getInt32(off + 8, true) / 4096;
				off += 12;
				wheels.push(pos);
			}

			const chars = [];
			for (let j = 0; j < 13; j++) {
				const pos = vec3.create();
				pos[0] = view.getInt32(off, true) / 4096;
				pos[1] = view.getInt32(off + 4, true) / 4096;
				pos[2] = view.getInt32(off + 8, true) / 4096;
				off += 12;
				chars.push(pos);
			}

			karts.push({
				name: name as kartoffsetdata_tire_name,
				frontTireSize,
				wheels,
				chars,
			});
		}
		this.karts = karts;
	}

	private readString(view: DataView, offset: number, length: number) {
		let str = "";
		for (let i = 0; i < length; i++) {
			const b = view.getUint8(offset++);
			if (b != 0) str += MKSUtils.asciiFromCharCode(b);
		}
		return str;
	}
}
