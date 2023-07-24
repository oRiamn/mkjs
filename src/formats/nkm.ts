//
// nkm.js
//--------------------
// Loads nkm files and provides a variety of functions for accessing and using the data.
// 
// nkm files usually drive the game logic of tracks (checkpoints, ai waypoints, objects on track) so it's pretty
// crucial to have this up and running.
//
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
//

import { MKSUtils } from "./utils"

export type nkm_section_OBJI = {
	ID: number,
	routeID: number,
	setting1: number,
	setting2: number,
	setting3: number,
	setting4: number,
	timeTrials: number,
	nextOff: number,
	scale: vec3,
	pos: vec3,
	angle: vec3
}

export type nkm_section_PATH = {
	routeID: number,
	loop: number,
	numPts: number,
	nextOff: number,
}

export type nkm_section_POIT = {
	pos: vec3,
	pointInd: number,
	duration: number,
	unknown: number,
	nextOff: number,
}

export type nkm_section_KTPS = {
	pos: vec3,
	angle: vec3
	id1: number,
	id2: number,
	nextOff: number,
}

export type nkm_section_KTPJ = {
	pos: vec3,
	angle: vec3
	id1: number,
	id2: number,
	respawnID: number,
	nextOff: number,
}

export type nkm_section_CPOI = {
	x1: number,
	z1: number,
	x2: number,
	z2: number,
	sinus: number,
	cosinus: number,
	distance: number,
	nextSection: number,
	currentSection: number,
	keyPoint: number,
	respawn: number,
	unknown: number,
	nextOff: number,
}

export type nkm_section_CPAT = {
	startInd: number,
	pathLen: number,
	dest: number[],
	source: number[],
	sectionOrder: number,
	nextOff: number,
}

export type nkm_section_MEPA = {
	startInd: number,
	pathLen: number,
	dest: number[],
	source: number[],
	nextOff: number,
}

export type nkm_section_IPOI = {
	pos: vec3,
	unknown1: number,
	unknown2: number,
	unknown3: number,
	unknown4: number,
	unknown5: number,
	nextOff: number,
}

export type nkm_section_EPOI = {
	pos: vec3,
	pointSize: number,
	cpuDrift: number,
	unknown1: number,
	unknown2: number,
	nextOff: number,
}

export type nkm_section_MEPO = {
	pos: vec3,
	pointSize: number,
	cpuDrift: number,
	unknown1: number,
	unknown2: number,
	nextOff: number
}

export type nkm_section_AREA = {
	pos: vec3,
	dimensions: vec3,
	came: number,
	one: number,
	nextOff: number,
}

export type nkm_section_CAME = {
	pos1: vec3,
	pos2: vec3,
	pos3: vec3,
	angle: vec3,
	zoomSpeedM1: number,
	zoomStart: number,
	zoomEnd: number,
	zoomSpeedM2: number,
	zoomMark1: number,
	zoomMark2: number,
	zoomSpeed: number,
	camType: number,
	camRoute: number,
	routeSpeed: number,
	pointSpeed: number,
	duration: number,
	nextCam: number,
	firstCam: number,
	one: number,
	nextOff: number,
}

type nkm_STAGObj = {
	courseID: number,
	laps: number,
	unknown: number,
	fogEnable: number,
	fogMode: number,
	fogSlope: number,
	fogDist: number,
	fogCol: number[],
	fogAlpha: number,
	kclCol: number[][],
}


type SectionContent = nkm_section_CAME | nkm_section_AREA | nkm_section_MEPO | nkm_section_EPOI | nkm_section_IPOI | nkm_section_MEPA | nkm_section_CPAT | nkm_section_CPOI | nkm_section_KTPJ | nkm_section_KTPS | nkm_section_POIT | nkm_section_PATH | nkm_section_OBJI;
type SectionObj = {
	type: string,
	entries?: SectionContent[]
}

