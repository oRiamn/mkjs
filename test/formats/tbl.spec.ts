import { describe, expect, it } from "vitest";
import { tbl } from "../../src/formats/tbl";
import { loadLz77Narc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("tbl", () => {
	it("should parse MainRace grpconf.tbl", () => {
		const buf = loadLz77Narc("/data/MainRace.carc").getFile("/MapObj/grpconf.tbl")!;
		const t = new tbl(buf, "grpconf.tbl");

		expect(t.kind).toBe("grpconf");
		expect(t.entries).toHaveLength(133);
		expect(t.getEntryByObjectId(0x0d)).toMatchObject({
			objectId: 0x0d,
			has3DModel: 1,
			nearClip: 15,
			farClip: 1000,
			collisionType: 2,
			width: 15,
			height: 1,
			depth: 0,
		});
	});

	it("should parse kart_appear.ktbl", () => {
		const buf = loadLz77Narc("/data/Main2D.carc").getFile("/kart_appear.ktbl")!;
		const t = new tbl(buf, "kart_appear.ktbl");

		expect(t.kind).toBe("kart_appear");
		expect(t.kartCount).toBe(37);
		expect(t.courseCount).toBe(13);
		expect(t.appear).toHaveLength(37 * 13);
		expect(new Set(t.appear)).toEqual(new Set([0, 1, 2, 3, 4]));
	});

	it("should parse missionTable.mtbl", () => {
		const buf = loadLz77Narc("/data/Main2D.carc").getFile("/missionTable.mtbl")!;
		const t = new tbl(buf, "missionTable.mtbl");

		expect(t.kind).toBe("mission");
		expect(t.missionRows).toBe(7);
		expect(t.missionCols).toBe(9);
		expect(t.missions).toHaveLength(63);
	});

	it("should parse emblem_s.tbl", () => {
		const buf = loadLz77Narc("/data/Scene/Edit.carc").getFile("/emblem_s.tbl")!;
		const t = new tbl(buf, "emblem_s.tbl");

		expect(t.kind).toBe("emblem");
		expect(t.emblemCount).toBe(50);
		expect(t.emblems[0]).toEqual({ width: 14, height: 6, flags: 1, index: 1 });
		expect(t.emblems[1]).toEqual({ width: 50, height: 6, flags: 1, index: 2 });
	});
});
