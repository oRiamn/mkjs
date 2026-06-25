import { describe, expect, it } from "vitest";
import { createMapObjResolver, resolveMapObj } from "../../src/engine/mapObjResolver";
import { DonkyTree2 } from "../../src/entities/objDecor/DonkyTree2";
import { nkm } from "../../src/formats/nkm";
import { loadCourseCarc, loadLz77Narc, loadRomFS, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("DonkyTree2", () => {
	it("has no model because donkytree2GC is absent from the ROM", () => {
		const mini = loadCourseCarc("mini_dokan_gc");
		const track = new nkm(mini.getFile("/course_map.nkm")!);
		const obji = track.sections.OBJI.entries.find((o) => o.ID === 0x0136)!;

		expect(mini.tryGetFile("/MapObj/donkytree2GC.nsbmd")).toBeNull();

		const ctx = createMapObjResolver(
			loadRomFS(),
			mini,
			{ mapObj: loadLz77Narc("/data/Main/MapObj.carc"), mainRace: loadLz77Narc("/data/MainRace.carc") },
			"mini_dokan_gc"
		);
		expect(resolveMapObj("donkytree2GC.nsbmd", ctx)).toBeNull();

		const ent = new DonkyTree2(obji, {} as Scene);
		expect(ent.requireRes().mdl).toEqual([]);
	});
});
