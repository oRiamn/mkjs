//
// ncgr.js
//--------------------
// Loads ncgr files and provides a variety of functions for accessing and using the data.
// "Graphics Resource", as in tile data. Usually rendered in conjunction with Palette (nclr) and Cell (ncer) / screen (nscr) data.
// by RHY3756547
//

import { nitro, nitro_nitroHeader } from "../nitro";
import { MKSUtils } from "../utils";

type NcgrChar = {
	type: string,
	blockSize: number,
	tilesY: number,
	tilesX: number,
	bitDepth: number,
	tiledFlag: number,
	tileDataSize: number,
	unknown: number,
	tiles: Uint8ClampedArray[]
}
type NcgrCpos = {
	type: string,
	blockSize: number,
	tileSize: number,
	tileCount: number
}

export class ncgr implements MKJSDataFormator {
	input: MKJSDataInput;
	mainOff: number;
	sectionOffsets: nitro_nitroHeader['sectionOffsets'];
	char: NcgrChar;
	cpos: NcgrCpos;
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
		if (header.stamp != "RGCN") throw "NCGR invalid. Expected RGCN, found " + header.stamp;
		if (header.numSections < 1 || header.numSections > 2) throw "NCGR invalid. Too many sections - should have 2.";
		offset = header.sectionOffsets[0];
		//end nitro
		this.sectionOffsets = header.sectionOffsets;
		this.sectionOffsets[0] = 0x18;

		this.mainOff = offset;

		this.char = this._loadCHAR(view);
		if (header.numSections > 1) this.cpos = this._loadCPOS(view);
	}

	_loadCHAR(view: DataView): NcgrChar {
		var offset = this.sectionOffsets[0] - 8;

		const type = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);
		if (type != "RAHC") throw "NCGR invalid. Expected RAHC, found " + type;
		const blockSize = view.getUint32(offset + 0x4, true);
		this.sectionOffsets[1] = this.sectionOffsets[0] + blockSize;
		const tilesY = view.getUint16(offset + 0x8, true); //(tiles y)
		const tilesX = view.getUint16(offset + 0xA, true); //(tiles x)
		const bitDepth = view.getUint32(offset + 0xC, true); //3 - 4bits, 4 - 8bits
		//pad 0x10
		const tiledFlag = view.getUint32(offset + 0x14, true);
		const tileDataSize = view.getUint32(offset + 0x18, true);
		const unknown = view.getUint32(offset + 0x1C, true); //usually 24
		offset += 0x20;

		//tiles are 8 or 4 bit index to pal data
		//64 pixels per tile (8*8)
		var tileCount = (blockSize - 0x20) / ((bitDepth == 4) ? 64 : 32);
		const tiles: Uint8ClampedArray[] = [];
		for (var i = 0; i < tileCount; i++) {
			var tile: number[] = [];
			if (bitDepth == 4) {
				//easy, just read 1024 bytes
				for (var j = 0; j < 64; j++) {
					tile.push(view.getUint8(offset++))
				};
			} else {
				for (var j = 0; j < 32; j++) {
					var dat = view.getUint8(offset++);
					tile.push(dat & 0xF);
					tile.push(dat >> 4);
				}
			}
			tiles.push(new Uint8ClampedArray(tile));
		}
		return {
			type,
			blockSize,
			tilesY,
			tilesX,
			bitDepth,
			tiledFlag,
			tileDataSize,
			unknown,
			tiles,
		}
	}

	_loadCPOS(view: DataView): NcgrCpos { //palette count map, supposedly. maps each palette to an ID
		var offset = this.sectionOffsets[1] - 8;
		const type = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);
		if (type != "SOPC") throw "NCLR invalid. Expected SOPC, found " // + stamp;
		const blockSize = view.getUint32(offset + 0x4, true);
		//padding 0x8
		const tileSize = view.getUint16(offset + 0xC, true); //always 32
		const tileCount = view.getUint16(offset + 0xE, true);
		return {
			type,
			blockSize,
			tileSize,
			tileCount,
		} as NcgrCpos;
	}
}