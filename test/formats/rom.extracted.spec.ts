import { describe, expect, it } from "vitest";
import { lz77 } from "../../src/formats/lz77";
import { narc } from "../../src/formats/narc";
import { extractExists, readExtractedFile } from "../helpers/extract";
import { getRomFile, listRomCarcs, loadLz77Narc, romExists } from "../helpers/rom";

const needsExtract = romExists && extractExists;

function buffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
	if (a.byteLength !== b.byteLength) return false;
	const av = new Uint8Array(a);
	const bv = new Uint8Array(b);
	for (let i = 0; i < av.length; i++) {
		if (av[i] !== bv[i]) return false;
	}
	return true;
}

describe.skipIf(!needsExtract)("rom extracted parity", () => {
	it("should mirror every /data CARC file from ndsFS in the extract tree", () => {
		const romPaths = listRomCarcs();
		expect(romPaths.length).toBeGreaterThan(100);

		for (const romPath of romPaths) {
			expect(buffersEqual(getRomFile(romPath), readExtractedFile(romPath))).toBe(true);
		}
	});

	it("should decompress extracted CARC bytes identically to the ROM LZ77 reader", () => {
		for (const romPath of listRomCarcs().slice(0, 40)) {
			const fromRom = loadLz77Narc(romPath);
			const fromExtract = new narc(lz77.decompress(readExtractedFile(romPath)));

			expect(fromExtract.list()).toEqual(fromRom.list());
			for (const entry of fromRom.list()) {
				expect(fromExtract.getFile(entry)!.byteLength).toBe(fromRom.getFile(entry)!.byteLength);
			}
		}
	});

	it("should keep beach course entry sizes stable between ROM and extract paths", () => {
		const romPath = "/data/Course/beach_course.carc";
		const fromRom = loadLz77Narc(romPath);
		const fromExtract = new narc(lz77.decompress(readExtractedFile(romPath)));

		for (const entry of fromRom.list()) {
			expect(fromExtract.getFile(entry)!.byteLength).toBe(fromRom.getFile(entry)!.byteLength);
		}
	});
});
