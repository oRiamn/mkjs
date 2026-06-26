import { MKSUtils } from "./utils";

export const GRP_COLLISION_TYPES = ["None", "Sphere", "Spheroid", "Cylinder", "Box", "Custom"] as const;
export const GRP_MODEL_TYPES = ["None", "3D", "2D"] as const;

export type grpconfEntry = {
	objectId: number;
	has3DModel: number;
	nearClip: number;
	farClip: number;
	collisionType: number;
	width: number;
	height: number;
	depth: number;
};

export type emblemEntry = {
	width: number;
	height: number;
	flags: number;
	index: number;
};

export type tblKind = "grpconf" | "kart_appear" | "mission" | "emblem" | "unknown";

export class tbl implements MKJSDataFormator {
	input: MKJSDataInput;
	kind!: tblKind;
	entries: grpconfEntry[] = [];
	kartCount = 0;
	courseCount = 0;
	appear: number[] = [];
	missionRows = 0;
	missionCols = 0;
	missions: number[] = [];
	emblemCount = 0;
	emblems: emblemEntry[] = [];

	constructor(input: MKJSDataInput, filename?: string) {
		this.input = input;
		if (this.input != null) {
			this.load(this.input, filename);
		}
	}

	load(input: MKJSDataInput, filename?: string) {
		input = MKSUtils.prepareInput(input);
		this.input = input;
		const view = new DataView(input);
		const magic = readMagic4(view);
		const base = filename ? filename.substring(filename.lastIndexOf("/") + 1).toLowerCase() : "";

		if (magic === "NKKT" || base.endsWith(".ktbl")) {
			this.kind = "kart_appear";
			this.parseKartAppear(view);
			return;
		}
		if (magic === "NKMT" || base.endsWith(".mtbl")) {
			this.kind = "mission";
			this.parseMission(view);
			return;
		}
		if (base === "grpconf.tbl" || (input.byteLength % 16 === 0 && input.byteLength >= 16 && !looksLikeEmblem(view))) {
			this.kind = "grpconf";
			this.parseGrpconf(view);
			return;
		}
		if (base.endsWith(".tbl") && looksLikeEmblem(view)) {
			this.kind = "emblem";
			this.parseEmblem(view);
			return;
		}

		this.kind = "unknown";
	}

	private parseGrpconf(view: DataView) {
		const entrySize = 16;
		const count = Math.floor(view.byteLength / entrySize);
		this.entries = [];
		for (let i = 0; i < count; i++) {
			const off = i * entrySize;
			this.entries.push({
				objectId: view.getUint16(off, true),
				has3DModel: view.getUint16(off + 2, true),
				nearClip: view.getUint16(off + 4, true),
				farClip: view.getUint16(off + 6, true),
				collisionType: view.getUint16(off + 8, true),
				width: view.getUint16(off + 10, true),
				height: view.getUint16(off + 12, true),
				depth: view.getUint16(off + 14, true),
			});
		}
	}

	private parseKartAppear(view: DataView) {
		if (readMagic4(view) !== "NKKT") throw new Error("Not NKKT");
		this.kartCount = view.getUint8(4);
		this.courseCount = view.getUint8(5);
		const n = this.kartCount * this.courseCount;
		this.appear = [];
		for (let i = 0; i < n; i++) this.appear.push(view.getUint8(6 + i));
	}

	private parseMission(view: DataView) {
		if (readMagic4(view) !== "NKMT") throw new Error("Not NKMT");
		this.missionRows = view.getUint16(4, true);
		this.missionCols = view.getUint16(6, true);
		const n = this.missionRows * this.missionCols;
		this.missions = [];
		for (let i = 0; i < n; i++) this.missions.push(view.getUint8(8 + i));
	}

	private parseEmblem(view: DataView) {
		this.emblemCount = view.getUint32(0, true);
		if (this.emblemCount <= 0 || 4 + this.emblemCount * 8 > view.byteLength) {
			this.emblemCount = 0;
			this.emblems = [];
			return;
		}
		this.emblems = [];
		for (let i = 0; i < this.emblemCount; i++) {
			const off = 4 + i * 8;
			this.emblems.push({
				width: view.getUint16(off, true),
				height: view.getUint16(off + 2, true),
				flags: view.getUint16(off + 4, true),
				index: view.getUint16(off + 6, true),
			});
		}
	}

	getEntryByObjectId(id: number): grpconfEntry | null {
		for (let i = 0; i < this.entries.length; i++) {
			if (this.entries[i].objectId === id) return this.entries[i];
		}
		return null;
	}

	appearAt(kart: number, course: number): number {
		return this.appear[kart * this.courseCount + course] ?? 0;
	}

	missionAt(row: number, col: number): number {
		return this.missions[row * this.missionCols + col] ?? 0;
	}
}

function readMagic4(view: DataView): string {
	if (view.byteLength < 4) return "";
	let s = "";
	for (let i = 0; i < 4; i++) s += MKSUtils.asciiFromCharCode(view.getUint8(i));
	return s;
}

function looksLikeEmblem(view: DataView): boolean {
	if (view.byteLength < 12) return false;
	const count = view.getUint32(0, true);
	return count > 0 && count < 512 && 4 + count * 8 <= view.byteLength;
}
