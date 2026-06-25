//
// ncgr.js
//--------------------
// Loads ncgr files and provides a variety of functions for accessing and using the data.
// "Graphics Resource", as in tile data. Usually rendered in conjunction with Palette (nclr) and Cell (ncer) / screen (nscr) data.
// by RHY3756547
//

import { nitro, nitro_nitroHeader } from "../nitro";
import { MKSUtils } from "../utils";

const NCGR_MAGIC = "RGCN";
const CHAR_MAGIC = "RAHC";
const CPOS_MAGIC = "SOPC";
const NCGR_FIRST_SECTION_OFFSET = 0x18;
const BLOCK_HEADER_SIZE = 8;
const CHAR_HEADER_SIZE = 0x20;
const TILE_PIXEL_COUNT = 64;
/** Nitro bitDepth value 4 stores one palette index byte per pixel. */
const CHAR_BIT_DEPTH_8BPP = 4;
const CHAR_BYTES_PER_TILE_8BPP = 64;
const CHAR_BYTES_PER_TILE_4BPP = 32;

type NcgrChar = {
	type: string;
	blockSize: number;
	tilesY: number;
	tilesX: number;
	bitDepth: number;
	tiledFlag: number;
	tileDataSize: number;
	unknown: number;
	tiles: Uint8ClampedArray[];
};

type NcgrCpos = {
	type: string;
	blockSize: number;
	tileSize: number;
	tileCount: number;
};

type CharHeader = {
	type: string;
	blockSize: number;
	tilesY: number;
	tilesX: number;
	bitDepth: number;
	tiledFlag: number;
	tileDataSize: number;
	unknown: number;
};

function bytesPerTile(bitDepth: number): number {
	return bitDepth === CHAR_BIT_DEPTH_8BPP ? CHAR_BYTES_PER_TILE_8BPP : CHAR_BYTES_PER_TILE_4BPP;
}

function read8bppTile(view: DataView, offset: number): { tile: Uint8ClampedArray; nextOffset: number } {
	const indices = new Uint8ClampedArray(TILE_PIXEL_COUNT);
	for (let i = 0; i < TILE_PIXEL_COUNT; i++) {
		indices[i] = view.getUint8(offset + i);
	}
	return { tile: indices, nextOffset: offset + CHAR_BYTES_PER_TILE_8BPP };
}

function read4bppTile(view: DataView, offset: number): { tile: Uint8ClampedArray; nextOffset: number } {
	const indices = new Uint8ClampedArray(TILE_PIXEL_COUNT);
	for (let i = 0; i < CHAR_BYTES_PER_TILE_4BPP; i++) {
		const packed = view.getUint8(offset + i);
		indices[i * 2] = packed & 0xf;
		indices[i * 2 + 1] = packed >> 4;
	}
	return { tile: indices, nextOffset: offset + CHAR_BYTES_PER_TILE_4BPP };
}

function readTileData(view: DataView, offset: number, blockSize: number, bitDepth: number): Uint8ClampedArray[] {
	const tileCount = (blockSize - CHAR_HEADER_SIZE) / bytesPerTile(bitDepth);
	const tiles: Uint8ClampedArray[] = [];
	let tileOffset = offset;

	for (let i = 0; i < tileCount; i++) {
		const parsed = bitDepth === CHAR_BIT_DEPTH_8BPP ? read8bppTile(view, tileOffset) : read4bppTile(view, tileOffset);
		tiles.push(parsed.tile);
		tileOffset = parsed.nextOffset;
	}

	return tiles;
}

export class ncgr implements MKJSDataFormator {
	mainOff: number;
	char!: NcgrChar;
	cpos!: NcgrCpos;
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
		if (header.stamp !== NCGR_MAGIC) {
			throw `NCGR invalid. Expected RGCN, found ${header.stamp}`;
		}
		if (header.numSections < 1 || header.numSections > 2) {
			throw "NCGR invalid. Too many sections - should have 2.";
		}

		this.sectionOffsets = header.sectionOffsets;
		this.sectionOffsets[0] = NCGR_FIRST_SECTION_OFFSET;
		this.mainOff = header.sectionOffsets[0];

		this.char = this._loadCHAR(view, this.sectionOffsets[0]);
		if (header.numSections > 1) {
			this.cpos = this._loadCPOS(view, this.sectionOffsets[1]);
		}
	}

	private _loadCHAR(view: DataView, sectionOffset: number): NcgrChar {
		const header = this._parseCharHeader(view, sectionOffset);
		this.sectionOffsets[1] = sectionOffset + header.blockSize;

		const tileDataOffset = sectionOffset - BLOCK_HEADER_SIZE + CHAR_HEADER_SIZE;
		const tiles = readTileData(view, tileDataOffset, header.blockSize, header.bitDepth);

		return {
			...header,
			tiles,
		};
	}

	private _parseCharHeader(view: DataView, sectionOffset: number): CharHeader {
		const tagOffset = sectionOffset - BLOCK_HEADER_SIZE;
		const type = MKSUtils.readAsciiTag(view, tagOffset);
		if (type !== CHAR_MAGIC) {
			throw `NCGR invalid. Expected RAHC, found ${type}`;
		}

		return {
			type,
			blockSize: view.getUint32(tagOffset + 0x4, true),
			tilesY: view.getUint16(tagOffset + 0x8, true),
			tilesX: view.getUint16(tagOffset + 0xa, true),
			bitDepth: view.getUint32(tagOffset + 0xc, true),
			tiledFlag: view.getUint32(tagOffset + 0x14, true),
			tileDataSize: view.getUint32(tagOffset + 0x18, true),
			unknown: view.getUint32(tagOffset + 0x1c, true),
		};
	}

	private _loadCPOS(view: DataView, sectionOffset: number): NcgrCpos {
		const tagOffset = sectionOffset - BLOCK_HEADER_SIZE;
		const type = MKSUtils.readAsciiTag(view, tagOffset);
		if (type !== CPOS_MAGIC) {
			throw `NCGR invalid. Expected SOPC, found ${type}`;
		}

		return {
			type,
			blockSize: view.getUint32(tagOffset + 0x4, true),
			tileSize: view.getUint16(tagOffset + 0xc, true),
			tileCount: view.getUint16(tagOffset + 0xe, true),
		};
	}
}
