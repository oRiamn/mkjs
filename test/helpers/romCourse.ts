import type { kcl } from "../../src/formats/kcl";
import type { nkm } from "../../src/formats/nkm";
import type { narc } from "../../src/formats/narc";
import { kcl as KclParser } from "../../src/formats/kcl";
import { nkm as NkmParser } from "../../src/formats/nkm";
import { ROM_COURSES, loadCourseCarc } from "./rom";

export { ROM_COURSES };
export type RomCourseName = (typeof ROM_COURSES)[number];

export type LoadedCourse = {
	archive: narc;
	track: nkm;
	collision: kcl;
};

/** Playable characters shipped in the MKDS ROM (folder slug, model suffix). */
export const ROM_CHARACTERS = [
	["mario", "MR"],
	["donkey", "DK"],
	["kinopio", "KO"],
	["koopa", "KP"],
	["peach", "PC"],
	["wario", "WR"],
	["yoshi", "YS"],
	["luigi", "LG"],
	["karon", "KA"],
	["daisy", "DS"],
	["waluigi", "WL"],
	["robo", "RB"],
] as const;

/** Kart body folders in KartModelMain (oyama is Dry Bones, heyho is Shy Guy). */
export const ROM_KART_CHARACTERS = [
	["mario", "MR"],
	["donkey", "DK"],
	["kinopio", "KO"],
	["koopa", "KP"],
	["peach", "PC"],
	["wario", "WR"],
	["yoshi", "YS"],
	["luigi", "LG"],
	["oyama", "OY"],
	["daisy", "DS"],
	["waluigi", "WL"],
	["robo", "RB"],
	["heyho", "HH"],
] as const;

export function isBattleCourse(courseName: string): boolean {
	return courseName.startsWith("mini_");
}

export function loadCourseBundle(courseName: RomCourseName = "beach_course"): LoadedCourse {
	const archive = loadCourseCarc(courseName);
	return {
		archive,
		track: new NkmParser(archive.getFile("/course_map.nkm")!),
		collision: new KclParser(archive.getFile("/course_collision.kcl")!, false),
	};
}

export function countInvalidKclPlaneRefs(collision: kcl): number {
	let invalid = 0;

	type KclNode = { leaf: true; tris: number[] } | { leaf: false; items: KclNode[] };

	const visit = (node: KclNode) => {
		if (node.leaf === false) {
			for (const child of node.items) {
				visit(child);
			}
			return;
		}

		for (const planeIndex of node.tris) {
			if (planeIndex === 0 || collision.planes[planeIndex] == null) {
				invalid += 1;
			}
		}
	};

	for (const root of collision.octree as KclNode[]) {
		visit(root);
	}

	return invalid;
}

export function sumPathPoints(track: nkm): number {
	return track.sections.PATH.entries.reduce((total, path) => total + path.numPts, 0);
}

export function hasValidCheckpointLinks(track: nkm): boolean {
	const checkpoints = track.sections.CPOI.entries;
	const indices = new Set(checkpoints.map((_, index) => index));

	return checkpoints.every((checkpoint) => checkpoint.nextSection === -1 || indices.has(checkpoint.nextSection));
}

export function spawnPositionsOnCollision(track: nkm, collision: kcl): boolean {
	return track.sections.KTPS.entries.every((spawn) => {
		const planes = collision.getPlanesAt(spawn.pos[0], spawn.pos[1], spawn.pos[2]);
		return planes.length > 0;
	});
}
