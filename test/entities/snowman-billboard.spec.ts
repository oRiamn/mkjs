import { describe, expect, it } from "vitest";
import { nsbmd } from "../../src/formats/nsbmd";
import { loadCourseCarc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("snowman billboard flags", () => {
	it("reports native billboard modes from ROM", () => {
		const arc = loadCourseCarc("snow_course");
		const bottom = new nsbmd(arc.getFile("/MapObj/sman_bottom.nsbmd")!);
		const top = new nsbmd(arc.getFile("/MapObj/sman_top.nsbmd")!);
		const bottomModes = bottom.modelData.objectData[0].objects.objectData.map((o) => o.billboardMode);
		const topModes = top.modelData.objectData[0].objects.objectData.map((o) => o.billboardMode);
		expect(bottomModes).toEqual([0]);
		expect(topModes).toEqual([0]);
	});
});
