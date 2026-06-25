import { describe, expect, it } from "vitest";
import { nsbmd } from "../../src/formats/nsbmd";
import { nitroModel } from "../../src/render/nitroModel";
import { loadCourseCarc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("old_mario_gc textures", () => {
	it("should load direct-color materials without a palette name", () => {
		const courseMdl = new nsbmd(loadCourseCarc("old_mario_gc").getFile("/course_model.nsbmd")!);
		expect(courseMdl.tex).toBeDefined();

		const model = new nitroModel(courseMdl, courseMdl.tex!);
		// @ts-expect-error inspect private texture slots
		const texSlots = model._tex as unknown[];
		expect(texSlots.every((tex) => tex != null)).toBe(true);
	});
});
