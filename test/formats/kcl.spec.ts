import { describe, expect, it } from "vitest";
import { kcl } from "../../src/formats/kcl";
import { buildMinimalKcl } from "../helpers/fixtures";
import { loadCourseCarc, romExists } from "../helpers/rom";
import { countInvalidKclPlaneRefs, loadCourseBundle, spawnPositionsOnCollision } from "../helpers/romCourse";

describe("kcl", () => {
	it("should load a minimal KCL collision file", () => {
		const collision = new kcl(buildMinimalKcl(), false);
		expect(collision.loaded).toBe(true);
		expect(collision.planes.length).toBeGreaterThanOrEqual(1);
	});

	it("should return no planes outside the collision bounds", () => {
		const collision = new kcl(buildMinimalKcl(), false);
		expect(collision.getPlanesAt(-1, 0, 0)).toEqual([]);
	});
});

describe.skipIf(!romExists)("kcl from ROM", () => {
	it("should load beach course collision with an octree and planes", () => {
		const course = loadCourseCarc();
		const collision = new kcl(course.getFile("/course_collision.kcl")!, false);

		expect(collision.loaded).toBe(true);
		expect(collision.planes.length).toBeGreaterThan(1000);
		expect(collision.octree.length).toBeGreaterThan(0);
		expect(collision.planes[1]?.Normal[1]).toBeCloseTo(1);
	});

	it("should return collision planes on the track surface", () => {
		const course = loadCourseCarc();
		const collision = new kcl(course.getFile("/course_collision.kcl")!, false);
		const planes = collision.getPlanesAt(-1000, 100, -1000);

		expect(planes.length).toBeGreaterThan(0);
		expect(planes[0].CollisionType).toBeGreaterThan(0);
	});

	it("should scale collision complexity with course size", () => {
		const bank = new kcl(loadCourseCarc("bank_course").getFile("/course_collision.kcl")!, false);
		const rainbow = new kcl(loadCourseCarc("rainbow_course").getFile("/course_collision.kcl")!, false);

		expect(bank.planes.length).toBe(726);
		expect(rainbow.planes.length).toBe(1488);
	});

	it("should keep octree triangle indices within the plane table on the beach course", () => {
		const { track, collision } = loadCourseBundle("beach_course");

		expect(countInvalidKclPlaneRefs(collision)).toBe(0);
		expect(spawnPositionsOnCollision(track, collision)).toBe(true);
	});

	it("should expose upward-facing ground planes on the beach course", () => {
		const collision = new kcl(loadCourseCarc().getFile("/course_collision.kcl")!, false);
		const groundPlanes = collision.planes.filter((plane) => plane != null && plane.Normal[1] > 0.5);

		expect(groundPlanes.length).toBeGreaterThan(100);
	});
});
