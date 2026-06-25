import { describe, expect, it } from "vitest";
import { nftr } from "../../src/formats/nftr";
import { buildNitroFile } from "../helpers/fixtures";
import { loadLz77Narc, romExists } from "../helpers/rom";

describe("nftr", () => {
	it("should reject invalid magic", () => {
		expect(() => new nftr(buildNitroFile("XXXX"))).toThrow(/NFTR invalid/);
	});
});

describe.skipIf(!romExists)("nftr from ROM", () => {
	it("should load the Mario font from Main2D.carc", () => {
		const main2d = loadLz77Narc("/data/Main2D.carc");
		const font = new nftr(main2d.getFile("marioFont.NFTR")!);

		expect(font.info.height).toBe(13);
		expect(font.info.width).toBe(12);
		expect(Object.keys(font.charMap).length).toBeGreaterThan(80);
		expect(font.charMap).toHaveProperty("A");
		expect(font.charMap).toHaveProperty("0");
	});
});
