#!/usr/bin/env node
/**
 * Analyze a ndstool extraction of Mario Kart DS:
 * - MapObj asset names (Main + MainRace CARCs)
 * - grpconf.tbl entries (indexed by object ID)
 * - OBJI object IDs used in every course NKM
 * - Cross-reference with mkjs ObjDatabase (via bundle.js in browser only — here: static map from objDatabase.ts parse)
 *
 * Usage:
 *   node scripts/analyze-mkds-objects.mjs [extract-dir]
 * Default extract-dir: test/nds-extract/out
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readFile(p) {
	return fs.readFileSync(p);
}

function lz77Decompress(buffer) {
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	if (view.byteLength < 4 || view.getUint8(0) !== 0x10) {
		return buffer;
	}
	const outSize = view.getUint32(1, true);
	const out = new Uint8Array(outSize);
	let src = 4;
	let dst = 0;
	while (dst < outSize && src < view.byteLength) {
		const flags = view.getUint8(src++);
		for (let bit = 0; bit < 8 && dst < outSize; bit++) {
			if (flags & (0x80 >> bit)) {
				const b1 = view.getUint8(src++);
				const b2 = view.getUint8(src++);
				const length = (b1 >> 4) + 3;
				const disp = ((b1 & 0x0f) << 8) | b2;
				let pos = dst - disp - 1;
				for (let i = 0; i < length; i++) {
					out[dst++] = out[pos++];
				}
			} else {
				out[dst++] = view.getUint8(src++);
			}
		}
	}
	return out;
}

function readChar(view, off) {
	const c = view.getUint8(off);
	return c === 0 ? "" : String.fromCharCode(c);
}

class Narc {
	constructor(buffer) {
		this.input = buffer;
		this.sections = {};
		this.load(buffer);
	}

	load(buffer) {
		const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
		const stamp = readChar(view, 0) + readChar(view, 1) + readChar(view, 2) + readChar(view, 3);
		if (stamp !== "NARC") throw new Error(`Not NARC: ${stamp}`);
		const headSize = view.getUint16(0xc, true);
		const numBlocks = view.getUint16(0xe, true);
		let off = headSize;
		for (let i = 0; i < numBlocks; i++) {
			const type = readChar(view, off) + readChar(view, off + 1) + readChar(view, off + 2) + readChar(view, off + 3);
			const size = view.getUint32(off + 4, true);
			const body = off + 8;
			if (type === "BTAF") {
				const numFiles = view.getUint16(body, true);
				const files = [];
				let fo = body + 4;
				for (let f = 0; f < numFiles; f++) {
					files.push({ start: view.getUint32(fo, true), end: view.getUint32(fo + 4, true) });
					fo += 8;
				}
				this.sections.BTAF = { files };
			} else if (type === "BTNF") {
				this.sections.BTNF = { directories: this.parseBtnf(view, body) };
			} else if (type === "GMIF") {
				this.sections.GMIF = { baseOff: body };
			}
			off += size;
		}
	}

	parseBtnf(view, soff) {
		const directories = [];
		const dirOff = soff + view.getUint32(soff, true);
		const firstFile = view.getUint16(soff + 4, true);
		const numDir = view.getUint16(soff + 6, true);
		const root = { firstFile, numDir, entries: [] };
		this.populateDir(view, dirOff, root);
		directories.push(root);
		let off = soff + 8;
		for (let i = 0; i < numDir - 1; i++) {
			const subDirOff = soff + view.getUint32(off, true);
			const subFirst = view.getUint16(off + 4, true);
			const sub = { firstFile: subFirst, parent: view.getUint16(off + 6, true), entries: [] };
			this.populateDir(view, subDirOff, sub);
			directories.push(sub);
			off += 8;
		}
		return directories;
	}

	populateDir(view, off, dir) {
		let curFile = dir.firstFile;
		while (true) {
			const flag = view.getUint8(off++);
			const len = flag & 127;
			if (!(flag & 128)) {
				if (len === 0) break;
				let name = "";
				for (let i = 0; i < len; i++) name += readChar(view, off++);
				dir.entries.push({ dir: false, id: curFile++, name });
			} else {
				let name = "";
				for (let i = 0; i < len; i++) name += readChar(view, off++);
				const dirID = view.getUint16(off, true);
				off += 2;
				dir.entries.push({ dir: true, id: dirID, name });
			}
		}
	}

	list(files = [], curDir = null, prefix = "/") {
		const table = this.sections.BTNF.directories;
		const dir = curDir ?? table[0].entries;
		for (const ent of dir) {
			if (ent.dir) {
				this.list(files, table[ent.id - 0xf000].entries, `${prefix}${ent.name}/`);
			} else {
				files.push(`${prefix}${ent.name}`);
			}
		}
		return files;
	}

	tryGetFile(name) {
		const table = this.sections.BTNF.directories;
		const parts = name.split("/").filter(Boolean);
		let curDir = table[0].entries;
		for (let i = 0; i < parts.length; i++) {
			let found = null;
			for (const ent of curDir) {
				if (ent.name === parts[i]) {
					found = ent;
					break;
				}
			}
			if (!found) return null;
			if (found.dir) {
				curDir = table[found.id - 0xf000].entries;
			} else {
				const file = this.sections.BTAF.files[found.id];
				const base = this.sections.GMIF.baseOff;
				return this.input.slice(base + file.start, base + file.end);
			}
		}
		return null;
	}
}

function openCarc(baseDir, relPath) {
	const raw = readFile(path.join(baseDir, relPath));
	return new Narc(lz77Decompress(raw));
}

/** grpconf.tbl: 16-byte entries (TCRF / GRPEdit community format). */
function parseGrpconf(buf) {
	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	const entrySize = 16;
	const count = Math.floor(view.byteLength / entrySize);
	const entries = [];
	for (let id = 0; id < count; id++) {
		const off = id * entrySize;
		entries.push({
			id,
			has3dmodel: view.getUint8(off),
			nearclip: view.getUint8(off + 1),
			farclip: view.getUint8(off + 2),
			collisionType: view.getUint8(off + 3),
			width: view.getInt16(off + 4, true),
			height: view.getInt16(off + 6, true),
			depth: view.getInt16(off + 8, true),
			unk: view.getUint32(off + 10, true),
		});
	}
	return entries;
}

