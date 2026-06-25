import { describe, expect, it } from "vitest";
import { ObjKoopaBall } from "../../src/entities/platforms/objKoopaBall";
import { nkm } from "../../src/formats/nkm";
import { loadCourseCarc, loadLz77Narc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("ObjKoopaBall", () => {
	it("requests the green shell item model used on clock_course", () => {
		const track = new nkm(loadCourseCarc("clock_course").getFile("/course_map.nkm")!);
		const obji = track.sections.OBJI.entries.find((o) => o.ID === 0x00cf)!;
		const ent = new ObjKoopaBall(obji, { paths: [] } as Scene);

		expect(ent.requireRes().mdl).toEqual([{ nsbmd: "Item/it_koura_g.nsbmd" }]);
		expect(loadLz77Narc("/data/MainRace.carc").tryGetFile("/Item/it_koura_g.nsbmd")).not.toBeNull();
	});
});