type Section<T extends SectionContent> = {
	type: string,
	entries: T[]
}


export type nkm_Section = {
	OBJI: Section<nkm_section_OBJI>,
	PATH: Section<nkm_section_PATH>,
	POIT: Section<nkm_section_POIT>,
	KTPS: Section<nkm_section_KTPS>,
	KTPJ: Section<nkm_section_KTPJ>,
	CPOI: Section<nkm_section_CPOI>,
	CPAT: Section<nkm_section_CPAT>,
	MEPA: Section<nkm_section_MEPA>,
	IPOI: Section<nkm_section_IPOI>,
	EPOI: Section<nkm_section_EPOI>,
	MEPO: Section<nkm_section_MEPO>,
	AREA: Section<nkm_section_AREA>,
	CAME: Section<nkm_section_CAME>,
	KTP2: Section<nkm_section_KTPS>,
	KTPC: Section<nkm_section_KTPS>,
	KTPM: Section<nkm_section_KTPS>,
	IPAT: Section<nkm_section_CPAT>
	EPAT: Section<nkm_section_CPAT>
};

export class nkm implements MKJSDataFormator {
	input: MKJSDataInput;
	view: DataView;
	handlers: {
		[x: string]: (view: DataView, off: number) => SectionContent;
	};
	sections: nkm_Section;
	stamp: string;
	version: number;
	constructor(input: MKJSDataInput) {

		this.input = input;
		//todo, support versions for other games (MKWii etc)
		//this.mkwii = mkwii;

		this.load = this.load;
		this.handlers = {};

		this.handlers["OBJI"] = (view: DataView, off: number): nkm_section_OBJI => {
			const pos = vec3.create();
			pos[0] = view.getInt32(off, true) / 4096;
			pos[1] = view.getInt32(off + 4, true) / 4096;
			pos[2] = view.getInt32(off + 8, true) / 4096;

			const angle = vec3.create();
			angle[0] = view.getInt32(off + 0xC, true) / 4096;
			angle[1] = view.getInt32(off + 0x10, true) / 4096;
			angle[2] = view.getInt32(off + 0x14, true) / 4096;

			const scale = vec3.create();
			scale[0] = view.getInt32(off + 0x18, true) / 4096;
			scale[1] = view.getInt32(off + 0x1C, true) / 4096;
			scale[2] = view.getInt32(off + 0x20, true) / 4096;

			const ID = view.getUint16(off + 0x24, true);
			const routeID = view.getUint16(off + 0x26, true);
			const setting1 = view.getUint32(off + 0x28, true);
			const setting2 = view.getUint32(off + 0x2C, true);
			const setting3 = view.getUint32(off + 0x30, true);
			const setting4 = view.getUint32(off + 0x34, true);
			const timeTrials = view.getUint32(off + 0x38, true);
			const nextOff = off + 0x3C;
			return {
				ID,
				routeID,
				setting1,
				setting2,
				setting3,
				setting4,
				timeTrials,
				nextOff,
				scale,
				pos,
				angle,
			};
		}

		this.handlers["PATH"] = (view: DataView, off: number): nkm_section_PATH => {
			const routeID = view.getUint8(off);
			const loop = view.getUint8(off + 1);
			const numPts = view.getUint16(off + 2, true);
			const nextOff = off + 0x4;
			return {
				routeID,
				loop,
				numPts,
				nextOff,
			};
		}

		this.handlers["POIT"] = (view: DataView, off: number): nkm_section_POIT => {
			const pos = vec3.create();
			pos[0] = view.getInt32(off, true) / 4096;
			pos[1] = view.getInt32(off + 4, true) / 4096;
			pos[2] = view.getInt32(off + 8, true) / 4096;

			const pointInd = view.getUint16(off + 0xC, true);
			const duration = view.getUint16(off + 0xE, true);
			const unknown = view.getUint32(off + 0x10, true);
			const nextOff = off + 0x14;
			return {
				pos,
				pointInd,
				duration,
				unknown,
				nextOff,
			};
		}

		this.handlers["KTPS"] = (view: DataView, off: number): nkm_section_KTPS => { //start positions
			const pos = vec3.create();
			pos[0] = view.getInt32(off, true) / 4096;
			pos[1] = view.getInt32(off + 4, true) / 4096;
			pos[2] = view.getInt32(off + 8, true) / 4096;

			const angle = vec3.create();
			angle[0] = view.getInt32(off + 0xC, true) / 4096;
			angle[1] = view.getInt32(off + 0x10, true) / 4096;
			angle[2] = view.getInt32(off + 0x14, true) / 4096;

			const id1 = view.getInt16(off + 0x18, true);
			const id2 = view.getInt16(off + 0x1A, true);
			const nextOff = off + 0x1C;

			return {
				pos,
				angle,
				id1,
				id2,
				nextOff,
			};
		}

		this.handlers["KTPJ"] = (view: DataView, off: number): nkm_section_KTPJ => {
			const pos = vec3.create();
			pos[0] = view.getInt32(off, true) / 4096;
			pos[1] = view.getInt32(off + 4, true) / 4096;
			pos[2] = view.getInt32(off + 8, true) / 4096;

			const angle = vec3.create();
			angle[0] = view.getInt32(off + 0xC, true) / 4096;
			angle[1] = view.getInt32(off + 0x10, true) / 4096;
			angle[2] = view.getInt32(off + 0x14, true) / 4096;

			const id1 = view.getInt16(off + 0x18, true);
			const id2 = view.getInt16(off + 0x1A, true);

			//respawn points. id1 is cpu route, id2 is item route
			const respawnID = view.getInt32(off + 0x1C, true);
			const nextOff = off + 0x1C + 0x4;
			return {
				pos,
				angle,
				id1,
				id2,
				respawnID,
				nextOff
			};
		};

		this.handlers["CPOI"] = (view: DataView, off: number): nkm_section_CPOI => {
			const x1 = view.getInt32(off, true) / 4096;
			const z1 = view.getInt32(off + 0x4, true) / 4096;
			const x2 = view.getInt32(off + 0x8, true) / 4096;
			const z2 = view.getInt32(off + 0xC, true) / 4096;
			const sinus = view.getInt32(off + 0x10, true) / 4096;
			const cosinus = view.getInt32(off + 0x14, true) / 4096;
			const distance = view.getInt32(off + 0x18, true) / 4096;

			const nextSection = view.getInt16(off + 0x1C, true);
			const currentSection = view.getInt16(off + 0x1E, true);
			const keyPoint = view.getInt16(off + 0x20, true);
			const respawn = view.getUint8(off + 0x22);
			const unknown = view.getUint8(off + 0x23);
			const nextOff = off + 0x24;
			return {
				x1,
				z1,
				x2,
				z2,
				sinus,
				cosinus,
				distance,
				nextSection,
				currentSection,
				keyPoint,
				respawn,
				unknown,
				nextOff,
			};
		}

		this.handlers["CPAT"] = (view: DataView, off: number): nkm_section_CPAT => { //checkpoint path
			const startInd = view.getInt16(off, true);
			const pathLen = view.getInt16(off + 0x2, true);
			const dest = [view.getInt8(off + 0x4)];

			var tmp = view.getInt8(off + 0x5)
			if (tmp != -1) dest.push(tmp);

			var tmp2 = view.getInt8(off + 0x6)
			if (tmp2 != -1) dest.push(tmp2);

			const source = [view.getInt8(off + 0x7)];

			var tmp3 = view.getInt8(off + 0x8)
			if (tmp3 != -1) source.push(tmp3);

			var tmp4 = view.getInt8(off + 0x9)
			if (tmp4 != -1) source.push(tmp4);

			const sectionOrder = view.getInt16(off + 0xA, true);

			const nextOff = off + 0xC;
			return {
				startInd,
				pathLen,
				dest,
				source,
				sectionOrder,
				nextOff,
			};
		}

		this.handlers["MEPA"] = (view: DataView, off: number): nkm_section_MEPA => { //checkpoint path
			const startInd = view.getInt16(off, true);
			const pathLen = view.getInt16(off + 0x2, true);
			const dest = [];
			var o = off + 4;
			for (var i = 0; i < 8; i++) {
				var tmp = view.getInt8(o++);
				if (tmp != -1) dest.push(tmp);
			}
			const source = [];
			for (var i = 0; i < 8; i++) {
				var tmp = view.getInt8(o++);
				if (tmp != -1) source.push(tmp);
			}
			const nextOff = o;
			return {
				startInd,
				pathLen,
				dest,
				source,
				nextOff,
			};
		}

		this.handlers["IPOI"] = (view: DataView, off: number): nkm_section_IPOI => {
			const pos = vec3.create();
			pos[0] = view.getInt32(off, true) / 4096;
			pos[1] = view.getInt32(off + 4, true) / 4096;
			pos[2] = view.getInt32(off + 8, true) / 4096;
			const unknown1 = view.getUint8(off + 0xC); //tends to be 0 or FF
			const unknown2 = view.getUint8(off + 0xD);
			const unknown3 = view.getUint8(off + 0xE);
			const unknown4 = view.getUint8(off + 0xF);
			const unknown5 = view.getUint32(off + 0x10, true); //tends to be 0
			const nextOff = off + 0x14;
			return {
				pos,
				unknown1,
				unknown2,
				unknown3,
				unknown4,
				unknown5,
				nextOff,
			};
		}

		this.handlers["EPOI"] = (view: DataView, off: number): nkm_section_EPOI => {
			const pos = vec3.create();
			pos[0] = view.getInt32(off, true) / 4096;
			pos[1] = view.getInt32(off + 4, true) / 4096;
			pos[2] = view.getInt32(off + 8, true) / 4096;
			const pointSize = view.getInt32(off + 0xC, true) / 4096;
			const cpuDrift = view.getUint16(off + 0x10, true); //will find out what this means in due time, a watcher on this value while a cpu is going around the track should clear things up.
			const unknown1 = view.getUint16(off + 0x12, true); //tends to be 0
			const unknown2 = view.getUint32(off + 0x14, true); //tends to be 0
			const nextOff = off + 0x18;

			return {
				pos,
				pointSize,
				cpuDrift,
				unknown1,
				unknown2,
				nextOff,
			};
		}

		this.handlers["MEPO"] = (view: DataView, off: number): nkm_section_MEPO => { //theres usually 5 of these LOL!!! im not sorry
			const pos = vec3.create();
			pos[0] = view.getInt32(off, true) / 4096;
			pos[1] = view.getInt32(off + 4, true) / 4096;
			pos[2] = view.getInt32(off + 8, true) / 4096;

			const pointSize = view.getInt32(off + 0xC, true) / 4096;
			const cpuDrift = view.getUint16(off + 0x10, true); //will find out what this means in due time, a watcher on this value while a cpu is going around the track should clear things up.
			const unknown1 = view.getUint16(off + 0x12, true); //tends to be 0
			const unknown2 = view.getUint32(off + 0x14, true); //tends to be 0

			const nextOff = off + 0x18;
			return {
				pos,
				pointSize,
				cpuDrift,
				unknown1,
				unknown2,
				nextOff
			};
		}

		this.handlers["AREA"] = (view: DataView, off: number): nkm_section_AREA => { //area for cameras. this section is ridiculous - will need thorough investigation if we want to get race spectate cameras working.
			const pos = vec3.create();
			pos[0] = view.getInt32(off, true) / 4096;
			pos[1] = view.getInt32(off + 4, true) / 4096;
			pos[2] = view.getInt32(off + 8, true) / 4096;
			const dimensions = vec3.create();
			dimensions[0] = view.getInt32(off + 0xC, true) / 4096;
			dimensions[1] = view.getInt32(off + 0x10, true) / 4096;
			dimensions[2] = view.getInt32(off + 0x14, true) / 4096;

			//44 bytes of unknown, ouch!

			const came = view.getUint8(off + 0x43);
			const one = view.getUint32(off + 0x44, true); //good ole one
			const nextOff = off + 0x48;
			return {
				pos,
				dimensions,
				came,
				one,
				nextOff,
			};
		}

		this.handlers["CAME"] = (view: DataView, off: number): nkm_section_CAME => { //cameras. not really much known about these right now.
			const pos1 = vec3.create();
			pos1[0] = view.getInt32(off, true) / 4096;
			pos1[1] = view.getInt32(off + 4, true) / 4096;
			pos1[2] = view.getInt32(off + 8, true) / 4096;

			const angle = vec3.create();
			angle[0] = view.getInt32(off + 0xC, true) / 4096;
			angle[1] = view.getInt32(off + 0x10, true) / 4096;
			angle[2] = view.getInt32(off + 0x14, true) / 4096;

			const pos2 = vec3.create();
			pos2[0] = view.getInt32(off + 0x18, true) / 4096;
			pos2[1] = view.getInt32(off + 0x1C, true) / 4096;
			pos2[2] = view.getInt32(off + 0x20, true) / 4096;

			const pos3 = vec3.create();
			pos3[0] = view.getInt32(off + 0x24, true) / 4096;
			pos3[1] = view.getInt32(off + 0x28, true) / 4096;
			pos3[2] = view.getInt32(off + 0x2C, true) / 4096;

			//44 bytes of unknown, ouch!

			const zoomSpeedM1 = view.getInt16(off + 0x30, true) / 4096;
			const zoomStart = view.getInt16(off + 0x32, true) / 4096; //alters zoom somehow
			const zoomEnd = view.getInt16(off + 0x34, true) / 4096;
			const zoomSpeedM2 = view.getInt16(off + 0x36, true) / 4096;
			const zoomMark1 = view.getInt16(off + 0x38, true) / 4096; //zoom speed changes at zoom marks
			const zoomMark2 = view.getInt16(off + 0x3A, true) / 4096;
			const zoomSpeed = view.getInt16(off + 0x3C, true) / 4096;
			const camType = view.getInt16(off + 0x3E, true);
			const camRoute = view.getInt16(off + 0x40, true);
			const routeSpeed = view.getInt16(off + 0x42, true);
			const pointSpeed = view.getInt16(off + 0x44, true);
			const duration = view.getInt16(off + 0x46, true);
			const nextCam = view.getInt16(off + 0x48, true);
			const firstCam = view.getUint8(off + 0x4A);
			const one = view.getUint8(off + 0x4B); //tends to be 1 if cam type is 5
			const nextOff = off + 0x4C;
			return {
				pos1,
				pos2,
				pos3,
				angle,
				zoomSpeedM1,
				zoomStart,
				zoomEnd,
				zoomSpeedM2,
				zoomMark1,
				zoomMark2,
				zoomSpeed,
				camType,
				camRoute,
				routeSpeed,
				pointSpeed,
				duration,
				nextCam,
				firstCam,
				one,
				nextOff,
			};
		}

		this.handlers["KTP2"] = this.handlers["KTPS"]; //must pass this point for lap to count. ids irrelevant

		this.handlers["KTPC"] = this.handlers["KTPS"]; //cannon positions. id1 is cpu route, id2 is cannon id 
		this.handlers["KTPM"] = this.handlers["KTPS"]; //mission kart position. must pass for mission to succeed.

		this.handlers["IPAT"] = this.handlers["CPAT"]; //item path
		this.handlers["EPAT"] = this.handlers["CPAT"]; //enemy path

		if (this.input != null) {
			if (typeof this.input == "string") {
				var xml = new XMLHttpRequest();
				xml.responseType = "arraybuffer";
				xml.open("GET", this.input, true);
				xml.onload = () => {
					this.load(xml.response);
				}
				xml.send();
			} else {
				this.load(this.input);
			}
		}
	}


