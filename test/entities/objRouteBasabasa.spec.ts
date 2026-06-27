import { describe, expect, it } from "vitest";
import { createMapObjResolver, resolveMapObj } from "../../src/engine/mapObjResolver";
import { ObjRouteBasabasa } from "../../src/entities/platforms/objRouteBasabasa";
import { nkm } from "../../src/formats/nkm";
import { nsbmd } from "../../src/formats/nsbmd";
import { loadCourseCarc, loadLz77Narc, loadRomFS, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("ObjRouteBasabasa", () => {
	it("resolves basabasa assets on clock_course through the absolute resolver", () => {
		const clock = loadCourseCarc("clock_course");
		const track = new nkm(clock.getFile("/course_map.nkm")!);
		const obji = track.sections.OBJI.entries.find((o) => o.ID === 0x00cd)!;

		expect(clock.tryGetFile("/MapObj/basabasa.nsbmd")).toBeNull();

		const ctx = createMapObjResolver(
			loadRomFS(),
			clock,
			{ mapObj: loadLz77Narc("/data/Main/MapObj.carc"), mainRace: loadLz77Narc("/data/MainRace.carc") },
			"clock_course"
		);
		const model = resolveMapObj("basabasa.nsbmd", ctx)!;
		expect(model).not.toBeNull();
		expect(new nsbmd(model).modelData.numObjects).toBeGreaterThan(0);
		expect(resolveMapObj("basabasa.nsbtp", ctx)).not.toBeNull();

		const ent = new ObjRouteBasabasa(obji, { paths: [] } as Scene);
		expect(ent.requireRes().mdl[0].nsbmd).toBe("basabasa.nsbmd");
	});
});
