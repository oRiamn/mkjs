import { describe, expect, it } from "vitest";
import { kartoffsetdata } from "../../src/formats/kartoffsetdata";
import { zeroBuffer } from "../helpers/fixtures";
import { getRomFile, romExists } from "../helpers/rom";

describe("kartoffsetdata", () => {
	it("should read the expected number of kart entries", () => {
		const data = new kartoffsetdata(zeroBuffer(37 * (0x10 + 4 + 4 * 12 + 13 * 12)));
		expect(data.karts).toHaveLength(37);
	});

	it("should parse wheel and character offsets", () => {
		const buffer = zeroBuffer(37 * (0x10 + 4 + 4 * 12 + 13 * 12));
		const view = new DataView(buffer);
		const encoder = new TextEncoder();
		const name = encoder.encode("kart_tire_L");
		for (let i = 0; i < name.length; i++) {
			view.setUint8(i, name[i]!);
		}
		view.setInt32(0x10, 8192, true);
		view.setInt32(0x14, 4096, true);
		view.setInt32(0x18, 0, true);
		view.setInt32(0x20, 0, true);

		const data = new kartoffsetdata(buffer);
		expect(data.karts[0].name).toBe("kart_tire_L");
		expect(data.karts[0].frontTireSize).toBeCloseTo(2);
		expect(data.karts[0].wheels[0][0]).toBeCloseTo(1);
	});
});

describe.skipIf(!romExists)("kartoffsetdata from ROM", () => {
	it("should load all tire classes from kartoffsetdata.bin", () => {
		const data = new kartoffsetdata(getRomFile("/data/KartModelMenu/kartoffsetdata.bin"));

		expect(data.karts).toHaveLength(37);
		expect(new Set(data.karts.map((kart) => kart.name))).toEqual(new Set(["kart_tire_L", "kart_tire_M", "kart_tire_S"]));
	});

	it("should expose plausible wheel offsets for medium tires", () => {
		const data = new kartoffsetdata(getRomFile("/data/KartModelMenu/kartoffsetdata.bin"));
		const medium = data.karts.find((kart) => kart.name === "kart_tire_M")!;

		expect(medium.frontTireSize).toBeGreaterThan(0);
		expect(medium.frontTireSize).toBeLessThan(2);
		expect(medium.wheels[0][1]).toBeGreaterThan(0);
	});

	it("should expose four wheel slots and thirteen character offsets per kart", () => {
		const data = new kartoffsetdata(getRomFile("/data/KartModelMenu/kartoffsetdata.bin"));

		for (const kart of data.karts) {
			expect(kart.wheels).toHaveLength(4);
			expect(kart.chars).toHaveLength(13);
		}
	});
});