	load(buffer: MKJSDataInput) {
		var view = new DataView(buffer);
		this.stamp = MKSUtils.asciireadChar(view, 0x0) + MKSUtils.asciireadChar(view, 0x1) + MKSUtils.asciireadChar(view, 0x2) + MKSUtils.asciireadChar(view, 0x3);
		this.version = view.getUint16(0x4, true);
		var n = view.getUint16(0x6, true);
		var off = 8;
		this.sections = {
			OBJI: undefined,
			PATH: undefined,
			POIT: undefined,
			KTPS: undefined,
			KTPJ: undefined,
			CPOI: undefined,
			CPAT: undefined,
			MEPA: undefined,
			IPOI: undefined,
			EPOI: undefined,
			MEPO: undefined,
			AREA: undefined,
			CAME: undefined,
			KTP2: undefined,
			KTPC: undefined,
			KTPM: undefined,
			IPAT: undefined,
			EPAT: undefined,
		};

		for (var i = 0; i < (n - 8) / 4; i++) {
			var soff = view.getUint32(off, true);
			var section = this._readSection(view, soff + n);
			if (Object.prototype.hasOwnProperty.call(this.sections, section.type)) {
				const t = section.type as unknown as keyof nkm_Section;
				(this.sections[t] as unknown) = section;
			}
			off += 4;
		}
	}

