import { describe, expect, it } from "vitest";
import { ObjPsea } from "../../src/entities/psea";
import { nkm } from "../../src/formats/nkm";
import { loadCourseCarc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("ObjPsea", () => {
	it("loads tide controllers from bank_course without requesting a model", () => {
		const nkmData = new nkm(loadCourseCarc("bank_course").getFile("/course_map.nkm")!);
		const psea = nkmData.sections.OBJI.entries.filter((o) => o.ID === 0x0002);
		expect(psea.length).toBe(3);

		const ent = new ObjPsea(psea[0], {} as Scene);
		expect(ent.requireRes().mdl).toEqual([]);
		expect(ent.collidable).toBe(true);
	});

	it("raises collision with the tide cycle", () => {
		const nkmData = new nkm(loadCourseCarc("bank_course").getFile("/course_map.nkm")!);
		const ent = new ObjPsea(nkmData.sections.OBJI.entries.find((o) => o.ID === 0x0002)!, {} as Scene);
		const baseY = ent.getCollision().mat[13];

		for (let i = 0; i < 600; i++) {
			ent.update();
		}

		expect(ent.getCollision().mat[13]).not.toBe(baseY);
	});
});
