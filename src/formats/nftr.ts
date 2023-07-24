//
// nftr.js
//--------------------
// Reads NFTR fonts and compiles them to a texture and character lookup table. Texture is replaceable.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
// /formats/nitro.js
//

import { nitro } from "./nitro";
import { MKSUtils } from "./utils";

type nftr_color =[number, number,number, number];

export class nftr implements MKJSDataFormator {
	input: MKJSDataInput;
	mainOff: number;
	info: {
		type: string,
		blockSize: number,
		unknown1: number,
		height: number,
		nullCharIndex: number,
		unknown2: number,
		width: number,
		widthBis: number,
		encoding: number,
		offsetCGLP: number,
		offsetCWDH: number,
		offsetCMAP: number,
		fontHeight: number,
		fontWidth: number,
		bearingX: number,
		bearingY: number,
	};
	cglp: {
		type: string,
		blockSize: number,
		tileWidth: number,
		tileHeight: number,
		tileLength: number,
		unknown: number,
		depth: number,
		rotateMode: number,
		tiles: Uint8Array[]
	};
	cwdh: {
		type: string,
		blockSize: number,
		firstCode: number,
		lastCode: number,
		unknown: number,
		info: {
			pixelStart: number,
			pixelWidth: number,
			pixelLength: number,
		}[],
	};
	charMap: { [x: string]: number };
	cmaps: {
		type: string,
		blockSize: number,
		firstChar: number,
		lastChar: number,
		typeSection: number,
		charCodes: number[],
		numChars: number,
		charMap: [number, number][],
		firstCharCode: number;
		nextOffset: number,
	}[];

	constructor(input: MKJSDataInput) {

		this.input = input

		this.mainOff;
		this.info = undefined;
		this.charMap = {};

		if (this.input != null) {
			this.load(this.input);
		}
	}

	load(input: MKJSDataInput): void {
		var view = new DataView(input);
		var offset = 0;
		var tex;

		//nitro 3d header
		const header = nitro.readHeader(view);
		//debugger;
		if (header.stamp != "RTFN") throw "NFTR invalid. Expected RTFN, found " + header.stamp;
		offset = 0x10; //nitro header for nftr doesn't have section offsets - they are in order
		//end nitro

		const type = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);
		const blockSize = view.getUint32(offset + 0x4, true);
		const unknown1 = view.getUint8(offset + 0x8);
		const height = view.getUint8(offset + 0x9);
		const nullCharIndex = view.getUint16(offset + 0xA, true);
		const unknown2 = view.getUint8(offset + 0xC);
		const width = view.getUint8(offset + 0xD);
		const widthBis = view.getUint8(offset + 0xE);
		const encoding = view.getUint8(offset + 0xF);
		const offsetCGLP = view.getUint32(offset + 0x10, true); //character graphics
		const offsetCWDH = view.getUint32(offset + 0x14, true); //character width
		const offsetCMAP = view.getUint32(offset + 0x18, true); //character map

		let fontHeight: number = undefined;
		let fontWidth: number = undefined;
		let bearingX: number = undefined;
		let bearingY: number = undefined;

		if (blockSize == 0x20) {
			//extra info
			fontHeight = view.getUint8(offset + 0x1C);
			fontWidth = view.getUint8(offset + 0x1D);
			bearingX = view.getUint8(offset + 0x1E);
			bearingY = view.getUint8(offset + 0x1F);
		}

		this.info = {
			type,
			blockSize,
			unknown1,
			height,
			nullCharIndex,
			unknown2,
			width,
			widthBis,
			encoding,
			offsetCGLP,
			offsetCWDH,
			offsetCMAP,
			fontHeight,
			fontWidth,
			bearingX,
			bearingY,
		}

		this._loadCGLP(view);
		this._loadCWDH(view);
		this._loadCMAP(view);

