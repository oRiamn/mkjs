import { describe, expect, it } from "vitest";
import { swar } from "../../src/formats/swar";
import { BinaryWriter } from "../helpers/binary";
import { buildSdatBlock } from "../helpers/fixtures";
import { loadSdat, romExists } from "../helpers/rom";

describe("swar", () => {
	it("should load an empty SWAR wave archive", () => {
		const body = new BinaryWriter();
		body.writeZeros(36);
		body.writeU32(0);
		const file = buildSdatBlock("SWAR", body);
		const archive = new swar(file);
		expect(archive.samples).toHaveLength(0);
	});
});

describe.skipIf(!romExists)("swar from ROM", () => {
	it("should load ADPCM samples from sound_data.sdat", () => {
		const archive = loadSdat().sections.$INFO[3][0].arc;

		expect(archive.samples.length).toBe(90);
		expect(archive.samples[0].nSampleRate).toBe(16004);
		expect(archive.samples[0].data.length).toBeGreaterThan(0);
	});
});
