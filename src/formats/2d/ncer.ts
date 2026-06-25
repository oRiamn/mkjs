//
// ncer.js
//--------------------
// Loads ncer files and provides a variety of functions for accessing and using the data.
// Cell data for nitro 2d graphics. Multiple images made out of multiple cells, sharing an input palette and ncgr.
// by RHY3756547
//

import { nitro, nitro_nitroHeader } from "../nitro";
import { MKSUtils } from "../utils";

const NCER_MAGIC = "RECN";
const CEBK_MAGIC = "KBEC";
const NCER_FIRST_SECTION_OFFSET = 0x18;
const CEBK_BLOCK_HEADER_SIZE = 8;
const CEBK_HEADER_SIZE = 0x20;
const CEBK_IMAGE_ENTRY_SIZE = 8;
const CEBK_EXTENDED_BOUNDS_SIZE = 8;
const OAM_ENTRY_SIZE = 6;
const CEBK_BANK_TYPE_EXTENDED = 1;

/** DS OAM object dimensions in pixels, indexed by [size][shape]. */
const OAM_DIMENSIONS: readonly [readonly [number, number], readonly [number, number], readonly [number, number]][] = [
	[
		[8, 8],
		[16, 8],
		[8, 16],
	],
	[
		[16, 16],
		[32, 8],
		[8, 32],
	],
	[
		[32, 32],
		[32, 16],
		[16, 32],
	],
	[
		[64, 64],
		[64, 32],
		[32, 64],
	],
];

export type NcerCebkImageCell = {
	x: number;
	y: number;
	rsFlag: boolean;
	disable: boolean;
	doubleSize: boolean;
	objMode: number;
	mosaic: boolean;
	depth: boolean;
	shape: number;
	xFlip: boolean;
	yFlip: boolean;
	selectParam: number;
	size: [number, number];
	tileOffset: number;
	priority: number;
	pal: number;
};

export type NcerCebkImage = {
	numCells: number;
	readOnlyInfo: number;
	offset: number;
	xMax?: number;
	yMax?: number;
	xMin?: number;
	yMin?: number;
	partitionOffset?: number;
	partitionSize?: number;
	cells: NcerCebkImageCell[];
};

type NcerCebk = {
	type: string;
	blockSize: number;
	imageCount: number;
	bankType: number;
	unknown: number;
	boundarySize: number;
	partitionDataOffset: number;
	maxPartitionSize?: number;
	firstOffset?: number;
	images: NcerCebkImage[];
};

type CebkHeader = {
	type: string;
	blockSize: number;
	imageCount: number;
	bankType: number;
	unknown: number;
	boundarySize: number;
	partitionDataOffset: number;
};

function signExtend(value: number, bits: number): number {
	const signBit = 1 << (bits - 1);
	return (value & signBit) !== 0 ? value - (1 << bits) : value;
}

function getOamCellSize(shape: number, size: number, doubleSize: boolean): [number, number] {
	const [width, height] = OAM_DIMENSIONS[size][shape];
	return doubleSize ? [width * 2, height * 2] : [width, height];
}

function parseOamEntry(view: DataView, offset: number): NcerCebkImageCell {
	const obj0 = view.getUint16(offset, true);
	const obj1 = view.getUint16(offset + 2, true);
	const obj2 = view.getUint16(offset + 4, true);

	const rsFlag = (obj0 & 0x100) !== 0;
	const shape = (obj0 >> 14) & 0x3;
	const size = (obj1 >> 14) & 0x3;
	const doubleSize = rsFlag && (obj0 & 0x200) !== 0;

	return {
		y: signExtend(obj0 & 0xff, 8),
		x: signExtend(obj1 & 0x1ff, 9),
		rsFlag,
		disable: !rsFlag && (obj0 & 0x200) !== 0,
		doubleSize,
		objMode: (obj0 >> 10) & 0x3,
		mosaic: (obj0 & 0x1000) !== 0,
		depth: (obj0 & 0x2000) !== 0,
		shape,
		xFlip: !rsFlag && (obj1 & 0x1000) !== 0,
		yFlip: !rsFlag && (obj1 & 0x2000) !== 0,
		selectParam: rsFlag ? (obj1 >> 9) & 0x1f : 0,
		size: getOamCellSize(shape, size, doubleSize),
		tileOffset: obj2 & 0x03ff,
		priority: (obj2 >> 10) & 3,
		pal: (obj2 >> 12) & 0xf,
	};
}