		this.mainOff = offset;
	}

	_loadCGLP(view: DataView): void {
		var offset = this.info.offsetCGLP - 8;
		const type = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);
		const blockSize = view.getUint32(offset + 0x4, true);
		const tileWidth = view.getUint8(offset + 0x8);
		const tileHeight = view.getUint8(offset + 0x9);
		const tileLength = view.getUint16(offset + 0xA, true);
		const unknown = view.getUint16(offset + 0xC, true);
		const depth = view.getUint8(offset + 0xE);
		const rotateMode = view.getUint8(offset + 0xF);

		offset += 0x10;
		const tiles: Uint8Array[] = [];
		var total = (blockSize - 0x10) / tileLength;
		for (var i = 0; i < total; i++) {
			tiles.push(new Uint8Array(view.buffer.slice(offset, offset + tileLength)));
			offset += tileLength;
		}
		this.cglp = {
			type,
			blockSize,
			tileWidth,
			tileHeight,
			tileLength,
			unknown,
			depth,
			rotateMode,
			tiles
		};
	}

	_loadCWDH(view: DataView): void {
		var offset = this.info.offsetCWDH - 8;
		const type = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);
		const blockSize = view.getUint32(offset + 0x4, true);
		const firstCode = view.getUint16(offset + 0x8, true);
		const lastCode = view.getUint16(offset + 0xA, true);

		const unknown = view.getUint32(offset + 0xC, true);

		const info = [];
		offset += 0x10;
		for (var i = 0; i < this.cglp.tiles.length; i++) {

			info.push({
				pixelStart: view.getInt8(offset),
				pixelWidth: view.getUint8(offset + 1),
				pixelLength: view.getUint8(offset + 2)
			});
			offset += 3;
		}

		this.cwdh = {
			type,
			blockSize,
			firstCode,
			lastCode,
			unknown,
			info,
		};
	}

	_loadCMAP(view: DataView): void {
		var offset = this.info.offsetCMAP - 8;
		this.cmaps = [];
		while (offset > 0 && offset < view.byteLength) {

			const type = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);
			const blockSize = view.getUint32(offset + 0x4, true);
			const firstChar = view.getUint16(offset + 0x8, true);
			const lastChar = view.getUint16(offset + 0xA, true);

			const typeSection = view.getUint32(offset + 0xC, true);
			const nextOffset = view.getUint32(offset + 0x10, true);

			let charCodes:number[];
			let numChars: number;
			let charMap: [number, number][];
			let firstCharCode: number;
			offset += 0x14;
			switch (typeSection & 0xFFFF) {
				case 1: //char code list (first to last)
					charCodes = [];
					var total = (lastChar - firstChar) + 1;
					var charCode = firstChar;
					for (var i = 0; i < total; i++) {
						var char = view.getUint16(offset, true);
						charCodes.push(char);
						if (char != 65535) {
							this.charMap[MKSUtils.asciiFromCharCode(charCode)] = char;
						}
						charCode++;
						offset += 2;
					}
					break;
				case 2: //char code map
					numChars = view.getUint16(offset, true);
					offset += 2;
					charMap = [];
					for (var i = 0; i < numChars; i++) {
						var charCode = view.getUint16(offset, true);
						var char = view.getUint16(offset + 2, true);
						charMap.push([charCode, char]);
						this.charMap[MKSUtils.asciiFromCharCode(charCode)] = char;
						offset += 4;
					}
					break;
				default:
					firstCharCode = view.getUint16(offset, true);
					var total = (lastChar - firstChar) + 1;
					var charCode = firstChar;
					var char = firstCharCode;
					for (var i = 0; i < total; i++) {
						this.charMap[MKSUtils.asciiFromCharCode(charCode++)] = char++;
					}
					break;

			}
			this.cmaps.push({
				type,
				blockSize,
				firstChar,
				lastChar,
				typeSection,
				charCodes,
				numChars,
				charMap,
				firstCharCode,
				nextOffset,
			});

			offset = nextOffset - 8;
		}
	}

	// RENDERING FUNCTIONS

	mapText(text: string, missing: string): number[] {
		if (missing == null) missing = "*";
		var map = this.charMap;
		var result = [];
		for (var i = 0; i < text.length; i++) {
			var code = text[i];
			var mapped = map[code];
			if (mapped == null) mapped = map[missing];
			result.push(mapped);
		}
		return result;
	}

	measureText(text: string, missing: string, spacing: number): number[] {
		return this.measureMapped(this.mapText(text, missing), spacing);
	}

	measureMapped(mapped: number[], spacing: number): number[] {
		if (spacing == null) spacing = 1;
		var width = 0;
		var widths = this.cwdh.info;

		for (var i = 0; i < mapped.length; i++) {
			width += widths[mapped[i]].pixelLength + spacing; // pixelWidth is the width of drawn section - length is how wide the char is
		}

		return [width, this.info.height];
	}

	drawToCanvas(text: string, palette: nftr_color[], spacing: number): HTMLCanvasElement {
		if (spacing == null) spacing = 1;
		var mapped = this.mapText(text, "");
		var size = this.measureMapped(mapped, spacing);

		var canvas = document.createElement("canvas");
		canvas.width = size[0];
		canvas.height = size[1];
		var ctx = canvas.getContext("2d");

		//draw chars
		var widths = this.cwdh.info;
		var position = 0;

		for (var i = 0; i < mapped.length; i++) {
			var c = mapped[i];
			var cinfo = widths[c];

			var data = this._getCharData(c, palette);
			ctx.putImageData(data, position + cinfo.pixelStart, 0, 0, 0, cinfo.pixelWidth, data.height);

			position += cinfo.pixelLength + spacing;
		}
		return canvas;
	}

	_getCharData(id: number, pal: nftr_color[]): ImageData {
		//todo: cache?
		var cglp = this.cglp;
		var tile = cglp.tiles[id];
		var pixels = cglp.tileWidth * cglp.tileHeight;
		var d = new Uint8ClampedArray(pixels * 4);
		var data = new ImageData(d, cglp.tileWidth, cglp.tileHeight);
		var depth = this.cglp.depth;
		var mask = (1 << depth) - 1;

		var bit = 8;
		var byte = 0;
		var curByte = tile[byte];
		var ind = 0;
		for (var i = 0; i < pixels; i++) {
			bit -= depth;
			var pind = 0;
			if (bit < 0) {
				//overlap into next
				var end = bit + 8;
				if (end < 8) {
					//still some left in this byte
					pind = (curByte << (-bit)) & mask;
				}
				curByte = tile[++byte];
				bit += 8;
				pind |= (curByte >> (bit)) & mask;
			} else {
				pind = (curByte >> (bit)) & mask;
			}

			var col = pal[pind];
			d[ind++] = col[0];
			d[ind++] = col[1];
			d[ind++] = col[2];
			d[ind++] = col[3];
		}
		return data;
	}

}