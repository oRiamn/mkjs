import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { narc } from "../../src/formats/narc";
import { ndsFS } from "../../src/formats/ndsFS";
import { nsbmd } from "../../src/formats/nsbmd";
import { buildNitroFile } from "../helpers/fixtures";
import { getRomFile, loadCourseCarc, loadLz77Narc, romExists } from "../helpers/rom";
import { ROM_CHARACTERS } from "../helpers/romCourse";
import { nsbtx } from "../../src/formats/nsbtx";

const NSMBDS_ROM = "test/nsmbds.nds";
const nsmbdsExists = existsSync(NSMBDS_ROM);

describe("nsbmd", () => {
	it("should reject invalid magic", () => {
		expect(() => new nsbmd(buildNitroFile("XXXX"))).toThrow(/NSBMD invalid/);
	});
});

describe.skipIf(!romExists)("nsbmd from ROM", () => {
	it("should load the beach course model", () => {
		const course = loadCourseCarc();
		const model = new nsbmd(course.getFile("/course_model.nsbmd")!);

		expect(model.modelData.numObjects).toBe(1);
		expect(model.modelData.names).toEqual(["beach_course"]);
		expect(model.modelData.objectData[0].head.numTriangles).toBeGreaterThan(100);
	});

	it("should load Mario's character model from the menu data", () => {
		const model = new nsbmd(getRomFile("/data/KartModelMenu/character/mario/P_MR.nsbmd"));
		const texture = new nsbtx(getRomFile("/data/KartModelMenu/character/mario/P_MR.nsbtx"));

		expect(model.modelData.numObjects).toBeGreaterThan(0);
		expect(model.modelData.names.some((name) => name.includes("MR") || name.includes("mario"))).toBe(true);
		expect(texture.textureInfo.numObjects).toBeGreaterThanOrEqual(1);
	});

	it("should load shared item models from MainRace.carc", () => {
		const mainRace = loadLz77Narc("/data/MainRace.carc");
		const banana = new nsbmd(mainRace.getFile("/Item/it_banana.nsbmd")!);
		const star = new nsbmd(mainRace.getFile("/Item/it_star.nsbmd")!);

		expect(banana.modelData.names).toEqual(["it_banana"]);
		expect(star.modelData.names).toEqual(["it_star"]);
	});

	it("should load shared map objects from MapObj.carc", () => {
		const mapObj = loadLz77Narc("/data/Main/MapObj.carc");
		const itembox = new nsbmd(mapObj.getFile("/itembox.nsbmd")!);

		expect(itembox.modelData.numObjects).toBeGreaterThan(0);
		expect(itembox.modelData.names).toContain("itembox");
	});

	it("should pair every menu character model with a texture archive", () => {
		for (const [slug, suffix] of ROM_CHARACTERS) {
			const model = new nsbmd(getRomFile(`/data/KartModelMenu/character/${slug}/P_${suffix}.nsbmd`));
			const texture = new nsbtx(getRomFile(`/data/KartModelMenu/character/${slug}/P_${suffix}.nsbtx`));

			expect(model.modelData.numObjects).toBeGreaterThan(0);
			expect(texture.textureInfo.numObjects).toBeGreaterThan(0);
		}
	});
});

describe.skipIf(!nsmbdsExists)("nsbmd from NSMB DS ROM", () => {
	it("should load LZ77-wrapped models from nested NARC archives", () => {
		const rom = new ndsFS(readFileSync(NSMBDS_ROM).buffer);
		const arc = new narc(rom.getFile("/ARCHIVE/ARC0.narc")!);
		const model = new nsbmd(arc.getFile("/ARC0/shadow_cylinder.nsbmd")!);

		expect(model.modelData.names).toContain("shadow_cylinder");
		expect(model.modelData.objectData[0].polys.numObjects).toBeGreaterThan(0);
	});
});
