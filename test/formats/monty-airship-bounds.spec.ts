import { describe, expect, it } from "vitest";
import { nsbmd } from "../../src/formats/nsbmd";
import { modelPolyLocalYBounds, modelWorldYExtent } from "../../src/utils/modelLocalBounds";
import { loadCourseCarc, romExists } from "../helpers/rom";

function montyPlacement(scaleY = 1) {
	const arc = loadCourseCarc("airship_course");
	const pooPoly = new nsbmd(arc.getFile("/MapObj/poo.nsbmd")!).modelData.objectData[0].polys.objectData[0];
	const holePoly = new nsbmd(arc.getFile("/MapObj/hole.nsbmd")!).modelData.objectData[0].polys.objectData[0];
	const pooB = modelPolyLocalYBounds(pooPoly.disp);
	const holeB = modelPolyLocalYBounds(holePoly.disp);
	const pooW = modelWorldYExtent(pooB.minY, pooB.maxY, scaleY);
	const holeW = modelWorldYExtent(holeB.minY, holeB.maxY, scaleY);
	const surfaceY = -pooW.bottom;
	const buriedY = surfaceY - pooW.height;
	const outY = surfaceY;
	const pooDrop = -pooW.height / 2;
	const holeY = holeW.top + 1;
	const coverHoleY = holeY + 1;
	const coverOnPooY = pooW.top;
	const coverBuried = Math.max(coverHoleY, buriedY + pooDrop + coverOnPooY);
	const coverOut = Math.max(coverHoleY, outY + pooDrop + coverOnPooY);
	return { buriedY, outY, pooDrop, coverHoleY, coverOnPooY, coverBuried, coverOut, pooOutDraw: outY + pooDrop };
}

describe.skipIf(!romExists)("monty airship bounds", () => {
	it("cover stays on hole when buried and on poo head when out", () => {
		const p = montyPlacement(1);
		console.log(p);
		expect(p.coverBuried).toBe(2);
		expect(p.coverOut).toBe(15);
		expect(p.coverOut).toBeLessThan(p.outY + 20);
	});
});
