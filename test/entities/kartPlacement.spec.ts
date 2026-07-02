import { vec2 } from "gl-matrix";
import { describe, expect, it } from "vitest";
import { nkm, nkm_section_CPOI } from "../../src/formats/nkm";
import { ROM_COURSES, isBattleCourse, loadCourseBundle } from "../helpers/romCourse";
import { romExists } from "../helpers/rom";

function getPositionLike(
	cps: nkm_section_CPOI[],
	checkPointNumber: number,
	futureChecks: number[],
	lapNumber: number,
	x: number,
	z: number
) {
	if (cps.length === 0) return 0;

	const targets = futureChecks.length > 0 ? futureChecks : [0];
	let progress = 0;
	for (const idx of targets) {
		const check = cps[idx];
		const dist = vec2.sub([0, 0], [check.x1, check.z1], [x, z]);
		const dot = vec2.dot(dist, [check.sinus, check.cosinus]);
		progress = Math.max(progress, Math.max(0, Math.min(1, 1 - Math.abs(dot) / 0xffff)));
	}

	return checkPointNumber + progress + lapNumber * cps.length;
}

describe.skipIf(!romExists)("kart placement", () => {
	for (const courseName of ROM_COURSES) {
		if (isBattleCourse(courseName)) continue;

		it(`does not rank final stretch as last on ${courseName}`, () => {
			const { track } = loadCourseBundle(courseName);
			const cps = track.sections.CPOI.entries;
			const lastIdx = cps.length - 1;
			const lap = 3;
			const epois = track.sections.EPOI.entries;

			const rivalStillRacing = getPositionLike(
				cps,
				lastIdx - 1,
				[lastIdx],
				lap,
				(cps[lastIdx].x1 + cps[lastIdx].x2) / 2,
				(cps[lastIdx].z1 + cps[lastIdx].z2) / 2
			);

			let leaderOnFinalStretch = -Infinity;
			for (const p of epois) {
				leaderOnFinalStretch = Math.max(
					leaderOnFinalStretch,
					getPositionLike(cps, lastIdx, [], lap, p.pos[0], p.pos[2])
				);
			}

			expect(leaderOnFinalStretch).toBeGreaterThan(rivalStillRacing);
			expect(0).toBeLessThan(rivalStillRacing);
		});
	}
});
