import { describe, expect, it } from "vitest";
import { nsbmd } from "../../src/formats/nsbmd";
import { COURSE_GEOMETRY_GOLDEN } from "../helpers/courseGeometryGolden";
import { loadCourseCarc, romExists } from "../helpers/rom";
import { ROM_COURSES } from "../helpers/romCourse";

describe.skipIf(!romExists)("course model geometry", () => {
	it("should keep stable triangle, quad and vertex counts for every course model", () => {
		for (const courseName of ROM_COURSES) {
			const model = new nsbmd(loadCourseCarc(courseName).getFile("/course_model.nsbmd")!);
			const obj = model.modelData.objectData[0];
			const golden = COURSE_GEOMETRY_GOLDEN[courseName];

			expect({
				tris: obj.head.numTriangles,
				quads: obj.head.numQuads,
				verts: obj.head.numVerts,
				models: model.modelData.numObjects,
			}).toEqual(golden);
			expect(obj.head.numTriangles + obj.head.numQuads).toBeGreaterThan(0);
			expect(obj.head.numVerts).toBeGreaterThan(100);
		}
	});

	it("should load every MapObj model referenced by a course archive", () => {
		for (const courseName of ROM_COURSES) {
			const archive = loadCourseCarc(courseName);
			const mapObjModels = archive.list().filter((p) => p.startsWith("/MapObj/") && p.endsWith(".nsbmd"));

			for (const path of mapObjModels) {
				const model = new nsbmd(archive.getFile(path)!);
				const obj = model.modelData.objectData[0];
				expect(model.modelData.numObjects).toBeGreaterThan(0);
				expect(obj.head.numTriangles + obj.head.numQuads).toBeGreaterThan(0);
			}
		}
	});
});
