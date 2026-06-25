import { describe, expect, it } from "vitest";
import { kartphysicalparam } from "../../src/formats/kartphysicalparam";
import { zeroBuffer } from "../helpers/fixtures";
import { getRomFile, romExists } from "../helpers/rom";

describe("kartphysicalparam", () => {
	it("should read the expected number of kart physics entries", () => {
		const data = new kartphysicalparam(zeroBuffer(50 * 0x98));
		expect(data.karts).toHaveLength(50);
	});

	it("should parse scaled physics values", () => {
		const buffer = zeroBuffer(50 * 0x98);
		const view = new DataView(buffer);
		view.setInt32(0, 4096, true);
		view.setInt32(0x10, 8192, true);
		view.setInt16(0x30, 16384, true);

		const data = new kartphysicalparam(buffer);
		expect(data.karts[0].colRadius).toBeCloseTo(1);
		expect(data.karts[0].topSpeed).toBeCloseTo(2);
		expect(data.karts[0].turnRate).toBeCloseTo(Math.PI / 2);
	});
});

describe.skipIf(!romExists)("kartphysicalparam from ROM", () => {
	it("should load all character physics entries", () => {
		const data = new kartphysicalparam(getRomFile("/data/KartModelMenu/kartphysicalparam.bin"));
		expect(data.karts).toHaveLength(50);
	});

	it("should expose plausible MKDS kart stats", () => {
		const data = new kartphysicalparam(getRomFile("/data/KartModelMenu/kartphysicalparam.bin"));
		const stats = data.karts.map((kart) => kart.colRadius);
		const speeds = data.karts.map((kart) => kart.topSpeed);

		expect(Math.min(...stats)).toBeGreaterThanOrEqual(6);
		expect(Math.max(...stats)).toBeLessThanOrEqual(12);
		expect(Math.min(...speeds)).toBeGreaterThan(7);
		expect(Math.max(...speeds)).toBeLessThan(8);
		expect(data.karts[0].colRadius).toBeCloseTo(8);
	});

	it("should expose twelve collision presets per kart entry", () => {
		const data = new kartphysicalparam(getRomFile("/data/KartModelMenu/kartphysicalparam.bin"));

		for (const kart of data.karts) {
			expect(kart.colParam).toHaveLength(12);
			expect(kart.weight).toBeGreaterThan(0);
			expect(kart.turnRate).toBeGreaterThan(0);
			expect(kart.turnRate).toBeLessThan(Math.PI / 4);
		}
	});
});
