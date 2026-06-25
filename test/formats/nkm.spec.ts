import { describe, expect, it } from "vitest";
import { nkm } from "../../src/formats/nkm";
import { buildMinimalNkm } from "../helpers/fixtures";
import { BEACH_COURSE, loadCourseCarc, romExists } from "../helpers/rom";
import { ROM_COURSES, hasValidCheckpointLinks, isBattleCourse, sumPathPoints } from "../helpers/romCourse";

describe("nkm", () => {
	it("should load a minimal NKM file", () => {
		const track = new nkm(buildMinimalNkm());
		expect(track.stamp).toBe("NKMD");
		expect(track.version).toBe(1);
	});
});

describe.skipIf(!romExists)("nkm from ROM", () => {
	it("should load beach course track metadata", () => {
		const course = loadCourseCarc();
		const track = new nkm(course.getFile("/course_map.nkm")!);

		expect(track.stamp).toBe("NKMD");
		expect(track.version).toBe(37);
		expect(track.sections.KTPS.entries).toHaveLength(1);
		expect(track.sections.CPOI.entries.length).toBe(27);
		expect(track.sections.OBJI.entries.length).toBe(44);
		expect(track.sections.PATH.entries.length).toBe(14);
	});

	it("should expose a start grid position on the beach course", () => {
		const course = loadCourseCarc();
		const track = new nkm(course.getFile("/course_map.nkm")!);
		const start = track.sections.KTPS.entries[0];

		expect(start.pos[0]).toBeCloseTo(-1719.5);
		expect(start.pos[1]).toBeCloseTo(130);
		expect(start.pos[2]).toBeCloseTo(-445);
		expect(start.angle[1]).toBeCloseTo(180);
	});

	it("should keep beach course path routes aligned with path points", () => {
		const track = new nkm(loadCourseCarc().getFile("/course_map.nkm")!);

		expect(sumPathPoints(track)).toBe(77);
		expect(track.sections.POIT.entries.length).toBe(77);
		expect(hasValidCheckpointLinks(track)).toBe(true);
	});

	it("should model battle arenas with eight spawns and no checkpoints", () => {
		for (const courseName of ROM_COURSES.filter(isBattleCourse)) {
			const track = new nkm(loadCourseCarc(courseName).getFile("/course_map.nkm")!);
			expect(track.sections.KTPS.entries).toHaveLength(8);
			expect(track.sections.CPOI.entries).toHaveLength(0);
		}
	});

	it("should scale checkpoint counts with track length", () => {
		const bank = new nkm(loadCourseCarc("bank_course").getFile("/course_map.nkm")!);
		const rainbow = new nkm(loadCourseCarc("rainbow_course").getFile("/course_map.nkm")!);

		expect(bank.sections.CPOI.entries.length).toBe(17);
		expect(rainbow.sections.CPOI.entries.length).toBe(42);
		expect(rainbow.sections.CPOI.entries.length).toBeGreaterThan(bank.sections.CPOI.entries.length);
	});

	it("should keep object placements within sane scale on the beach course", () => {
		const track = new nkm(loadCourseCarc(BEACH_COURSE).getFile("/course_map.nkm")!);

		for (const object of track.sections.OBJI.entries) {
			expect(object.scale[0]).toBeGreaterThan(0);
			expect(object.scale[1]).toBeGreaterThan(0);
			expect(object.scale[2]).toBeGreaterThan(0);
		}
	});
});
