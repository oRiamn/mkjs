import { describe, expect, it } from "vitest";
import { nsbca } from "../../src/formats/nsbca";
import { nsbta } from "../../src/formats/nsbta";
import { nsbtp } from "../../src/formats/nsbtp";
import { COURSE_ANIM_TOTALS } from "../helpers/courseGeometryGolden";
import { loadCourseCarc, romExists } from "../helpers/rom";
import { ROM_COURSES } from "../helpers/romCourse";

describe.skipIf(!romExists)("course animations", () => {
	it("should parse every animation file shipped in course archives", () => {
		const totals = { nsbta: 0, nsbtp: 0, nsbca: 0 };

		for (const courseName of ROM_COURSES) {
			const archive = loadCourseCarc(courseName);

			for (const entry of archive.list()) {
				if (entry.endsWith(".nsbta")) {
					const anim = new nsbta(archive.getFile(entry)!);
					totals.nsbta++;
					expect(anim.animData.numObjects).toBeGreaterThan(0);
					expect(anim.animData.objectData[0].data.objectData[0].frames.length).toBeGreaterThan(0);
				} else if (entry.endsWith(".nsbtp")) {
					const anim = new nsbtp(archive.getFile(entry)!);
					totals.nsbtp++;
					const frames = anim.animData.objectData[0].data.objectData[0].frames;
					expect(frames.length).toBeGreaterThan(0);
					expect(frames.every((f) => f.texName.length > 0 && f.palName.length > 0)).toBe(true);
				} else if (entry.endsWith(".nsbca")) {
					const anim = new nsbca(archive.getFile(entry)!);
					totals.nsbca++;
					expect(anim.animData.numObjects).toBeGreaterThan(0);
					expect(anim.speeds.length).toBeGreaterThan(0);
				}
			}

			const courseAnim = archive.tryGetFile("/course_model.nsbta");
			if (courseAnim != null) {
				const anim = new nsbta(courseAnim);
				expect(anim.animData.numObjects).toBe(1);
			}
		}

		expect(totals).toEqual(COURSE_ANIM_TOTALS);
	});
});
