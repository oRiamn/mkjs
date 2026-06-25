import { describe, expect, it } from "vitest";
import { ObjRouteBasabasa } from "../../src/entities/platforms/objRouteBasabasa";
import { nsbmd } from "../../src/formats/nsbmd";
import { nkm } from "../../src/formats/nkm";
import { loadCourseCarc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("ObjRouteBasabasa", () => {
	it("borrows basabasa assets from old_hyudoro_64 on clock_course", () => {
		const clock = loadCourseCarc("clock_course");
		const hyudoro = loadCourseCarc("old_hyudoro_64");
		const track = new nkm(clock.getFile("/course_map.nkm")!);
		const obji = track.sections.OBJI.entries.find((o) => o.ID === 0x00cd)!;

		expect(clock.tryGetFile("/MapObj/basabasa.nsbmd")).toBeNull();
		expect(hyudoro.tryGetFile("/MapObj/basabasa.nsbmd")).not.toBeNull();
		expect(hyudoro.tryGetFile("/MapObj/basabasa.nsbtp")).not.toBeNull();

		const ent = new ObjRouteBasabasa(obji, { paths: [] } as Scene);
		expect(ent.requireRes().mdl[0].nsbmd).toBe("basabasa.nsbmd");
		expect(new nsbmd(hyudoro.getFile("/MapObj/basabasa.nsbmd")!).modelData.numObjects).toBeGreaterThan(0);
	});
});
