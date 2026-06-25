#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "test/nds-extract/out/data/data");

function readChar(view, off) {
	const c = view.getUint8(off);
	return c === 0 ? "" : String.fromCharCode(c);
}

function lz77Decompress(buffer) {
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	if (view.byteLength < 4 || view.getUint8(0) !== 0x10) return buffer;
	const out = new Uint8Array(view.getUint32(1, true));
	let src = 4;
	let dst = 0;
	while (dst < out.length && src < view.byteLength) {
		const flags = view.getUint8(src++);
		for (let bit = 0; bit < 8 && dst < out.length; bit++) {
			if (flags & (0x80 >> bit)) {
				const b1 = view.getUint8(src++);
				const b2 = view.getUint8(src++);
				const length = (b1 >> 4) + 3;
				const disp = ((b1 & 0x0f) << 8) | b2;
				let pos = dst - disp - 1;
				for (let i = 0; i < length; i++) out[dst++] = out[pos++];
			} else {
				out[dst++] = view.getUint8(src++);
			}
		}
	}
	return out;
}

class Narc {
	constructor(buffer) {
		this.input = buffer;
		this.sections = {};
		this.load(buffer);
	}
	load(buffer) {
		const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
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

function parseNkmObji(buf) {
	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	const read4 = (off) => readChar(view, off) + readChar(view, off + 1) + readChar(view, off + 2) + readChar(view, off + 3);
	const stamp = read4(0);
	if (stamp !== "NKMD" && stamp !== "NKM ") throw new Error(`Not NKM: ${stamp}`);
	const n = view.getUint16(6, true);
	let off = 8;
	for (let i = 0; i < (n - 8) / 4; i++) {
		const soff = view.getUint32(off, true);
		const secOff = soff + n;
		const type = read4(secOff);
		if (type !== "OBJI") {
			off += 4;
			continue;
		}
		const entN = view.getUint32(secOff + 4, true);
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
		return entries;
	}
	return [];
}

function openCarc(relPath) {
	return new Narc(lz77Decompress(fs.readFileSync(path.join(dataDir, relPath))));
}

const targetId = Number(process.argv[2] ?? 0x66);
const hits = [];

for (const file of fs.readdirSync(path.join(dataDir, "Course"))) {
	if (!file.endsWith(".carc") || file.endsWith("Tex.carc") || file.endsWith("D.carc")) continue;
	const course = file.replace(/\.carc$/, "");
	const narc = openCarc(path.join("Course", file));
	const nkm = narc.tryGetFile("/course_map.nkm");
	if (!nkm) continue;
	for (const obj of parseNkmObji(nkm)) {
		if (obj.ID === targetId) hits.push({ course, ...obj });
	}
}

// Award scene
for (const sceneFile of ["Scene/Award.carc"]) {
	const p = path.join(dataDir, sceneFile);
	if (!fs.existsSync(p)) continue;
	const narc = openCarc(sceneFile);
	const nkm = narc.tryGetFile("/course_map.nkm") ?? narc.tryGetFile("/map.nkm");
	if (!nkm) continue;
	for (const obj of parseNkmObji(nkm)) {
		if (obj.ID === targetId) hits.push({ course: "Award", ...obj });
	}
}

console.log(JSON.stringify(hits, null, 2));
