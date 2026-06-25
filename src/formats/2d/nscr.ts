//
// nscr.js
//--------------------
// Loads nscr files and provides a variety of functions for accessing and using the data.
// Screen data for nitro 2d graphics. Each cell references a graphic (ncgr) and palette (nclr).
// by RHY3756547
//

import { nitro, nitro_nitroHeader } from "../nitro";
import { MKSUtils } from "../utils";

const NSCR_MAGIC = "RCSN";
const SCRN_MAGIC = "NRCS";
const NSCR_FIRST_SECTION_OFFSET = 0x18;
const BLOCK_HEADER_SIZE = 8;
const SCRN_HEADER_SIZE = 0x14;
const MAP_ENTRY_BYTES = 2;

/** Each map entry is YYYYXXNNNNNNNNNN: 4-bit palette, 2-bit flip, 10-bit tile index. */
type NscrScrn = {
	type: string;
	blockSize: number;
	screenWidth: number;
	screenHeight: number;
	padding: number;
	screenDataSize: number;
	data: number[];
};

type ScrnHeader = {
	type: string;
	blockSize: number;
	screenWidth: number;
	screenHeight: number;
	padding: number;
	screenDataSize: number;
};

function readScreenMap(view: DataView, offset: number, entryCount: number): number[] {
	const data: number[] = [];
	let entryOffset = offset;

	for (let i = 0; i < entryCount; i++) {
		data.push(view.getUint16(entryOffset, true));
		entryOffset += MAP_ENTRY_BYTES;
	}

	return data;
}

export class nscr implements MKJSDataFormator {
	mainOff: number;
	scrn!: NscrScrn;

	private sectionOffsets!: nitro_nitroHeader["sectionOffsets"];
	private input: MKJSDataInput;

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
		if (header.stamp !== NSCR_MAGIC) {
			throw `NSCR invalid. Expected RCSN, found ${header.stamp}`;
		}
		if (header.numSections !== 1) {
			throw "NSCR invalid. Too many sections - should have 1.";
		}

		this.sectionOffsets = header.sectionOffsets;
		this.sectionOffsets[0] = NSCR_FIRST_SECTION_OFFSET;
		this.mainOff = header.sectionOffsets[0];

		this.scrn = this._loadSCRN(view, this.sectionOffsets[0]);
	}

	private _loadSCRN(view: DataView, sectionOffset: number): NscrScrn {
		const header = this._parseScrnHeader(view, sectionOffset);
		this.sectionOffsets[1] = sectionOffset + header.blockSize;

		const mapOffset = sectionOffset - BLOCK_HEADER_SIZE + SCRN_HEADER_SIZE;
		const entryCount = (header.blockSize - SCRN_HEADER_SIZE) / MAP_ENTRY_BYTES;
		const data = readScreenMap(view, mapOffset, entryCount);

		return {
			...header,
			data,
		};
	}

	private _parseScrnHeader(view: DataView, sectionOffset: number): ScrnHeader {
		const tagOffset = sectionOffset - BLOCK_HEADER_SIZE;
		const type = MKSUtils.readAsciiTag(view, tagOffset);
		if (type !== SCRN_MAGIC) {
			throw `NSCR invalid. Expected NRCS, found ${type}`;
		}

		return {
			type,
			blockSize: view.getUint32(tagOffset + 0x4, true),
			screenWidth: view.getUint16(tagOffset + 0x8, true),
			screenHeight: view.getUint16(tagOffset + 0xa, true),
			padding: view.getUint32(tagOffset + 0xc, true),
			screenDataSize: view.getUint32(tagOffset + 0x10, true),
		};
	}
}
