//
// nclr.js
//--------------------
// Loads nclr files and provides a variety of functions for accessing and using the data.
// Palette information for nitro 2d graphics.
// by RHY3756547
//

import { nitro, nitro_nitroHeader } from "../nitro";
import { MKSUtils } from "../utils";

const NCLR_MAGIC = "RLCN";
const PLTT_MAGIC = "TTLP";
const PCMP_MAGIC = "PMCP";
const NCLR_FIRST_SECTION_OFFSET = 0x18;
const BLOCK_HEADER_SIZE = 8;
const PLTT_HEADER_SIZE = 0x18;
const PCMP_HEADER_SIZE = 0x10;
const COLOR_BYTES = 2;
/** Nitro bitDepth value 4 stores 256 colors per palette. */
const PLTT_BIT_DEPTH_8BPP = 4;
const COLORS_PER_PALETTE_8BPP = 256;
const COLORS_PER_PALETTE_4BPP = 16;
const NDS_COLOR_SCALE = 255 / 31;

type NclrPaletteCountMap = {
	type: string;
	blockSize: number;
	palCount: number;
	unknown: number;
	palIDs: number[];
};

export type NclrPaletteColor = [number, number, number, number];
export type NclrPalette = NclrPaletteColor[];

type NclrPaletteObj = {
	type: string;
	blockSize: number;
	bitDepth: number;
	padding: number;
	palEntries: number;
	colorsPerPal: number;
	palettes: NclrPalette[];
};

type PlttHeader = {
	type: string;
	blockSize: number;
	bitDepth: number;
	padding: number;
	palEntries: number;
	colorsPerPal: number;
};

function colorsPerPalette(bitDepth: number): number {
	return bitDepth === PLTT_BIT_DEPTH_8BPP ? COLORS_PER_PALETTE_8BPP : COLORS_PER_PALETTE_4BPP;
}

/** Decode a 16-bit BGR555 color entry into RGBA bytes. */
function parsePaletteColor(view: DataView, offset: number): NclrPaletteColor {
	const packed = view.getUint16(offset, true);
	return [
		Math.round((packed & 0x1f) * NDS_COLOR_SCALE),
		Math.round(((packed >> 5) & 0x1f) * NDS_COLOR_SCALE),
		Math.round(((packed >> 10) & 0x1f) * NDS_COLOR_SCALE),
		255,
	];
}

function readPalettes(view: DataView, offset: number, blockSize: number, bitDepth: number): NclrPalette[] {
	const colorCount = (blockSize - PLTT_HEADER_SIZE) / COLOR_BYTES;
	const paletteSize = colorsPerPalette(bitDepth);
	const palettes: NclrPalette[] = [];
	let currentPalette: NclrPalette = [];

	for (let i = 0; i < colorCount; i++) {
		currentPalette.push(parsePaletteColor(view, offset));
		offset += COLOR_BYTES;

		if (currentPalette.length >= paletteSize) {
			palettes.push(currentPalette);
			currentPalette = [];
		}
	}

	if (currentPalette.length > 0) {
		palettes.push(currentPalette);
	}

	return palettes;
}

export class nclr implements MKJSDataFormator {
	mainOff: number;
	pltt!: NclrPaletteObj;
	pcmp!: NclrPaletteCountMap;

	private input: MKJSDataInput;
	private sectionOffsets!: nitro_nitroHeader["sectionOffsets"];

	constructor(input: MKJSDataInput) {
		this.input = input;
		this.mainOff = undefined!;

		if (this.input != null) {
			this.load(this.input);
		}
	}

	load(input: MKJSDataInput): void {
		this.input = MKSUtils.prepareInput(input);
		const view = new DataView(this.input);

		const header = nitro.readHeader(view);
		if (header.stamp !== NCLR_MAGIC) {
			throw `NCLR invalid. Expected RLCN, found ${header.stamp}`;
		}
		if (header.numSections < 1 || header.numSections > 2) {
			throw "NCLR invalid. Too many sections - should have 2.";
		}

		this.sectionOffsets = header.sectionOffsets;
		this.sectionOffsets[0] = NCLR_FIRST_SECTION_OFFSET;
		this.mainOff = header.sectionOffsets[0];

		this.pltt = this._loadPLTT(view, this.sectionOffsets[0]);
		if (header.numSections > 1) {
			this.pcmp = this._loadPCMP(view, this.sectionOffsets[1]);
		}
	}

	private _loadPLTT(view: DataView, sectionOffset: number): NclrPaletteObj {
		const header = this._parsePlttHeader(view, sectionOffset);
		this.sectionOffsets[1] = sectionOffset + header.blockSize;

		const colorDataOffset = sectionOffset - BLOCK_HEADER_SIZE + PLTT_HEADER_SIZE;
		const palettes = readPalettes(view, colorDataOffset, header.blockSize, header.bitDepth);

		return {
			...header,
			palettes,
		};
	}

	private _parsePlttHeader(view: DataView, sectionOffset: number): PlttHeader {
		const tagOffset = sectionOffset - BLOCK_HEADER_SIZE;
		const type = MKSUtils.readAsciiTag(view, tagOffset);
		if (type !== PLTT_MAGIC) {
			throw `NCLR invalid. Expected TTLP, found ${type}`;
		}

		return {
			type,
			blockSize: view.getUint32(tagOffset + 0x4, true),
			bitDepth: view.getUint32(tagOffset + 0x8, true),
			padding: view.getUint32(tagOffset + 0xc, true),
			palEntries: view.getUint32(tagOffset + 0x10, true) / 2,
			colorsPerPal: view.getUint32(tagOffset + 0x14, true),
		};
	}

	private _loadPCMP(view: DataView, sectionOffset: number): NclrPaletteCountMap {
		const tagOffset = sectionOffset - BLOCK_HEADER_SIZE;
		const type = MKSUtils.readAsciiTag(view, tagOffset);
		if (type !== PCMP_MAGIC) {
			throw `NCLR invalid. Expected PMCP, found ${type}`;
		}

		const blockSize = view.getUint32(tagOffset + 0x4, true);
		const palCount = view.getUint16(tagOffset + 0x8, true);
		const unknown = view.getUint32(tagOffset + 0xc, true);
		const palIDs: number[] = [];
		let offset = tagOffset + PCMP_HEADER_SIZE;

		for (let i = 0; i < palCount; i++) {
			palIDs.push(view.getUint16(offset, true));
			offset += 2;
		}

		return {
			type,
			blockSize,
			palCount,
			unknown,
			palIDs,
		};
	}
}
