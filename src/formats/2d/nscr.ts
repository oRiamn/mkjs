//
// nscr.js
//--------------------
// Loads nscr files and provides a variety of functions for accessing and using the data.
// Screen data for nitro 2d graphics. Each cell references a graphic (ncgr) and palette (nclr).
// by RHY3756547

import { nitro, nitro_nitroHeader } from "../nitro";
import { MKSUtils } from "../utils";
//
type SscrScrn = {
	type: string,
	blockSize: number,
	screenWidth: number,
	screenHeight: number,
	padding: number,
	screenDataSize: number,
	data: number[]
}
export class nscr implements MKJSDataFormator {
	input: MKJSDataInput;
	mainOff: number;
	sectionOffsets: nitro_nitroHeader['sectionOffsets'];
	scrn: SscrScrn;
	constructor(input: MKJSDataInput) {

		this.input = input;

		this.mainOff = undefined;
		if (this.input != null) {
			this.load(this.input);
		}
	}

	load(input: MKJSDataInput) {
		var view = new DataView(input);
		var offset = 0;

		//nitro 3d header
		const header = nitro.readHeader(view);
		if (header.stamp != "RCSN") throw "NSCR invalid. Expected RCSN, found " + header.stamp;
		if (header.numSections != 1) throw "NSCR invalid. Too many sections - should have 1.";
		offset = header.sectionOffsets[0];
		//end nitro
		this.sectionOffsets = header.sectionOffsets;
		this.sectionOffsets[0] = 0x18;

		this.mainOff = offset;

		this.scrn = this._loadSCRN(view);
	}

	_loadSCRN(view: DataView): SscrScrn {
		var offset = this.sectionOffsets[0] - 8;

		const type = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);
		if (type != "NRCS") throw "SCRN invalid. Expected NRCS, found " + type;
		const blockSize = view.getUint32(offset + 0x4, true);
		this.sectionOffsets[1] = this.sectionOffsets[0] + blockSize;
		const screenWidth = view.getUint16(offset + 0x8, true); //in pixels
		const screenHeight = view.getUint16(offset + 0xA, true);
		const padding = view.getUint32(offset + 0xC, true); //always 0
		const screenDataSize = view.getUint32(offset + 0x10, true);
		offset += 0x14;

		var entries = (blockSize - 0x14) / 2;
		const data: number[] = [];

		for (var i = 0; i < entries; i++) {
			data.push(view.getUint16(offset, true));
			offset += 2;
		}
		return  {
			type,
			blockSize,
			screenWidth,
			screenHeight,
			padding,
			screenDataSize,
			data
		}

		/* 
		Format is (YYYYXXNNNNNNNNNN)
		Y4 Palette Number 
		X2 Transformation (YFlip/XFlip) 
		N10 Tile Number
		*/
	}
}