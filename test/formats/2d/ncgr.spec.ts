import { describe, expect, it } from "vitest";
import { ncgr } from "../../../src/formats/2d/ncgr";
import { buildNitroFile } from "../../helpers/fixtures";
import { buildMinimalNcgr } from "../../helpers/fixtures2d";
import { getRomFile, romExists } from "../../helpers/rom";

describe("ncgr", () => {
	it("should reject invalid magic", () => {
		expect(() => new ncgr(buildNitroFile("XXXX"))).toThrow(/NCGR invalid/);
	});

	it("should load tile data from a minimal NCGR file", () => {
		const tile = new Array(64).fill(0);
		tile[0] = 3;
		const graphics = new ncgr(buildMinimalNcgr(tile));
		expect(graphics.char.type).toBe("RAHC");
		expect(graphics.char.tiles).toHaveLength(1);
		expect(graphics.char.tiles[0][0]).toBe(3);
	});
});

describe.skipIf(!romExists)("ncgr from ROM", () => {
	it("should load the debug boot font tiles", () => {
		const graphics = new ncgr(getRomFile("/data/Boot/dbgfont.NCGR"));

		expect(graphics.char.type).toBe("RAHC");
		expect(graphics.char.tiles.length).toBe(1024);
	});

	it("should load cup selection banner graphics", () => {
		const graphics = new ncgr(getRomFile("/data/CupPicture/select_cup_nitro01_m_b.NCGR"));

		expect(graphics.char.tiles.length).toBe(110);
	});
});
