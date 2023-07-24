//
// nsbta.js
//--------------------
// Reads NSBTA files (texture uv animation via uv transform matrices within a polygon) for use in combination with an NSBMD (model) file
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
// /formats/nitro.js
//

import { nitro, nitro_nitroInfos } from "./nitro";
import { MKSUtils } from "./utils";

// man oh man if only there were some documentation on this that weren't shoddily written code in mkds course modifier
// well i guess we can find out how the format works
// together :')

export type nsbta_data_obj = {
	flags: number[];
	frames: number[];
	scaleS: number[];
	scaleT: number[];
	rotation: number[];
	translateS: number[];
	translateT: number[];
	frameStep: {
		scaleS: number,
		scaleT: number,
		rotation: number,
		translateS: number,
		translateT: number,
	};
	nextoff: number;
}

type nsbta_anim_data = {
	data: nitro_nitroInfos<nsbta_data_obj>;
	nextoff: number;
}


export class nsbta implements MKJSDataFormator {
	input: MKJSDataInput;
	mainOff: number;
	animData: nitro_nitroInfos<nsbta_anim_data>;
	constructor(input: MKJSDataInput) {
		this.input = input;
		this.mainOff = undefined;
		this.animData = undefined;

		if (this.input != null) {
			this.load(this.input);
		}
	}

	load(input: MKJSDataInput) {
		var view = new DataView(input);
		var header = null;
		var offset = 0;
		var tex;

		//nitro 3d header
		header = nitro.readHeader(view);
		if (header.stamp != "BTA0") throw "NSBTA invalid. Expected BTA0, found " + header.stamp;
		if (header.numSections > 1) throw "NSBTA invalid. Too many sections - should have 1 maximum.";
		offset = header.sectionOffsets[0];
		//end nitro

		this.mainOff = offset;

		var stamp = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);
		if (stamp != "SRT0") throw "NSBTA invalid. Expected SRT0, found " + stamp;

		this.animData = nitro.read3dInfo(view, this.mainOff + 8, (...args) => this._animInfoHandler(args[0], args[1]));
	}

	_animInfoHandler(view: DataView, offset: number): nsbta_anim_data {
		var animOff = view.getUint32(offset, true);
		var off = this.mainOff + animOff;
		var obj = this._readAnimData(view, off);
		obj.nextoff = offset + 4;
		return obj;
	}

	_readAnimData(view: DataView, offset: number): nsbta_anim_data {
		var stamp = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3); //should be M_AT, where _ is a 0 character
		var unknown1 = view.getUint16(offset + 4, true);
		var unknown2 = view.getUint8(offset + 6);
		var unknown3 = view.getUint8(offset + 7);
		var data = nitro.read3dInfo(view, offset + 8, (...args) => this._matInfoHandler(args[0], args[1], args[2]));
		return { data: data, nextoff: data.nextoff };
	}

	_matInfoHandler(view: DataView, offset: number, base: number): nsbta_data_obj {
		// there doesn't seem to be any documentation on this so I'm going to take the first step and maybe explain a few things here:
		// each material has 5 sets of 16 bit values of the following type:
		//
		// frames: determines the number of frames worth of transforms of this type are stored
		// flags: if >4096 then multiple frames are used instead of inline data. not much else is known
		// offset/data: depending on previous flag, either points to an array of data or provides the data for the sole frame. relative to base of this 3dinfoobject
		// data2: used for rotation matrix (second value)
		//
		// order is as follows:
		// scaleS, scaleT, rotation, translateS, translateT (all values are signed fixed point 1.3.12)
		//
		// note: rotation external data has two 16 bit integers instead of one per frame.
		//
		// also!! rotation matrices work as follows:
		//
		// | B   A |
		// | -A   B |
		//
		// kind of like nsbmd pivot


		const flags = []; //for debug
		const frames = [];
		const frameStep: { [x: string]: number } = {
			scaleS: undefined,
			scaleT: undefined,
			rotation: undefined,
			translateS: undefined,
			translateT: undefined,
		};
		const obj: { [x: string]: number[] } = {
			scaleS: [],
			scaleT: [],
			rotation: [],
			translateS: [],
			translateT: [],
		};

		let i = 0;
		for (const p in frameStep) {
			var cframes = view.getUint16(offset, true);
			var cflags = view.getUint16(offset + 2, true);
			var cvalue = view.getUint16(offset + 4, true);
			var cdata2 = view.getInt16(offset + 6, true) / 4096;

			//flags research so far:
			//bit 13 (8196) - set if inline single frame data, unset if multiple frame data at offset
			//bit 14-15 - framestep, aka what to shift frame counters by (eg for half framerate this would be 1, frame>>1, essentially dividing the frame speed by 2.)

			frameStep[p] = (cflags >> 14);
			flags[i] = cflags;
			frames[i] = cframes;

			if (cflags & 8192) {
				if (cvalue & 32768) {
					cvalue = 65536 - cvalue; //convert to int
				}
				obj[p].push(cvalue / 4096);
				if (i == 2) {
					obj[p].push(cdata2);
				}
			} else { //data is found at offset
				cframes = cframes >> frameStep[p];
				if (frameStep[p] > 0) {
					cframes++; //one extra frame, for interpolation
				}
				//frames -= 1;
				var off = base + cvalue - 8;
				const t = cframes * ((i == 2) ? 2 : 1)
				for (var j = 0; j < t; j++) {
					var prevvalue = view.getInt16(off - 2, true) / 4096;
					//debugger;
					obj[p].push(view.getInt16(off, true) / 4096);
					off += 2;
				}
			}

			offset += 8;
			i++;
		}
		return {
			flags,
			frames,
			scaleS: obj.scaleS,
			scaleT: obj.scaleT,
			rotation: obj.rotation,
			translateS: obj.translateS,
			translateT: obj.translateT,
			frameStep: {
				scaleS: frameStep.scaleS,
				scaleT: frameStep.scaleT,
				rotation: frameStep.rotation,
				translateS: frameStep.translateS,
				translateT: frameStep.translateT,
			},
			nextoff: offset
		};
	}
}