function parseNkmObji(buf) {
	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	const read4 = (off) =>
		readChar(view, off) + readChar(view, off + 1) + readChar(view, off + 2) + readChar(view, off + 3);
	const stamp = read4(0);
	if (stamp !== "NKMD" && stamp !== "NKM ") throw new Error(`Not NKM: ${JSON.stringify(stamp)}`);
	const n = view.getUint16(6, true);
	const sections = {};
	let off = 8;
	for (let i = 0; i < (n - 8) / 4; i++) {
		const soff = view.getUint32(off, true);
		const secOff = soff + n;
		const type = read4(secOff);
		if (type === "STAG") {
			off += 4;
			continue;
		}
		if (type !== "OBJI") {
			off += 4;
			continue;
		}
		const entN = view.getUint32(secOff + 4, true);
		let eoff = secOff + 8;
		const entries = [];
		for (let j = 0; j < entN; j++) {
			const eoff = secOff + 8 + j * 0x3c;
			const ID = view.getUint16(eoff + 0x24, true);
			const routeID = view.getUint16(eoff + 0x26, true);
			const pos = [0, 0, 0];
			const angle = [0, 0, 0];
			const scale = [0, 0, 0];
			for (let k = 0; k < 3; k++) {
				pos[k] = view.getInt32(eoff + k * 4, true) / 4096;
				angle[k] = view.getInt32(eoff + 0xc + k * 4, true) / 4096;
				scale[k] = view.getInt32(eoff + 0x18 + k * 4, true) / 4096;
			}
			entries.push({
				ID,
				routeID,
				setting1: view.getUint32(eoff + 0x28, true),
				setting2: view.getUint32(eoff + 0x2c, true),
				setting3: view.getUint32(eoff + 0x30, true),
				setting4: view.getUint32(eoff + 0x34, true),
				pos,
				angle,
				scale,
			});
		}
		sections.OBJI = { count: entN, entries };
		off += 4;
	}
	return sections;
}

function loadObjDatabaseIds() {
	const src = fs.readFileSync(path.join(root, "src/entities/objDatabase.ts"), "utf8");
	const ids = new Map();
	for (const line of src.split("\n")) {
		const trimmed = line.trim();
		if (trimmed.startsWith("//")) continue;
		const m = trimmed.match(/^\[0x([0-9a-fA-F]+),\s*(\w+)\]/);
		if (m) ids.set(parseInt(m[1], 16), m[2]);
	}
	return ids;
}

