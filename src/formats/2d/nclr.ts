//
// nclr.js
//--------------------
// Loads nclr files and provides a variety of functions for accessing and using the data.
// Palette information for nitro 2d graphics.
// by RHY3756547
//

import { nitro, nitro_nitroHeader } from "../nitro";
import { MKSUtils } from "../utils";

type NclrPaletteCountMap = {
	type: string,
	blockSize: number,
	palCount: number,
	unknown: number,
	palIDs: number[]
}

export type NclrPaletteColor = [number, number, number, number];
export type NclrPalette = NclrPaletteColor[]
type NclrPaletteObj = {
	type: string,
	blockSize: number,
	bitDepth: number,
	padding: number,
	palEntries: number,
	colorsPerPal: number
	palettes: NclrPalette[]
}

export class nclr implements MKJSDataFormator {
	input: MKJSDataInput;
	mainOff: number;
	sectionOffsets: nitro_nitroHeader['sectionOffsets'];
	pltt: NclrPaletteObj;
	pcmp: NclrPaletteCountMap;
	constructor(input: MKJSDataInput) {
		this.input = input;
		this.mainOff = undefined;

		if (this.input != null) {
			this.load(this.input);
		}
		this.load = this.load;
	}
	load(input: MKJSDataInput) {
		var view = new DataView(input);
		var offset = 0;
		var tex;

		//nitro 3d header
		const header = nitro.readHeader(view);
		if (header.stamp != "RLCN") throw "NCLR invalid. Expected RLCN, found " + header.stamp;
		if (header.numSections < 1 || header.numSections > 2) throw "NCLR invalid. Too many sections - should have 2.";
		offset = header.sectionOffsets[0];
		//end nitro
		this.sectionOffsets = header.sectionOffsets;
		this.sectionOffsets[0] = 0x18;

		this.mainOff = offset;

		this.pltt = this._loadPLTT(view);
		if (header.numSections > 1) this.pcmp = this._loadPCMP(view);
	}

	_loadPLTT(view: DataView): NclrPaletteObj {
		var offset = this.sectionOffsets[0] - 8;

		const type = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);
		if (type != "TTLP") throw "NCLR invalid. Expected TTLP, found " + type;
		
		const blockSize = view.getUint32(offset + 0x4, true);
		this.sectionOffsets[1] = this.sectionOffsets[0] + blockSize;
		const bitDepth = view.getUint32(offset + 0x8, true); //3 -> 4bit, 4 -> 8bit
		const padding = view.getUint32(offset + 0xC, true);
		const palEntries = view.getUint32(offset + 0x10, true) / 2; //stored in bytes, 2 bytes per col. seems to be wrong sometimes? (8bit mode, padding as 1)
		const colorsPerPal = view.getUint32(offset + 0x14, true); //usually 16

		//16-bit pallete data
		//XBBBBBGGGGGRRRRR

		var colsPerPal = (bitDepth == 4) ? 256 : 16;
		var realPalCount = (blockSize - 0x18) / 2;

		offset += 0x18;
		const palettes: NclrPalette[] = [];
		var curPal:NclrPaletteColor[]  = []
		for (var i = 0; i < realPalCount; i++) {
			curPal.push(this._readPalColour(view, offset));
			if (curPal.length >= colsPerPal) {
				palettes.push(curPal);
				curPal = [];
			}
			offset += 2;
		}
		if (curPal.length > 0){
			palettes.push(curPal);
		} 

		return {
			type,
			blockSize,
			bitDepth,
			padding,
			palEntries,
			colorsPerPal,
			palettes,
		};
	}

	_loadPCMP(view: DataView): NclrPaletteCountMap { //palette count map, supposedly. maps each palette to an ID
		var offset = this.sectionOffsets[1] - 8;

		const type = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);

		if (type != "PMCP") throw "NCLR invalid. Expected PMCP, found "; //+ stamp;
		const blockSize = view.getUint32(offset + 0x4, true);
		const palCount = view.getUint16(offset + 0x8, true);
		//unknown 16: 0?
		const unknown = view.getUint32(offset + 0xC, true);
		

		offset += 0x10;
		var palIDs = [];
		for (var i = 0; i < palCount; i++) {
			palIDs.push(view.getUint16(offset, true));
			offset += 2;
		}
		return {
			type,
			blockSize,
			palCount,
			unknown,
			palIDs
		}
	}

	_readPalColour(view: DataView, ind: number): NclrPaletteColor {
		var col = view.getUint16(ind, true);
		var f = 255 / 31;
		return [
			Math.round((col & 31) * f),
			Math.round(((col >> 5) & 31) * f),
			Math.round(((col >> 10) & 31) * f),
			255
		];
	}
}