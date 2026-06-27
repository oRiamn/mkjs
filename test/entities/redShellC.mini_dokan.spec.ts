import { describe, expect, it } from "vitest";
import { loadCourseCarc, romExists } from "../helpers/rom";
import { nkm } from "../../src/formats/nkm";

describe.skipIf(!romExists)("redShellC mini_dokan_gc paths", () => {
	it("should use MEPA/MEPO on battle arena", () => {
		const track = new nkm(loadCourseCarc("mini_dokan_gc").getFile("/course_map.nkm")!);
		// Battle arenas omit EPAT; section may be undefined rather than null.
		expect(track.sections.EPAT == null).toBe(true);
		expect(track.sections.MEPA?.entries?.length).toBeGreaterThan(0);
		expect(track.sections.MEPO?.entries?.length).toBeGreaterThan(0);

		const mepo = track.sections.MEPO!.entries;
		const mepa = track.sections.MEPA!.entries;

		for (const path of mepa) {
			expect(path.pathLen).toBeGreaterThan(0);
			for (let i = 0; i < path.pathLen; i++) {
				expect(mepo[path.startInd + i]).toBeDefined();
			}
		}

		// Battle forks reference MEPO point indices, not MEPA path indices.
		for (const path of mepa) {
			for (const poiInd of [...path.source, ...path.dest]) {
				expect(mepo[poiInd]).toBeDefined();
			}
		}
	});
});
