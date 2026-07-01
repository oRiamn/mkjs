import { describe, expect, it } from "vitest";
import { MKDSCONST } from "../../src/engine/mkdsConst";
import { Bound } from "../../src/entities/objDecor/Bound";
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

describe.skipIf(!romExists)("Bound", () => {
	it("uses default 10° pitch on pinball_course when OBJI angle is zero", () => {
		const nkmData = new nkm(loadCourseCarc("pinball_course").getFile("/course_map.nkm")!);
		const obji = nkmData.sections.OBJI.entries.find((o) => o.ID === 0x01a8)!;
		expect(obji.angle[0]).toBe(0);
		const scene = { paths: compilePaths(nkmData), nkm: nkmData, getRoute: (id: number) => compilePaths(nkmData)[id] ?? [] } as Scene;

		const bound = new Bound(obji, scene);
		expect((bound as unknown as { _restPitch: number })._restPitch).toBe(10);
		expect(bound.collidable).toBe(true);
	});

	it("keeps OBJI pitch on donkey_course", () => {
		const nkmData = new nkm(loadCourseCarc("donkey_course").getFile("/course_map.nkm")!);
		const obji = nkmData.sections.OBJI.entries.find((o) => o.ID === 0x01a8 && o.angle[0] !== 0)!;
		const scene = { paths: compilePaths(nkmData), nkm: nkmData, getRoute: (id: number) => compilePaths(nkmData)[id] ?? [] } as Scene;

		const bound = new Bound(obji, scene);
		expect((bound as unknown as { _restPitch: number })._restPitch).toBe(obji.angle[0]);
	});

	it("follows loop routes on pinball_course", () => {
		const nkmData = new nkm(loadCourseCarc("pinball_course").getFile("/course_map.nkm")!);
		const obji = nkmData.sections.OBJI.entries.find((o) => o.ID === 0x01a8 && o.routeID !== MKDSCONST.OBJI_ROUTE_NONE)!;
		const paths = compilePaths(nkmData);
		const scene = { paths, nkm: nkmData, getRoute: (id: number) => paths[id] ?? [] } as Scene;

		const bound = new Bound(obji, scene);
		expect((bound as unknown as { _route: unknown[] })._route.length).toBeGreaterThan(1);
		expect(bound.pos).toEqual(paths[obji.routeID][0].pos);
	});

	it("starts jelly wobble on kart hit", () => {
		const nkmData = new nkm(loadCourseCarc("pinball_course").getFile("/course_map.nkm")!);
		const obji = nkmData.sections.OBJI.entries.find((o) => o.ID === 0x01a8)!;
		const scene = { paths: compilePaths(nkmData), nkm: nkmData, getRoute: (id: number) => compilePaths(nkmData)[id] ?? [] } as Scene;

		const bound = new Bound(obji, scene);
		bound.onKartHit();
		expect((bound as unknown as { _wobbleLeft: number })._wobbleLeft).toBe(40);
		(bound as unknown as { _updateWobble(): void })._updateWobble();
		expect((bound as unknown as { _drawScale: vec3 })._drawScale[0]).toBeGreaterThan(1);
	});
});