function collectMapObjAssets(narc) {
	return narc
		.list()
		.filter((n) => n.startsWith("/MapObj/") || n.includes(".nsb"))
		.map((n) => n.replace(/^\//, ""));
}

function scanCourseObji(dataDir, verbose = false) {
	const courseDir = path.join(dataDir, "Course");
	const byId = new Map();
	let scanned = 0;
	let withNkm = 0;
	for (const file of fs.readdirSync(courseDir)) {
		if (!file.endsWith(".carc") || file.endsWith("Tex.carc") || file.endsWith("D.carc")) continue;
		const course = file.replace(/\.carc$/, "");
		let narc;
		try {
			narc = openCarc(dataDir, path.join("Course", file));
		} catch (e) {
			if (verbose) console.warn("skip", course, e.message);
			continue;
		}
		scanned++;
		const nkmBuf = narc.tryGetFile("/course_map.nkm");
		if (!nkmBuf) {
			if (verbose) {
				const hints = narc.list().filter((n) => n.toLowerCase().includes("nkm"));
				console.warn("no nkm", course, hints.slice(0, 5));
			}
			continue;
		}
		withNkm++;
		let sections;
		try {
			sections = parseNkmObji(nkmBuf);
		} catch (e) {
			if (verbose) console.warn("nkm parse", course, e.message);
			continue;
		}
		for (const obj of sections.OBJI?.entries ?? []) {
			const id = obj.ID;
			if (!byId.has(id)) {
				byId.set(id, { id, hex: `0x${id.toString(16).padStart(4, "0")}`, courses: [], count: 0, sample: obj });
			}
			const rec = byId.get(id);
			rec.count++;
			if (!rec.courses.includes(course)) rec.courses.push(course);
		}
	}
	if (verbose) console.log(`Courses scanned: ${scanned}, with NKM: ${withNkm}`);
	return [...byId.values()].sort((a, b) => a.id - b.id);
}

function main() {
	const args = process.argv.slice(2).filter((a) => a !== "--verbose");
	const verbose = process.argv.includes("--verbose");
	const extractDir = path.resolve(root, args[0] ?? "test/nds-extract/out");
	const dataDir = path.join(extractDir, "data", "data");
	if (!fs.existsSync(dataDir)) {
		console.error(`Data directory not found: ${dataDir}`);
		console.error("Run ndstool extract first (see Dockerfile.ndstool).");
		process.exit(1);
	}

	const objDb = loadObjDatabaseIds();
	const mainMapObj = openCarc(dataDir, "Main/MapObj.carc");
	const mainRace = openCarc(dataDir, "MainRace.carc");
	const assets = [...new Set([...collectMapObjAssets(mainMapObj), ...collectMapObjAssets(mainRace)])].sort();

	const grpBuf = mainRace.tryGetFile("/MapObj/grpconf.tbl");
	const grpconf = grpBuf ? parseGrpconf(grpBuf) : [];

	const objiScan = scanCourseObji(dataDir, verbose);

	const report = {
		generatedAt: new Date().toISOString(),
		extractDir,
		arm9: fs.existsSync(path.join(extractDir, "arm9.bin"))
			? { path: path.join(extractDir, "arm9.bin"), bytes: fs.statSync(path.join(extractDir, "arm9.bin")).size }
			: null,
		mapObjAssets: assets,
		grpconfEntryCount: grpconf.length,
		objiUniqueIds: objiScan.length,
		objects: objiScan.map((o) => ({
			id: o.id,
			hex: o.hex,
			mkjsClass: objDb.get(o.id) ?? null,
			inObjDatabase: objDb.has(o.id),
			usageCount: o.count,
			courses: o.courses.sort(),
			sample: o.sample,
			grpconf: grpconf[o.id] ?? null,
		})),
		unmappedInObjDatabase: objiScan.filter((o) => !objDb.has(o.id)).map((o) => o.hex),
		objDatabaseOnly: [...objDb.entries()]
			.filter(([id]) => !objiScan.some((o) => o.id === id))
			.map(([id, cls]) => ({ id, hex: `0x${id.toString(16).padStart(4, "0")}`, mkjsClass: cls })),
	};

	const outJson = path.join(extractDir, "object-id-report.json");
	fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

	console.log(`Wrote ${outJson}`);
	console.log(`MapObj assets: ${assets.length}`);
	console.log(`grpconf entries: ${grpconf.length}`);
	console.log(`Unique OBJI IDs in courses: ${objiScan.length}`);
	console.log(`Mapped in ObjDatabase: ${objiScan.filter((o) => objDb.has(o.id)).length}`);
	console.log(`Missing from ObjDatabase: ${report.unmappedInObjDatabase.length}`);
	if (report.unmappedInObjDatabase.length) {
		console.log("  ", report.unmappedInObjDatabase.slice(0, 20).join(", "), report.unmappedInObjDatabase.length > 20 ? "..." : "");
	}
}

main();
