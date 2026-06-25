import { describe, expect, it } from "vitest";
import { nclr } from "../../../src/formats/2d/nclr";
import { buildMinimalNclr } from "../../helpers/fixtures2d";
import { buildNitroFile } from "../../helpers/fixtures";
import { getRomFile, romExists } from "../../helpers/rom";

describe("nclr", () => {
	it("should reject invalid magic", () => {
		expect(() => new nclr(buildNitroFile("XXXX"))).toThrow(/NCLR invalid/);
	});

	it("should load palette data from a minimal NCLR file", () => {
		const palette = new nclr(buildMinimalNclr([0x7fff]));
		expect(palette.pltt.type).toBe("TTLP");
		expect(palette.pltt.palettes).toHaveLength(1);
		expect(palette.pltt.palettes[0][0]).toEqual([255, 255, 255, 255]);
	});
});

describe.skipIf(!romExists)("nclr from ROM", () => {
	it("should load cup selection palettes", () => {
		const palette = new nclr(getRomFile("/data/CupPicture/select_cup_nitro01_m_b.NCLR"));

		expect(palette.pltt.type).toBe("TTLP");
		expect(palette.pltt.palettes).toHaveLength(16);
		expect(palette.pltt.palettes[0]).toHaveLength(16);
	});
});
