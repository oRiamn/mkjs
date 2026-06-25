import { describe, expect, it } from "vitest";
import { nsbca } from "../../src/formats/nsbca";
import { buildNitroFile } from "../helpers/fixtures";
import { getRomFile, loadCourseCarc, loadLz77Narc, romExists } from "../helpers/rom";

describe("nsbca", () => {
	it("should reject invalid magic", () => {
		expect(() => new nsbca(buildNitroFile("XXXX"))).toThrow(/NSBCA invalid/);
	});
});

describe.skipIf(!romExists)("nsbca from ROM", () => {
	it("should load the beach course water effect animation", () => {
		const course = loadCourseCarc();
		const anim = new nsbca(course.getFile("/MapObj/water_efct.nsbca")!);

		expect(anim.animData.numObjects).toBe(1);
		expect(anim.speeds.length).toBeGreaterThan(0);
	});

	it("should load Mario's victory animation from the menu data", () => {
		const anim = new nsbca(getRomFile("/data/KartModelMenu/character/mario/P_MR_win.nsbca"));

		expect(anim.animData.numObjects).toBe(1);
		expect(anim.speeds).toEqual([1, 0.5, 0.25]);
	});

	it("should load character animations from KartModelSub.carc", () => {
		const kartSub = loadLz77Narc("/data/KartModelSub.carc");
		const drive = new nsbca(kartSub.getFile("/character/mario/P_MR_drive.nsbca")!);

		expect(drive.animData.numObjects).toBeGreaterThan(0);
		expect(drive.speeds.length).toBeGreaterThan(0);
	});
});
