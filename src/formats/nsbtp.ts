//
// nsbtp.js
//--------------------
// Reads NSBTP files (texture info animation) for use in combination with an NSBMD (model) file
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
// /formats/nitro.js
//

import { nitro, nitro_nitroInfos } from "./nitro";
import { MKSUtils } from "./utils";


export type nsbtp_animadata_data_frame = {
	time: number;
	texName: string;
	palName: string;
}

export type nsbtp_animadata_data = {
	frames: nsbtp_animadata_data_frame[];
	flags: number;
	nextoff: number;
}
type nsbtp_animadata = {
	data: nitro_nitroInfos<nsbtp_animadata_data>,
	nextoff: number,
	texTotal: number,
	palTotal: number,
	duration: number,
	texNames: string[],
	palNames: string[]
};


export class nsbtp implements MKJSDataFormator {
	input: MKJSDataInput;
	mainOff: number;
	matOff: number;
	animData: nitro_nitroInfos<nsbtp_animadata>;
	prop: string[];
	texTotal: number;
	palTotal: number;
	texNamesOff: number;
	palNamesOff: number;
	texNames: string[];
	palNames: string[];

	constructor(input: MKJSDataInput) {

		this.input = input;

		this.mainOff = undefined;
		this.matOff = undefined;
		this.animData = undefined;

		//anim data structure:
		// {
		//     objectData: [
		//         {
		//             obj: { }
		//         }
		//	   ]
		// }

		this.prop = [
			"scaleS",
			"scaleT",
			"rotation",
			"translateS",
			"translateT"
		]

		if (this.input != null) {
			this.load(this.input);
		}

		this.texTotal = undefined;
		this.palTotal = undefined;
		this.texNamesOff = undefined;
		this.palNamesOff = undefined;

		this.texNames = undefined;
		this.palNames = undefined;
	}

	load(input: MKJSDataInput) {
		var view = new DataView(input);
		var header = null;
		var offset = 0;
		var tex;

		//nitro 3d header
		header = nitro.readHeader(view);
		if (header.stamp != "BTP0") throw "NSBTP invalid. Expected BTP0, found " + header.stamp;
		if (header.numSections > 1) throw "NSBTP invalid. Too many sections - should have 1 maximum.";
		offset = header.sectionOffsets[0];
		//end nitro

		this.mainOff = offset;

		var stamp = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);
		if (stamp != "PAT0") throw "NSBTP invalid. Expected PAT0, found " + stamp;

		this.animData = nitro.read3dInfo(view, this.mainOff + 8, (...args) => this._animInfoHandler(args[0], args[1]));
	}

	_animInfoHandler(view: DataView, offset: number): nsbtp_animadata {
		var animOff = view.getUint32(offset, true);

		var off = this.mainOff + animOff;
		var obj = this._readAnimData(view, off);
		obj.nextoff = offset + 4;

		return obj;
	}

	_readAnimData(view: DataView, offset: number): nsbtp_animadata {
		this.matOff = offset;
		var stamp = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3); //should be M_PT, where _ is a 0 character

		offset += 4;
		//b400 0303 4400 7400 - countdown (3..2..1.. then start is another model, duration 180 frames, 3 frames of anim)
		//1400 0404 4800 8800 - kuribo (4 frames, shorter animation duration)
		//1e00 0202 4000 6000 - pinball stage (2 frames)
		//0200 0202 4000 6000 - fish, cow and crab (duration and total 2 frames, unusually short animation)
		//0d00 0404 5000 9000 - bat (duration 13, 6 frames, uneven pacing)

		//16bit duration (60fps frames, total)
		//8bit tex start
		//8bit pal start
		//16bit unknown (flags? kuribo repeats by playing backwards)
		//16bit unknown

		//example data, for 3 mat 3 pal data
		//var tinfo = texInfoHandler(view, offset+4);
		//8 bytes here? looks like texinfo

		var duration = view.getUint16(offset, true);
		this.texTotal = view.getUint8(offset + 2);
		this.palTotal = view.getUint8(offset + 3);
		this.texNamesOff = view.getUint16(offset + 4, true);
		this.palNamesOff = view.getUint16(offset + 6, true);

		var nameOffset = this.matOff + this.texNamesOff;
		this.texNames = [];
		//read 16char tex names
		for (var i = 0; i < this.texTotal; i++) {
			var name = "";
			for (var j = 0; j < 16; j++) {
				name += MKSUtils.asciireadChar(view, nameOffset++)
			}
			this.texNames[i] = name;
		}

		nameOffset = this.matOff + this.palNamesOff;
		this.palNames = [];
		//read 16char pal names
		for (var i = 0; i < this.palTotal; i++) {
			var name = "";
			for (var j = 0; j < 16; j++) {
				name += MKSUtils.asciireadChar(view, nameOffset++)
			}
			this.palNames[i] = name;
		}

		//...then another nitro
		var data = nitro.read3dInfo(view, offset + 8, (...args) => this._matInfoHandler(args[0], args[1]));

		return {
			data: data,
			nextoff: data.nextoff,
			texTotal: this.texTotal,
			palTotal: this.palTotal,
			duration,
			texNames: this.texNames,
			palNames: this.palNames
		};
	}

	_matInfoHandler(view: DataView, offset: number): nsbtp_animadata_data {
		const frames = [];

		// in here...
		// 16bit frames
		// 16bit maybe material number (probably? mostly 0) to replace
		// 16bit unknown (flags? 0x4400 count, 0x1101 waluigi, 0x3303 goomba, 0x0010 fish)
		// 16bit offset from M_PT (always 0x38)

		//at offset (frame of these)
		// 16bit happenAt
		// 8bit tex
		// 8bit pal

		//then (frame of these)
		// 16char texname
		//then (frame of these)
		// 16char palname
		// texture animations are bound to the material via the name of this block.
		var nbframes = view.getUint32(offset, true);
		const flags = view.getUint16(offset + 4, true);
		var offset2 = view.getUint16(offset + 6, true);
		offset += 8;
		const nextoff = offset;

		offset = this.matOff + offset2;
		//info and timing for each frame
		for (var i = 0; i < nbframes; i++) {
			const tex = view.getUint8(offset + 2); //index into names?
			const pal = view.getUint8(offset + 3); //index into pal names?
			frames.push({
				time: view.getUint16(offset, true),
				texName: this.texNames[tex],
				palName: this.palNames[pal]
			});
			offset += 4;
		}
		return {
			frames,
			flags,
			nextoff,
		};
	}
}