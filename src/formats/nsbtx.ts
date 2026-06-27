//
// nsbtx.js
//--------------------
// Reads NSBTX files (or TEX0 sections) and provides canvases containing decoded texture data.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
// /formats/nitro.js
//

import { nitro, nitro_nitroInfos } from "./nitro";
import { MKSUtils } from "./utils";

type nsbtx_palInfoHandler = {
	palOffset: number;
	unknown: number;
	nextoff: number;
};

type nsbtx_texInfoHandler = {
	texOffset: number;
	pal0trans: boolean;
	format: number;
	height: number;
	width: number;
	repeatX: number;
	repeatY: number;
	flipX: number;
	flipY: number;
	unkWidth: number;
	unk1: number;
	unkHeight: number;
	unk2: number;
	nextoff: number;
};

// todo: implement MKJSDataFormator
export class nsbtx {
	input: MKJSDataInput;
	tex0: boolean;
	texDataSize!: number;
	texInfoOff!: number;
	texOffset!: number;
	compTexSize!: number;
	compTexOffset!: number;
	compTexInfoDataOff!: number;
	palSize!: number;
	palInfoOff!: number;
	palOffset!: number;
	mainOff!: number;
	textureInfo!: nitro_nitroInfos<nsbtx_texInfoHandler>;
	textureInfoNameToIndex!: { [x: string]: number };
	paletteInfo!: nitro_nitroInfos<nsbtx_palInfoHandler>;
	paletteInfoNameToIndex!: { [x: string]: number };
	palData!: ArrayBuffer;
	texData!: ArrayBuffer;
	compData!: ArrayBuffer;
	compInfoData!: ArrayBuffer;
	colourBuffer!: Uint32Array;
	cache: {
		[x: string]: CustomWebGLTexture; // set in nitromodel
	};
	constructor(input: MKJSDataInput, tex0: boolean = false) {
		this.input = input;
		this.tex0 = tex0;

		this.cache = {};

		if (this.input != null) {
			this.load(this.input, this.tex0);
		}
		this.cache = {}; //textures for btx are cached in this object. shoudld be static
	}

	private load(input: MKJSDataInput, tex0: boolean) {
		this.colourBuffer = new Uint32Array(4);
		input = MKSUtils.prepareInput(input);
		const view = new DataView(input);
		let offset = 0;
		if (!tex0) {
			//nitro 3d header
			const header = nitro.readHeader(view);
			if (header.stamp != "BTX0") throw `nsbtx invalid. Expected BTX0, found ${header.stamp}`;
			if (header.numSections > 1) throw "NSBTX invalid. Too many sections - should only have one.";
			offset = header.sectionOffsets[0];
		}

		this.mainOff = offset;

		const stamp =
			MKSUtils.asciireadChar(view, offset + 0x0) +
			MKSUtils.asciireadChar(view, offset + 0x1) +
			MKSUtils.asciireadChar(view, offset + 0x2) +
			MKSUtils.asciireadChar(view, offset + 0x3);
		if (stamp != "TEX0") throw `NSBTX invalid. Expected TEX0, found ${stamp}`;
		view.getUint32(offset + 0x04, true);
		this.texDataSize = view.getUint16(offset + 0x0c, true) << 3;
		this.texInfoOff = view.getUint16(offset + 0x0e, true);
		this.texOffset = view.getUint16(offset + 0x14, true);

		this.compTexSize = view.getUint16(offset + 0x1c, true) << 3;
		view.getUint16(offset + 0x1e, true);
		this.compTexOffset = view.getUint32(offset + 0x24, true);
		this.compTexInfoDataOff = view.getUint32(offset + 0x28, true);

		this.palSize = view.getUint32(offset + 0x30, true) << 3;
		this.palInfoOff = view.getUint32(offset + 0x34, true);
		this.palOffset = view.getUint32(offset + 0x38, true);

		//read palletes, then textures.
		const po = this.mainOff + this.palOffset;
		this.palData = input.slice(po, po + this.palSize);

		const to = this.mainOff + this.texOffset;
		this.texData = input.slice(to, to + this.texDataSize);

		const co = this.mainOff + this.compTexOffset;
		this.compData = input.slice(co, co + this.compTexSize); //pixel information for compression. 2bpp, 16 pixels, so per 4x4 block takes up 4 bytes

		const cio = this.mainOff + this.compTexInfoDataOff;
		this.compInfoData = input.slice(cio, cio + this.compTexSize / 2); //each 4x4 block has a 16bit information uint. 2 bytes per block, thus half the size of above.

		this.paletteInfo = nitro.read3dInfo(view, this.mainOff + this.palInfoOff, (...args) => this._palInfoHandler(args[0], args[1]));
		this.textureInfo = nitro.read3dInfo(view, this.mainOff + this.texInfoOff, (...args) => this._texInfoHandler(args[0], args[1]));

		this.paletteInfoNameToIndex = this._buildNameToIndex(this.paletteInfo);
		this.textureInfoNameToIndex = this._buildNameToIndex(this.textureInfo);
	}

