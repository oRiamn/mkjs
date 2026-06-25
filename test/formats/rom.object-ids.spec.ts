import { describe, expect, it } from "vitest";
import { nkm } from "../../src/formats/nkm";
import { objectIdReportExists, loadObjectIdReport } from "../helpers/extract";
import { loadLz77Narc, romExists } from "../helpers/rom";
import { ROM_COURSES } from "../helpers/romCourse";

const needsReport = romExists && objectIdReportExists;

describe.skipIf(!needsReport)("rom object IDs", () => {
	it("should map almost every OBJI id used in course maps", () => {
		const report = loadObjectIdReport();

		expect(report.grpconfEntryCount).toBe(133);
		expect(report.objiUniqueIds).toBe(96);
		expect(report.unmappedInObjDatabase).toEqual(["0x0002"]);
		expect(report.objects.filter((o) => o.inObjDatabase).length).toBe(95);
	});

	it("should list MapObj assets that exist in Main or MainRace archives", () => {
		const report = loadObjectIdReport();
		const main = loadLz77Narc("/data/Main/MapObj.carc");
		const mainRace = loadLz77Narc("/data/MainRace.carc");
		const listed = new Set([...main.list(), ...mainRace.list()].map((p) => p.replace(/^\//, "")));

		for (const asset of report.mapObjAssets) {
			const candidates = [asset, `MapObj/${asset}`, `Item/${asset}`, `effect/${asset}`];
			expect(candidates.some((name) => listed.has(name))).toBe(true);
		}
	});

	it("should agree with the NKM parser on OBJI ids for every shipped course", () => {
		const report = loadObjectIdReport();
		const reportIds = new Set(report.objects.map((o) => o.id));

		for (const courseName of ROM_COURSES) {
			const track = new nkm(loadLz77Narc(`/data/Course/${courseName}.carc`).getFile("/course_map.nkm")!);
			for (const obj of track.sections.OBJI.entries) {
				expect(reportIds.has(obj.ID)).toBe(true);
			}
		}
	});

	it("should wire grpconf dimensions for placed objects", () => {
		const report = loadObjectIdReport();
		const withModel = report.objects.filter((o) => o.mkjsClass != null && o.usageCount > 0);

		expect(withModel.length).toBeGreaterThan(50);
		expect(withModel.every((o) => o.courses.length > 0)).toBe(true);
	});
});
