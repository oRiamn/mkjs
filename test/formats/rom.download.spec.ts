import { describe, expect, it } from "vitest";
import { kcl } from "../../src/formats/kcl";
import { nkm } from "../../src/formats/nkm";
import { nsbmd } from "../../src/formats/nsbmd";
import { COURSE_D_VARIANTS, loadCourseCarc, loadCourseDCarc, romExists } from "../helpers/rom";
import { spawnPositionsOnCollision } from "../helpers/romCourse";

describe.skipIf(!romExists)("rom download-play courses", () => {
	it("should load D variants with track and collision data", () => {
		for (const courseName of COURSE_D_VARIANTS) {
			const archive = loadCourseDCarc(courseName);
			const track = new nkm(archive.getFile("/course_map.nkm")!);
			const collision = new kcl(archive.getFile("/course_collision.kcl")!, false);

			expect(track.stamp).toBe("NKMD");
			expect(track.version).toBe(37);
			expect(collision.loaded).toBe(true);
			expect(spawnPositionsOnCollision(track, collision)).toBe(true);
		}
	});

	it("should omit mission-only tools from the beach D variant", () => {
		const full = loadCourseCarc("beach_course");
		const download = loadCourseDCarc("beach_course");

		expect(full.tryGetFile("/MissionRun/mr11_tool.nkm")).not.toBeNull();
		expect(download.tryGetFile("/MissionRun/mr11_tool.nkm")).toBeNull();
		expect(download.list().length).toBeLessThan(full.list().length);
	});

	it("should load vertex-color course models when present", () => {
		const archive = loadCourseCarc("beach_course");
		const model = new nsbmd(archive.getFile("/course_model_V.nsbmd")!);

		expect(model.modelData.names).toEqual(["beach_course_V"]);
		expect(model.modelData.objectData[0].head.numTriangles).toBeGreaterThan(0);
	});
});
