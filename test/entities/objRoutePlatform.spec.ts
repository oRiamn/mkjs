import { describe, expect, it } from "vitest";
import { MKDSCONST } from "../../src/engine/mkdsConst";
import { ObjRoulette } from "../../src/entities/platforms/objRoulette";
import { nkm } from "../../src/formats/nkm";
import { loadCourseCarc, romExists } from "../helpers/rom";

function compilePaths(nkmData: nkm) {
	const paths = nkmData.sections.PATH.entries;
	const poits = nkmData.sections.POIT.entries;
	const compiled = [];
	let ind = 0;
	for (let i = 0; i < paths.length; i++) {
		const p = [];
		for (let j = 0; j < paths[i].numPts; j++) p.push(poits[ind++]);
		compiled.push(p);
	}
	return compiled;
}

describe.skipIf(!romExists)("ObjRoutePlatform", () => {
	it("constructs static pinball_course roulette platforms with OBJI_ROUTE_NONE", () => {
		const nkmData = new nkm(loadCourseCarc("pinball_course").getFile("/course_map.nkm")!);
		const roulette = nkmData.sections.OBJI.entries.find((o) => o.ID === 0x00d2)!;
		expect(roulette.routeID).toBe(MKDSCONST.OBJI_ROUTE_NONE);
		const scene = { paths: compilePaths(nkmData) } as Scene;

		const ent = new ObjRoulette(roulette, scene);
		expect(ent.route).toEqual([]);
		expect(ent.pos).toEqual(roulette.pos);
		expect(ent.requireRes().mdl).toEqual([{ nsbmd: "dram.nsbmd" }]);
		expect(() => ent.update(scene)).not.toThrow();
	});

	it("constructs donkey_course roulette platforms the same way", () => {
		const nkmData = new nkm(loadCourseCarc("donkey_course").getFile("/course_map.nkm")!);
		const roulette = nkmData.sections.OBJI.entries.find((o) => o.ID === 0x00d2)!;
		const scene = { paths: compilePaths(nkmData) } as Scene;

		const ent = new ObjRoulette(roulette, scene);
		expect(ent.route).toEqual([]);
		expect(() => ent.update(scene)).not.toThrow();
	});
});
