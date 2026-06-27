import { describe, expect, it } from "vitest";
import { sbnk } from "../../src/formats/sbnk";
import { ssar } from "../../src/formats/ssar";
import { sseq } from "../../src/formats/sseq";
import { swar } from "../../src/formats/swar";
import { loadSdat, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("sdat full sweep", () => {
	it("should parse every indexed sequence, bank, wave archive and sequence archive", () => {
		const sound = loadSdat();
		const sequences = sound.sections.$INFO[0];
		const seqArchives = sound.sections.$INFO[1];
		const banks = sound.sections.$INFO[2];
		const waveArchives = sound.sections.$INFO[3];

		expect(sequences).toHaveLength(76);
		expect(seqArchives).toHaveLength(5);
		expect(banks).toHaveLength(99);
		expect(waveArchives).toHaveLength(104);

		for (const entry of sequences) {
			expect(entry.seq).toBeInstanceOf(sseq);
			expect(entry.seq.data.length).toBeGreaterThan(0);
			expect(entry.bank).toBeLessThan(banks.length);
		}

		for (const entry of banks) {
			expect(entry.bank).toBeInstanceOf(sbnk);
			expect(entry.bank.instruments.length).toBeGreaterThanOrEqual(0);
		}

		for (const entry of waveArchives) {
			expect(entry.arc).toBeInstanceOf(swar);
			for (const sample of entry.arc.samples) {
				expect(sample.nSampleRate).toBeGreaterThan(0);
				expect(sample.data.length).toBeGreaterThan(0);
			}
		}

		for (const entry of seqArchives) {
			expect(entry.arc).toBeInstanceOf(ssar);
			expect(entry.arc.entries.length).toBeGreaterThan(0);
			expect(entry.arc.entries.every((e) => e.seq.data.length > 0)).toBe(true);
		}
	});

	it("should decode representative ADPCM samples from wave archives", () => {
		const samples = loadSdat().sections.$INFO[3].flatMap((entry) => entry.arc.samples);
		const adpcm = samples[0];

		expect(samples.length).toBeGreaterThan(100);
		expect(samples.every((sample) => sample.waveType === 2)).toBe(true);
		expect(adpcm.nSampleRate).toBe(16004);
		expect(adpcm.data.length).toBeGreaterThan(1000);
	});

	it("should keep stable bytecode sizes for anchor sequences", () => {
		const sequences = loadSdat().sections.$INFO[0];

		expect(sequences[0].seq.data.length).toBe(11288);
		expect(sequences[15].seq.data.length).toBe(11476);
		expect(sequences[75].seq.data.length).toBeGreaterThan(0);
	});
});
