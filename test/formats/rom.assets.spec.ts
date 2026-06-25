import { describe, expect, it } from "vitest";
import { nsbmd } from "../../src/formats/nsbmd";
import { loadLz77Narc, loadSdat, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("rom items and audio", () => {
	it("should load every item model referenced by MainRace.carc", () => {
		const mainRace = loadLz77Narc("/data/MainRace.carc");
		const itemModels = mainRace.list().filter((path) => path.startsWith("/Item/") && path.endsWith(".nsbmd"));

		expect(itemModels.length).toBeGreaterThanOrEqual(10);

		for (const path of itemModels) {
			const model = new nsbmd(mainRace.getFile(path)!);
			const baseName = path.split("/").pop()!.replace(".nsbmd", "");

			expect(model.modelData.numObjects).toBeGreaterThan(0);
			expect(model.modelData.names[0]).toBe(baseName);
		}
	});

	it("should keep SDAT sequence banks within the indexed instrument table", () => {
		const sound = loadSdat();
		const sequences = sound.sections.$INFO[0];
		const bankCount = sound.sections.$INFO[2].length;

		expect(sequences.every((entry) => entry.bank < bankCount)).toBe(true);
		expect(sequences.every((entry) => entry.seq.data.length > 0)).toBe(true);
	});

	it("should keep SDAT wave archives populated with playable samples", () => {
		const sound = loadSdat();
		const waveArchives = sound.sections.$INFO[3];
		const populated = waveArchives.filter((entry) => entry.arc.samples.length > 0);

		expect(populated.length).toBeGreaterThan(waveArchives.length - 2);
		expect(populated.every((entry) => entry.arc.samples.every((sample) => sample.nSampleRate > 0 && sample.data.length > 0))).toBe(
			true
		);
	});

	it("should keep SSAR entries wired to non-empty embedded sequences", () => {
		const sound = loadSdat();

		for (const archiveEntry of sound.sections.$INFO[1]) {
			const archive = archiveEntry.arc;
			expect(archive.entries.length).toBeGreaterThan(0);
			expect(archive.entries.every((entry) => entry.seq.data.length > 0)).toBe(true);
		}
	});
});
