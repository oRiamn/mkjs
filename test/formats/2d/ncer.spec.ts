import { describe, expect, it } from "vitest";
import { ncer } from "../../../src/formats/2d/ncer";
import { buildNitroFile } from "../../helpers/fixtures";
import { buildMinimalNcer } from "../../helpers/fixtures2d";
import { loadLz77Narc, romExists } from "../../helpers/rom";

describe("ncer", () => {
	it("should reject invalid magic", () => {
		expect(() => new ncer(buildNitroFile("XXXX"))).toThrow(/NCER invalid/);
	});

	it("should load an empty cell bank from a minimal NCER file", () => {
		const cells = new ncer(buildMinimalNcer());
		expect(cells.cebk.type).toBe("KBEC");
		expect(cells.cebk.imageCount).toBe(0);
		expect(cells.cebk.images).toHaveLength(0);
	});
});

describe.skipIf(!romExists)("ncer from ROM", () => {
	it("should load the race HUD cell bank from Race.carc", () => {
		const race = loadLz77Narc("/data/Scene/Race.carc");
		const cells = new ncer(race.getFile("/race_m.NCER")!);

		expect(cells.cebk.type).toBe("KBEC");
		expect(cells.cebk.imageCount).toBe(57);
		expect(cells.cebk.images.every((image) => image.cells.length >= 0)).toBe(true);
	});
});