export class ncer implements MKJSDataFormator {
	cebk!: NcerCebk;
	mainOff: number;
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
		if (header.stamp !== NCER_MAGIC) {
			throw `NCER invalid. Expected RECN, found ${header.stamp}`;
		}
		if (header.numSections < 1 || header.numSections > 3) {
			throw "NCER invalid. Too many sections - should have 1-3.";
		}

		this.sectionOffsets = header.sectionOffsets;
		this.sectionOffsets[0] = NCER_FIRST_SECTION_OFFSET;
		this.mainOff = 0;

		this.cebk = this._loadCEBK(view, this.sectionOffsets[0]);
	}

	private _loadCEBK(view: DataView, sectionOffset: number): NcerCebk {
		const header = this._parseCebkHeader(view, sectionOffset);
		const tableStart = sectionOffset - CEBK_BLOCK_HEADER_SIZE + CEBK_HEADER_SIZE;
		const tableEnd = tableStart + header.imageCount * (CEBK_IMAGE_ENTRY_SIZE + header.bankType * CEBK_EXTENDED_BOUNDS_SIZE);
		const images = this._readImageTable(view, tableStart, tableEnd, header.imageCount, header.bankType);

		let maxPartitionSize: number | undefined;
		let firstOffset: number | undefined;
		if (header.partitionDataOffset !== 0) {
			({ maxPartitionSize, firstOffset } = this._readPartitionData(view, sectionOffset, header.partitionDataOffset, images));
		}

		return {
			...header,
			images,
			maxPartitionSize,
			firstOffset,
		};
	}

	private _parseCebkHeader(view: DataView, sectionOffset: number): CebkHeader {
		const tagOffset = sectionOffset - CEBK_BLOCK_HEADER_SIZE;
		const type = MKSUtils.readAsciiTag(view, tagOffset);
		if (type !== CEBK_MAGIC) {
			throw `NCER invalid. Expected KBEC, found ${type}`;
		}

		return {
			type,
			blockSize: view.getUint32(tagOffset + 0x4, true),
			imageCount: view.getUint16(tagOffset + 0x8, true),
			bankType: view.getUint16(tagOffset + 0xa, true),
			unknown: view.getUint32(tagOffset + 0xc, true),
			boundarySize: view.getUint32(tagOffset + 0x10, true) * 64,
			partitionDataOffset: view.getUint32(tagOffset + 0x14, true),
		};
	}

	private _readImageTable(view: DataView, tableStart: number, tableEnd: number, imageCount: number, bankType: number): NcerCebkImage[] {
		const images: NcerCebkImage[] = [];
		let offset = tableStart;

		for (let i = 0; i < imageCount; i++) {
			const numCells = view.getUint16(offset, true);
			const readOnlyInfo = view.getUint16(offset + 0x2, true);
			const imageOffset = view.getInt32(offset + 0x4, true);
			offset += CEBK_IMAGE_ENTRY_SIZE;

			const image: NcerCebkImage = {
				offset: imageOffset,
				numCells,
				readOnlyInfo,
				cells: this._readOamCells(view, tableEnd + imageOffset, numCells),
			};

			if (bankType === CEBK_BANK_TYPE_EXTENDED) {
				image.xMax = view.getInt16(offset, true);
				image.yMax = view.getInt16(offset + 2, true);
				image.xMin = view.getInt16(offset + 4, true);
				image.yMin = view.getInt16(offset + 6, true);
				offset += CEBK_EXTENDED_BOUNDS_SIZE;
			}

			images.push(image);
		}

		return images;
	}

	private _readOamCells(view: DataView, offset: number, count: number): NcerCebkImageCell[] {
		const cells: NcerCebkImageCell[] = [];
		let cellOffset = offset;

		for (let i = 0; i < count; i++) {
			cells.push(parseOamEntry(view, cellOffset));
			cellOffset += OAM_ENTRY_SIZE;
		}

		return cells;
	}

	private _readPartitionData(
		view: DataView,
		sectionOffset: number,
		partitionDataOffset: number,
		images: NcerCebkImage[]
	): { maxPartitionSize: number; firstOffset: number } {
		let offset = sectionOffset + partitionDataOffset;
		const maxPartitionSize = view.getUint32(offset, true);
		const firstOffset = view.getUint32(offset + 4, true);
		offset += firstOffset;

		for (const image of images) {
			image.partitionOffset = view.getUint32(offset, true);
			image.partitionSize = view.getUint32(offset + 4, true);
			offset += 8;
		}

		return { maxPartitionSize, firstOffset };
	}
}
