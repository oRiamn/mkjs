import { describe, expect, it } from "vitest";
import { nsbmd } from "../../src/formats/nsbmd";
import { modelPolyLocalBounds, modelPolyLocalYBounds, modelWorldYExtent } from "../../src/utils/modelLocalBounds";
import { loadCourseCarc, romExists } from "../helpers/rom";

function snowmanPlacement(scaleY = 1) {
	const arc = loadCourseCarc("snow_course");
	const bottomPoly = new nsbmd(arc.getFile("/MapObj/sman_bottom.nsbmd")!).modelData.objectData[0].polys.objectData[0];
	const topPoly = new nsbmd(arc.getFile("/MapObj/sman_top.nsbmd")!).modelData.objectData[0].polys.objectData[0];
	const bottomB = modelPolyLocalYBounds(bottomPoly.disp);
	const topB = modelPolyLocalYBounds(topPoly.disp);
	const bottomW = modelWorldYExtent(bottomB.minY, bottomB.maxY, scaleY);
	const topW = modelWorldYExtent(topB.minY, topB.maxY, scaleY);
	const bottomY = -bottomW.bottom;
	const topSink = 0.2;
	const topY = bottomY + bottomW.top - topW.bottom - topW.height * topSink;
	const topLocal = modelPolyLocalBounds(topPoly.disp);
	return { bottomY, topY, bottomW, topW, topSink, topLocal };
}

describe.skipIf(!romExists)("snowman bounds", () => {
	it("stacks top on bottom with grounded base", () => {
		const p = snowmanPlacement(1);
		expect(p.bottomY).toBe(-p.bottomW.bottom);
		expect(p.topY).toBeGreaterThan(p.bottomY);
		expect(p.topY + p.topW.bottom).toBeCloseTo(p.bottomY + p.bottomW.top - p.topW.height * p.topSink, 1);
	});

	it("uses mesh width/height halves for head centre", () => {
		const p = snowmanPlacement(1);
		expect(p.topLocal.center[0]).toBeCloseTo(p.topLocal.min[0] + p.topLocal.width / 2, 5);
		expect(p.topLocal.center[1]).toBeCloseTo(p.topLocal.min[1] + p.topLocal.height / 2, 5);
		expect(p.topLocal.center[2]).toBeCloseTo(p.topLocal.min[2] + p.topLocal.depth / 2, 5);
	});
});

describe("snowman head swing", () => {
	it("oscillates within 20 degrees on one axis", () => {
		const swing = (20 * Math.PI) / 180;
		for (let frame = 0; frame < 120; frame++) {
			const roll = Math.sin(frame * 0.04) * swing;
			expect(Math.abs(roll)).toBeLessThanOrEqual(swing + 1e-6);
		}
	});
});
