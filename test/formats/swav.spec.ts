import { describe, expect, it } from "vitest";
import { swav } from "../../src/formats/swav";
import { BinaryWriter } from "../helpers/binary";
import { buildSwavPcm8 } from "../helpers/fixtures";
import { loadSdat, romExists } from "../helpers/rom";

describe("swav", () => {
	it("should decode PCM8 wave data", () => {
		const wave = new swav(buildSwavPcm8(8000, [127, 0, 64]), false, false);
		expect(wave.nSampleRate).toBe(8000);
		expect(wave.waveType).toBe(0);
		expect(wave.data.length).toBe(4);
		expect(wave.data[0]).toBeCloseTo(1);
		expect(wave.data[1]).toBeCloseTo(0);
	});

	it("should reject invalid sample rates", () => {
		const body = new BinaryWriter();
		body.writeU8(0);
		body.writeU8(0);
		body.writeU16(1000);
		body.writeU16(0);
		body.writeU16(0);
		body.writeU32(1);
		body.writeU8(0);
		expect(() => new swav(body.toArrayBuffer(), false, false)).toThrow(/BAD SAMPLE RATE/);
	});
});

describe.skipIf(!romExists)("swav from ROM", () => {
	it("should decode ADPCM samples from the SDAT wave bank", () => {
		const sample = loadSdat().sections.$INFO[3][0].arc.samples[0];

		expect(sample.nSampleRate).toBe(16004);
		expect(sample.waveType).toBe(2);
		expect(sample.data.length).toBeGreaterThan(100);
	});
});
