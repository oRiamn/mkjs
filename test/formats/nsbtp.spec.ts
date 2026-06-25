import { describe, expect, it } from "vitest";
import { nsbtp } from "../../src/formats/nsbtp";
import { buildNitroFile } from "../helpers/fixtures";
import { loadCourseCarc, romExists } from "../helpers/rom";

describe("nsbtp", () => {
	it("should reject invalid magic", () => {
		expect(() => new nsbtp(buildNitroFile("XXXX"))).toThrow(/NSBTP invalid/);
	});
});

describe.skipIf(!romExists)("nsbtp from ROM", () => {
	it("should load the crab texture pattern animation", () => {
		const course = loadCourseCarc();
		const animation = new nsbtp(course.getFile("/MapObj/crab.nsbtp")!);

		expect(animation.animData.numObjects).toBe(1);
		expect(animation.animData.names).toEqual(["crab"]);
	});
});
