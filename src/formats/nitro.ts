//
// nitro.js
//--------------------
// General purpose functions for nitro formats, eg. NSBTX or NSBMD
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
//

import { MKSUtils } from "./utils";

export type nitro_nextoff = {
	nextoff: number;
	name?: string;
};

export type nitro_nitroHeader = {
	stamp: string;
	numSections: number;
	sectionOffsets: number[];
	unknown1: number;
	filesize: number;
	headsize: number;
};

export type nitro_nitroInfos<Type> = {
	numObjects: number;
	unknown: number;
	objectUnk: { uk1: number; uk2: number }[];
	objectData: Type[];
	names: string[];
	nextoff: number;
};

export type nitro_read3dInfo_dataHandler<Type extends nitro_nextoff> = (view: DataView, offset: number, baseOff: number, i: number) => Type;

export class nitro {
	static readHeader(view: DataView): nitro_nitroHeader {
		//input: DataView with base offset at header position
		let stamp = nitro.readChar(view, 0x0) + nitro.readChar(view, 0x1) + nitro.readChar(view, 0x2) + nitro.readChar(view, 0x3);
		let unknown1 = view.getUint32(0x4, true);
		let filesize = view.getUint32(0x8, true);
		let headsize = view.getUint16(0xc, true);
		let numSections = view.getUint16(0xe, true);
		let sectionOffsets: number[] = [];
		for (let i = 0; i < numSections; i++) {
			sectionOffsets.push(view.getUint32(0x10 + i * 4, true));
		}
		return {
			stamp: stamp,
			unknown1: unknown1,
			filesize: filesize,
			headsize: headsize,
			numSections: numSections,
			sectionOffsets: sectionOffsets,
		};
	}

	static read3dInfo<Type extends nitro_nextoff>(
		view: DataView,
		offset: number,
		dataHandler: nitro_read3dInfo_dataHandler<Type>
	): nitro_nitroInfos<Type> {
		let baseOff = offset;
		offset += 1; //skip dummy
		let numObjects = view.getUint8(offset++);
		view.getUint16(offset, true);
		offset += 2;
		//unknown block. documentation out of 10
		view.getUint16(offset, true);
		offset += 2;
		view.getUint16(offset, true);
		offset += 2;
		let unknown = view.getUint32(offset, true); //usually 0x0000017F
		offset += 4;
		let objectUnk = [];
		for (let i = 0; i < numObjects; i++) {
			let uk1 = view.getUint16(offset, true);
			let uk2 = view.getUint16(offset + 2, true);
			objectUnk.push({ uk1: uk1, uk2: uk2 });
			offset += 4;
		}
		//info block
		view.getUint16(offset, true);
		offset += 2;
		view.getUint16(offset, true);
		offset += 2;
		let objectData: Type[] = [];
		for (let i = 0; i < numObjects; i++) {
			let data = dataHandler(view, offset, baseOff, i); //must return object with "nextoff" as offset after reading data
			objectData.push(data);
			offset = data.nextoff;
		}

		let names = [];
		for (let i = 0; i < numObjects; i++) {
			let name = "";
			for (let j = 0; j < 16; j++) {
				name += nitro.readChar(view, offset++);
			}
			objectData[i].name = name;
			names.push(name);
		}

		return {
			numObjects: numObjects,
			unknown: unknown,
			objectUnk: objectUnk,
			objectData: objectData,
			names: names,
			nextoff: offset,
		};
	}

	static readChar(view: DataView, offset: number): string {
		return MKSUtils.asciireadChar(view, offset);
	}
}