	readTexWithPal(textureId: number, palId: number) {
		const tex = this.textureInfo.objectData[textureId];
		const pal = this.paletteInfo.objectData[palId];

		const format = tex.format;
		const trans = tex.pal0trans;

		if (format == 5) return this._readCompressedTex(tex, pal); //compressed 4x4 texture, different processing entirely

		let off = tex.texOffset;
		const palView = new DataView(this.palData);
		const texView = new DataView(this.texData);
		const palOff = pal.palOffset;

		const canvas = document.createElement("canvas");
		canvas.width = tex.width;
		canvas.height = tex.height;
		const ctx = canvas.getContext("2d")!;
		const img = ctx.getImageData(0, 0, tex.width, tex.height);

		const total = tex.width * tex.height;
		let databuf: number = undefined!;
		for (let i = 0; i < total; i++) {
			let col;
			if (format == 1) {
				//A3I5 encoding. 3 bits alpha 5 bits pal index
				const dat = texView.getUint8(off++);
				col = this._readPalColour(palView, palOff, dat & 31, trans);
				col[3] = (dat >> 5) * (255 / 7);
				this._premultiply(col);
			} else if (format == 2) {
				//2 bit pal
				if (i % 4 == 0) databuf = texView.getUint8(off++);
				col = this._readPalColour(palView, palOff, (databuf >> ((i % 4) * 2)) & 3, trans);
			} else if (format == 3) {
				//4 bit pal
				if (i % 2 == 0) {
					databuf = texView.getUint8(off++);
					col = this._readPalColour(palView, palOff, databuf & 15, trans);
				} else {
					col = this._readPalColour(palView, palOff, databuf >> 4, trans);
				}
			} else if (format == 4) {
				//8 bit pal
				col = this._readPalColour(palView, palOff, texView.getUint8(off++), trans);
			} else if (format == 6) {
				//A5I3 encoding. 5 bits alpha 3 bits pal index
				const dat = texView.getUint8(off++);
				col = this._readPalColour(palView, palOff, dat & 7, trans);
				col[3] = (dat >> 3) * (255 / 31);
				this._premultiply(col);
			} else if (format == 7) {
				//raw color data
				col = texView.getUint16(off, true);
				this.colourBuffer[0] = Math.round(((col & 31) / 31) * 255);
				this.colourBuffer[1] = Math.round((((col >> 5) & 31) / 31) * 255);
				this.colourBuffer[2] = Math.round((((col >> 10) & 31) / 31) * 255);
				this.colourBuffer[3] = Math.round((col >> 15) * 255);
				col = this.colourBuffer;
				this._premultiply(col);
				off += 2;
			} else {
				console.warn("texture format is none, ignoring");
				return canvas;
			}
			img.data.set(col, i * 4);
		}
		ctx.putImageData(img, 0, 0);
		return canvas;
	}

	private _buildNameToIndex(info: nitro_nitroInfos<nsbtx_texInfoHandler | nsbtx_palInfoHandler>) {
		const nameToIndex: { [x: string]: number } = {};
		for (let i = 0; i < info.names.length; i++) {
			nameToIndex[`$${info.names[i]}`] = i;
		}
		return nameToIndex;
	}

	private _premultiply(col: Uint32Array) {
		col[0] *= col[3] / 255;
		col[1] *= col[3] / 255;
		col[2] *= col[3] / 255;
	}