	_readSTAG(view: DataView, off: number): nkm_STAGObj {
		const courseID = view.getUint16(off + 0x4, true);
		const laps = view.getUint16(off + 0x6, true); //doubles as battle mode duration
		const unknown = view.getUint8(off + 0x8);
		const fogEnable = view.getUint8(off + 0x9);
		const fogMode = view.getUint8(off + 0xA);
		const fogSlope = view.getUint8(off + 0xB);

		//skip 8 bytes of unknown, probably more fog stuff. (disabled for now)

		const fogDist = view.getInt32(off + 0x14, true) / 4096;
		const fogCol = this._readRGB(view, off + 0x18);
		const fogAlpha = view.getUint16(off + 0x1A, true);

		const kclCol = [
			this._readRGB(view, off + 0x1C),
			this._readRGB(view, off + 0x1E),
			this._readRGB(view, off + 0x20),
			this._readRGB(view, off + 0x22)
		];

		//unknown 8 bytes again
		return {
			courseID,
			laps,
			unknown,
			fogEnable,
			fogMode,
			fogSlope,
			fogDist,
			fogCol,
			fogAlpha,
			kclCol,
		};
	}


	_readSection(view: DataView, off: number): SectionObj {
		const type = MKSUtils.asciireadChar(view, off + 0x0) + MKSUtils.asciireadChar(view, off + 0x1) + MKSUtils.asciireadChar(view, off + 0x2) + MKSUtils.asciireadChar(view, off + 0x3);
		if (type == "STAG") {
			const stagobj = this._readSTAG(view, off);
			return {
				type,
				...stagobj
			};
		} else {
			var handler = this.handlers[type];
			var obj: SectionObj = {
				type,
				entries: []
			};
			if (handler == null) {
				console.error("Unknown NKM section type " + type + "!");
				return obj;
			}
			var entN = view.getUint32(off + 0x4, true);
			off += 0x8;
			for (var i = 0; i < entN; i++) {
				var item = handler(view, off);
				obj.entries.push(item);
				off = item.nextOff;
			}
			return obj;
		}

	}

	_readRGB(view: DataView, offset: number) {
		var dat = view.getUint16(offset, true);
		var col = [dat & 31, (dat >> 5) & 31, (dat >> 10) & 31];
		return col;
	}
}