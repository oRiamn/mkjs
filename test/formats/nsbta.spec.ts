import { describe, expect, it } from "vitest";
import { nsbta } from "../../src/formats/nsbta";
import { buildNitroFile } from "../helpers/fixtures";
import { loadCourseCarc, romExists } from "../helpers/rom";

describe("nsbta", () => {
	it("should reject invalid magic", () => {
		expect(() => new nsbta(buildNitroFile("XXXX"))).toThrow(/NSBTA invalid/);
	});
});

describe.skipIf(!romExists)("nsbta from ROM", () => {
	it("should load the beach course texture matrix animation", () => {
		const course = loadCourseCarc();
		const animation = new nsbta(course.getFile("/course_model.nsbta")!);
		const track = animation.animData.objectData[0];

		expect(animation.animData.names).toEqual(["beach_course"]);
		expect(track.data.objectData[0].frames.length).toBe(5);
	});
});
