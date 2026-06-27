import { describe, expect, it } from "vitest";
import { nscr } from "../../../src/formats/2d/nscr";
import { buildNitroFile } from "../../helpers/fixtures";
import { buildMinimalNscr } from "../../helpers/fixtures2d";
import { getRomFile, romExists } from "../../helpers/rom";

describe("nscr", () => {
	it("should reject invalid magic", () => {
		expect(() => new nscr(buildNitroFile("XXXX"))).toThrow(/NSCR invalid/);
	});

	it("should load screen metadata from a minimal NSCR file", () => {
		const screen = new nscr(buildMinimalNscr(256, 192));
		expect(screen.scrn.type).toBe("NRCS");
		expect(screen.scrn.screenWidth).toBe(256);
		expect(screen.scrn.screenHeight).toBe(192);
		expect(screen.scrn.data).toHaveLength(0);
	});
});

describe.skipIf(!romExists)("nscr from ROM", () => {
	it("should load the nitro cup selection screen layout", () => {
		const screen = new nscr(getRomFile("/data/CupPicture/select_cup_nitro01_m_picture.NSCR"));

		expect(screen.scrn.type).toBe("NRCS");
		expect(screen.scrn.screenWidth).toBe(256);
		expect(screen.scrn.screenHeight).toBe(256);
		expect(screen.scrn.data).toHaveLength(1024);
	});
});