	private _readCompressedTex(tex: nsbtx_texInfoHandler, pal: nsbtx_palInfoHandler) {
		//format 5, 4x4 texels. I'll keep this well documented so it's easy to understand.
		let off = tex.texOffset;
		const texView = new DataView(this.compData); //real texture data - 32 bits per 4x4 block (one byte per 4px horizontal line, each descending 1px)
		const compView = new DataView(this.compInfoData); //view into compression info - informs of pallete and parameters.
		const palView = new DataView(this.palData); //view into the texture pallete
		let compOff = off / 2; //info is 2 bytes per block, so the offset is half that of the tex offset.
		const palOff = pal.palOffset;
		const transColor = new Uint8Array([0, 0, 0, 0]); //transparent black

		const canvas = document.createElement("canvas");
		canvas.width = tex.width;
		canvas.height = tex.height;
		const ctx = canvas.getContext("2d")!;
		const img = ctx.getImageData(0, 0, tex.width, tex.height);

		const w = tex.width >> 2; //iterate over blocks, block w and h is /4.
		const h = tex.height >> 2;

		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				//inside block
				const bInfo = compView.getUint16(compOff, true); //block info

				const addr = bInfo & 0x3fff; //offset to relevant pallete
				const mode = (bInfo >> 14) & 3;

				const finalPo = palOff + addr * 4;
				let imgoff = x * 4 + y * w * 16;
				for (let iy = 0; iy < 4; iy++) {
					const dat = texView.getUint8(off++);
					for (let ix = 0; ix < 4; ix++) {
						//iterate over horiz lines
						const part = (dat >> (ix * 2)) & 3;
						let col;

						switch (mode) {
							case 0: //value 3 is transparent, otherwise pal colour
								if (part == 3) col = transColor;
								else col = this._readPalColour(palView, finalPo, part, false);
								break;
							case 1: //average mode - colour 2 is average of 1st two, 3 is transparent. 0&1 are normal.
								if (part == 3) col = transColor;
								else if (part == 2) col = this._readFractionalPal(palView, finalPo, 0.5);
								else col = this._readPalColour(palView, finalPo, part, false);
								break;
							case 2: //pal colour
								col = this._readPalColour(palView, finalPo, part, false);
								break;
							case 3: //5/8 3/8 mode - colour 2 is 5/8 of col0 plus 3/8 of col1, 3 is 3/8 of col0 plus 5/8 of col1. 0&1 are normal.
								if (part == 3) col = this._readFractionalPal(palView, finalPo, 3 / 8);
								else if (part == 2) col = this._readFractionalPal(palView, finalPo, 5 / 8);
								else col = this._readPalColour(palView, finalPo, part, false);
								break;
						}

						img.data.set(col!, imgoff++ * 4);
					}
					imgoff += tex.width - 4;
				}
				compOff += 2; //align off to next block
			}
		}

		ctx.putImageData(img, 0, 0);
		return canvas;
	}

	private _readPalColour(view: DataView, palOff: number, ind: number, pal0trans: boolean) {
		const col = view.getUint16(palOff + ind * 2, true);
		const f = 255 / 31;
		this.colourBuffer[0] = Math.round((col & 31) * f);
		this.colourBuffer[1] = Math.round(((col >> 5) & 31) * f);
		this.colourBuffer[2] = Math.round(((col >> 10) & 31) * f);
		this.colourBuffer[3] = pal0trans && ind == 0 ? 0 : 255;
		return this.colourBuffer;
	}

	private _readFractionalPal(view: DataView, palOff: number, i: number) {
		const col = view.getUint16(palOff, true);
		const col2 = view.getUint16(palOff + 2, true);
		const ni = 1 - i;
		const f = 255 / 31;
		this.colourBuffer[0] = Math.round((col & 31) * f * i + (col2 & 31) * f * ni);
		this.colourBuffer[1] = Math.round(((col >> 5) & 31) * f * i + ((col2 >> 5) & 31) * f * ni);
		this.colourBuffer[2] = Math.round(((col >> 10) & 31) * f * i + ((col2 >> 10) & 31) * f * ni);
		this.colourBuffer[3] = 255;
		return this.colourBuffer;
	}

	private _palInfoHandler(view: DataView, offset: number): nsbtx_palInfoHandler {
		const palOffset = view.getUint16(offset, true) << 3;
		const unknown = view.getUint16(offset + 2, true);
		return {
			palOffset: palOffset,
			unknown: unknown,
			nextoff: offset + 4,
		};
	}

	private _texInfoHandler(view: DataView, offset: number): nsbtx_texInfoHandler {
		const texOffset = view.getUint16(offset, true) << 3;
		const flags = view.getUint16(offset + 2, true);
		const width2 = view.getUint8(offset + 4);
		const unknown = view.getUint8(offset + 5);
		const height2 = view.getUint8(offset + 6);
		const unknown2 = view.getUint8(offset + 7);
		return {
			texOffset: texOffset,
			pal0trans: !!((flags >> 13) & 1), //two top flags are texture matrix modes. not sure if it really matters (except for nsbta animation maybe, but 0 = no transform and things that have tex animations are set to 0 anyways).
			format: (flags >> 10) & 7,
			height: 8 << ((flags >> 7) & 7),
			width: 8 << ((flags >> 4) & 7),
			repeatX: flags & 1,
			repeatY: (flags >> 1) & 1,
			flipX: (flags >> 2) & 1,
			flipY: (flags >> 3) & 1,
			unkWidth: width2,
			unk1: unknown,
			unkHeight: height2,
			unk2: unknown2,
			nextoff: offset + 8,
		};
	}
}
