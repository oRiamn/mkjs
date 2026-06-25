import { describe, expect, it } from "vitest";
import { nsbmd } from "../../src/formats/nsbmd";
import { modelPolyLocalYBounds, modelWorldYExtent } from "../../src/utils/modelLocalBounds";
import { loadCourseCarc, loadLz77Narc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("modelPolyLocalYBounds", () => {
	it("woodbox bounds are a compact cube, not minY=-8", () => {
		const arc = loadCourseCarc("town_course");
		const m = new nsbmd(arc.getFile("/MapObj/woodbox1.nsbmd")!);
		const poly = m.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalYBounds(poly.disp);
		const world = modelWorldYExtent(bounds.minY, bounds.maxY, 1);

		expect(bounds).toEqual({ minY: -0.625, maxY: 0.625 });
		expect(world).toEqual({ bottom: -10, top: 10, height: 20 });
	});

	it("itembox bounds stay small", () => {
		const mapObj = loadLz77Narc("/data/Main/MapObj.carc");
		const m = new nsbmd(mapObj.getFile("/itembox.nsbmd")!);
		const poly = m.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalYBounds(poly.disp);
		const world = modelWorldYExtent(bounds.minY, bounds.maxY, 1);

		expect(bounds).toEqual({ minY: -0.3125, maxY: 0.3125 });
		expect(world).toEqual({ bottom: -5, top: 5, height: 10 });
	});
});
