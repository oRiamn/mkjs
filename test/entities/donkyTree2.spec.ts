import { describe, expect, it } from "vitest";
import { DonkyTree2 } from "../../src/entities/objDecor/DonkyTree2";
import { nsbmd } from "../../src/formats/nsbmd";
import { nkm } from "../../src/formats/nkm";
import { loadCourseCarc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("DonkyTree2", () => {
	it("uses CrossTree1 from cross_course on mini_dokan_gc", () => {
		const mini = loadCourseCarc("mini_dokan_gc");
		const cross = loadCourseCarc("cross_course");
		const track = new nkm(mini.getFile("/course_map.nkm")!);
		const obji = track.sections.OBJI.entries.find((o) => o.ID === 0x0136)!;

		expect(mini.tryGetFile("/MapObj/donkytree2GC.nsbmd")).toBeNull();
		expect(cross.tryGetFile("/MapObj/CrossTree1.nsbmd")).not.toBeNull();

		const ent = new DonkyTree2(obji, {} as Scene);
		expect(ent.requireRes().mdl[0].nsbmd).toBe("donkytree2GC.nsbmd");
		expect(new nsbmd(cross.getFile("/MapObj/CrossTree1.nsbmd")!).modelData.numObjects).toBeGreaterThan(0);
	});
});
