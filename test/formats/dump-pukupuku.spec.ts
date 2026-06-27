import { describe, expect, it } from "vitest";
import { nsbmd } from "../../src/formats/nsbmd";
import { nitroModel } from "../../src/render/nitroModel";
import { BEACH_COURSE, loadCourseCarc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("pukupuku model", () => {
	it("loads geometry, textures, and nitroModel", () => {
		const mdl = new nsbmd(loadCourseCarc(BEACH_COURSE).getFile("/MapObj/pukupuku.nsbmd")!);
		const obj = mdl.modelData.objectData[0];

		expect(obj.head).toMatchObject({ numTriangles: 0, numQuads: 1, numVerts: 4 });
		expect(obj.materials.numObjects).toBe(1);
		expect(obj.tex.numObjects).toBe(1);
		expect(mdl.modelData.names).toEqual(["pukupuku"]);

		const nm = new nitroModel(mdl, null);
		expect(nm.bmd).toBe(mdl);
	});
});
