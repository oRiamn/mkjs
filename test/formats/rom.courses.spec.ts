import { describe, expect, it } from "vitest";
import { nsbmd } from "../../src/formats/nsbmd";
import { nsbtx } from "../../src/formats/nsbtx";
import { loadCourseTexCarc, romExists } from "../helpers/rom";
import {
	ROM_COURSES,
	countInvalidKclPlaneRefs,
	hasValidCheckpointLinks,
	isBattleCourse,
	loadCourseBundle,
	spawnPositionsOnCollision,
	sumPathPoints,
} from "../helpers/romCourse";

describe.skipIf(!romExists)("rom courses", () => {
	it("should keep race and battle courses structurally distinct", () => {
		for (const courseName of ROM_COURSES) {
			const { track } = loadCourseBundle(courseName);

			if (isBattleCourse(courseName)) {
				expect(track.sections.KTPS.entries).toHaveLength(8);
				expect(track.sections.CPOI.entries).toHaveLength(0);
			} else {
				expect(track.sections.KTPS.entries).toHaveLength(1);
				expect(track.sections.CPOI.entries.length).toBeGreaterThanOrEqual(10);
			}
		}
	});

	it("should place every spawn grid on collision geometry", () => {
		for (const courseName of ROM_COURSES) {
			const { track, collision } = loadCourseBundle(courseName);
			expect(spawnPositionsOnCollision(track, collision)).toBe(true);
		}
	});

	it("should keep AI path definitions aligned with path points", () => {
		for (const courseName of ROM_COURSES) {
			const { track } = loadCourseBundle(courseName);
			expect(sumPathPoints(track)).toBe(track.sections.POIT.entries.length);
		}
	});

	it("should keep checkpoint links within each race course", () => {
		for (const courseName of ROM_COURSES) {
			if (isBattleCourse(courseName)) {
				continue;
			}

			const { track } = loadCourseBundle(courseName);
			const checkpoints = track.sections.CPOI.entries;

			expect(checkpoints.length).toBeGreaterThan(0);
			expect(checkpoints[0].currentSection).toBe(0);
			expect(checkpoints.every((checkpoint) => checkpoint.distance >= -1)).toBe(true);
		}
	});

	it("should keep beach course checkpoint links inside the local section table", () => {
		const { track } = loadCourseBundle("beach_course");
		expect(hasValidCheckpointLinks(track)).toBe(true);
	});

	it("should reference only valid collision planes in the octree", () => {
		for (const courseName of ROM_COURSES) {
			const { collision } = loadCourseBundle(courseName);
			expect(countInvalidKclPlaneRefs(collision)).toBe(0);
		}
	});

	it("should pair every course model with a loadable texture archive", () => {
		for (const courseName of ROM_COURSES) {
			const { archive } = loadCourseBundle(courseName);
			const textures = loadCourseTexCarc(courseName);

			const model = new nsbmd(archive.getFile("/course_model.nsbmd")!);
			const tex = new nsbtx(textures.getFile("/course_model.nsbtx")!);

			expect(model.modelData.numObjects).toBeGreaterThan(0);
			expect(tex.textureInfo.numObjects).toBeGreaterThan(0);
		}
	});
});
