import { describe, expect, it } from "vitest";
import { createMapObjResolver, resolveMapObj, resolveMapObjRelative, resolveMapObjShared } from "../../src/engine/mapObjResolver";
import { loadCourseCarc, loadLz77Narc, loadRomFS, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("mapObjResolver", () => {
	const rom = () => loadRomFS();
	const shared = () => ({
		mapObj: loadLz77Narc("/data/Main/MapObj.carc"),
		mainRace: loadLz77Narc("/data/MainRace.carc"),
	});

	it("resolves MapObj files from the current course first", () => {
		const course = loadCourseCarc("beach_course");
		expect(resolveMapObjRelative("BeachTree1.nsbmd", course)).not.toBeNull();
		expect(resolveMapObjShared("BeachTree1.nsbmd", shared())).toBeNull();
	});

	it("resolves shared Main/MapObj assets absolutely", () => {
		const course = loadCourseCarc("beach_course");
		expect(resolveMapObjRelative("itembox.nsbmd", course)).toBeNull();
		expect(resolveMapObjShared("itembox.nsbmd", shared())).not.toBeNull();
	});

	it("resolves MainRace item assets absolutely", () => {
		const course = loadCourseCarc("beach_course");
		const ctx = createMapObjResolver(rom(), course, shared(), "beach_course");
		expect(resolveMapObj("Item/it_koura_g.nsbmd", ctx)).not.toBeNull();
	});

	it("finds basabasa on clock_course via the ROM course pool", () => {
		const course = loadCourseCarc("clock_course");
		expect(course.tryGetFile("/MapObj/basabasa.nsbmd")).toBeNull();

		const ctx = createMapObjResolver(rom(), course, shared(), "clock_course");
		expect(resolveMapObj("basabasa.nsbmd", ctx)).not.toBeNull();
		expect(resolveMapObj("basabasa.nsbtp", ctx)).not.toBeNull();
	});

	it("finds flipper animations for donkey_course via the ROM course pool", () => {
		const course = loadCourseCarc("donkey_course");
		const ctx = createMapObjResolver(rom(), course, shared(), "donkey_course");

		expect(resolveMapObj("flipper.nsbmd", ctx)).not.toBeNull();
		expect(resolveMapObj("flipper.nsbta", ctx)).not.toBeNull();
		expect(resolveMapObj("flipper.nsbtp", ctx)).not.toBeNull();
	});

	it("returns null for assets missing from the entire ROM", () => {
		const course = loadCourseCarc("mini_dokan_gc");
		const ctx = createMapObjResolver(rom(), course, shared(), "mini_dokan_gc");
		expect(resolveMapObj("donkytree2GC.nsbmd", ctx)).toBeNull();
	});
});
