import { describe, expect, it } from "vitest";
import { sdat } from "../../src/formats/sdat";
import { loadSdat, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("sdat from ROM", () => {
	it("should index the MKDS sound archive", () => {
		const sound = loadSdat();

		expect(sound.sections["$FAT "].length).toBe(284);
		expect(sound.sections.$INFO[0]).toHaveLength(76);
		expect(sound.sections.$INFO[1]).toHaveLength(5);
		expect(sound.sections.$INFO[2]).toHaveLength(99);
		expect(sound.sections.$INFO[3]).toHaveLength(104);
	});

	it("should embed playable sequence, bank and wave data", () => {
		const sound = loadSdat();
		const sequence = sound.sections.$INFO[0][15];
		const bank = sound.sections.$INFO[2][0].bank;
		const waveArchive = sound.sections.$INFO[3][0].arc;

		expect(sequence.seq.data.length).toBe(11476);
		expect(sequence.bank).toBe(51);
		expect(bank.instruments.length).toBe(93);
		expect(waveArchive.samples.length).toBe(90);
		expect(waveArchive.samples[0].nSampleRate).toBe(16004);
	});

	it("should load sequence archives with hundreds of entries", () => {
		const sound = loadSdat();
		const archive = sound.sections.$INFO[1][0].arc;

		expect(archive.entries.length).toBeGreaterThan(500);
		expect(archive.entries[0].seq.data.length).toBeGreaterThan(0);
		expect(archive.data.length).toBeGreaterThan(10_000);
	});

	it("should keep FAT table entries aligned with embedded file payloads", () => {
		const sound = loadSdat();
		const fat = sound.sections["$FAT "];

		expect(fat.length).toBe(284);
		expect(fat.every((entry) => entry.size > 0)).toBe(true);
		expect(fat.every((entry) => entry.off >= 0)).toBe(true);

		const uniqueOffsets = new Set(fat.map((entry) => entry.off));
		expect(uniqueOffsets.size).toBe(fat.length);
	});

	it("should reject invalid SDAT data", () => {
		expect(() => new sdat(new ArrayBuffer(16))).toThrow(/SDAT invalid/);
	});
});
