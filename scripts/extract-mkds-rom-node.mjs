#!/usr/bin/env node
/**
 * Extract Mario Kart DS ROM filesystem to disk without Docker/ndstool.
 * Layout matches ndstool: {out}/data/data/...
 *
 * Usage:
 *   node scripts/extract-mkds-rom-node.mjs [rom-path] [output-dir]
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readChar(view, off) {
	const c = view.getUint8(off);
	return c === 0 ? "" : String.fromCharCode(c);
}

function readString(view, offset, length) {
	let str = "";
	for (let i = 0; i < length; i++) {
		str += readChar(view, offset++);
	}
	return str;
}

function parseNameTable(view, offset) {
	const tableStart = offset;
	const directories = [];
	const rootDirOffset = tableStart + view.getUint32(offset, true);
	const rootFirstFile = view.getUint16(offset + 4, true);
	const numDirectories = view.getUint16(offset + 6, true);
	const root = { firstFile: rootFirstFile, numDir: numDirectories, entries: [] };
	populateDirectory(view, rootDirOffset, root);
	directories.push(root);
	offset += 8;
	for (let i = 1; i < numDirectories; i++) {
		const dirOffset = tableStart + view.getUint32(offset, true);
		const firstFile = view.getUint16(offset + 4, true);
		const parent = view.getUint16(offset + 6, true);
		const dir = { firstFile, parent, entries: [] };
		populateDirectory(view, dirOffset, dir);
		directories.push(dir);
		offset += 8;
	}
	return directories;
}

function populateDirectory(view, offset, dir) {
	let fileId = dir.firstFile;
	dir.entries = [];
	while (true) {
		const flag = view.getUint8(offset++);
		const nameLength = flag & 0x7f;
		if (!(flag & 0x80)) {
			if (nameLength === 0) return;
			dir.entries.push({ dir: false, id: fileId++, name: readString(view, offset, nameLength) });
			offset += nameLength;
		} else {
			const dirId = view.getUint16(offset + nameLength, true);
			dir.entries.push({ dir: true, id: dirId, name: readString(view, offset, nameLength) });
			offset += nameLength + 2;
		}
	}
}

function directoryEntries(directories, dirId) {
	return directories[dirId - 0xf000].entries;
}

function listFiles(directories, files = [], entries = null, currentPath = "/") {
	const dir = entries ?? directories[0].entries;
	for (const entry of dir) {
		if (entry.dir) {
			listFiles(directories, files, directoryEntries(directories, entry.id), `${currentPath}${entry.name}/`);
		} else {
			files.push({ path: `${currentPath}${entry.name}`, id: entry.id });
		}
	}
	return files;
}

function readRomFile(rom, view, fileTableOffset, id) {
	const off = fileTableOffset + id * 8;
	const start = view.getUint32(off, true);
	const end = view.getUint32(off + 4, true);
	return rom.subarray(start, end);
}

function extractRom(romPath, outDir) {
	const rom = fs.readFileSync(romPath);
	const view = new DataView(rom.buffer, rom.byteOffset, rom.byteLength);
	const nameTableOffset = view.getUint32(0x40, true);
	const fileTableOffset = view.getUint32(0x48, true);
	const directories = parseNameTable(view, nameTableOffset);
	const files = listFiles(directories);

	const dataRoot = path.join(outDir, "data", "data");
	let written = 0;
	for (const file of files) {
		if (!file.path.startsWith("/data/")) continue;
		const rel = file.path.slice("/data/".length);
		const dest = path.join(dataRoot, rel);
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		const payload = readRomFile(rom, view, fileTableOffset, file.id);
		fs.writeFileSync(dest, payload);
		written++;
	}

	return { written, total: files.length };
}

function main() {
	const romPath = path.resolve(root, process.argv[2] ?? "test/mkds.nds");
	const outDir = path.resolve(root, process.argv[3] ?? "test/nds-extract/out");

	if (!fs.existsSync(romPath)) {
		console.error(`ROM not found: ${romPath}`);
		process.exit(1);
	}

	fs.mkdirSync(outDir, { recursive: true });
	const { written, total } = extractRom(romPath, outDir);
	console.log(`Extracted ${written} files under ${path.join(outDir, "data", "data")} (${total} ROM entries total)`);

	const analyzeScript = path.join(root, "scripts/analyze-mkds-objects.mjs");
	if (fs.existsSync(analyzeScript)) {
		const result = spawnSync("node", [analyzeScript, outDir], { stdio: "inherit" });
		if (result.status !== 0) process.exit(result.status ?? 1);
	}
}

main();
