import { lz77 } from "../formats/lz77";
import { narc } from "../formats/narc";
import type { ndsFS } from "../formats/ndsFS";

export type MapObjSharedArchives = {
	mapObj: narc;
	mainRace: narc;
};

/** Paths to probe inside a NARC archive for a requested resource. */
export function mapObjPathsInArchive(request: string): string[] {
	const trimmed = request.replace(/^\//, "");
	const paths = new Set<string>([`/${trimmed}`, trimmed]);

	if (!trimmed.includes("/")) {
		paths.add(`/MapObj/${trimmed}`);
		paths.add(`MapObj/${trimmed}`);
		paths.add(`/Item/${trimmed}`);
		paths.add(`Item/${trimmed}`);
	}

	return [...paths];
}

/** Resolve against the active course archive (relative to the course root). */
export function resolveMapObjRelative(request: string, course: narc): ArrayBuffer | null {
	for (const path of mapObjPathsInArchive(request)) {
		const file = course.tryGetFile(path);
		if (file != null) return file;
	}
	return null;
}

/** Resolve against shared ROM roots: Main/MapObj.carc and MainRace.carc. */
export function resolveMapObjShared(request: string, shared: MapObjSharedArchives): ArrayBuffer | null {
	for (const archive of [shared.mapObj, shared.mainRace]) {
		for (const path of mapObjPathsInArchive(request)) {
			const file = archive.tryGetFile(path);
			if (file != null) return file;
		}
	}
	return null;
}

const COURSE_CARC_RE = /^\/data\/Course\/([^/]+)\.carc$/;

/** Lazy index of MapObj files shipped in any course pack under /data/Course. */
export class MapObjCoursePool {
	private _byRequest = new Map<string, ArrayBuffer>();

	constructor(
		private readonly rom: ndsFS,
		private readonly skipCourse: string
	) {}

	resolve(request: string): ArrayBuffer | null {
		for (const path of mapObjPathsInArchive(request)) {
			const cached = this._byRequest.get(path);
			if (cached != null) return cached;
		}

		for (const romPath of this.rom.list()) {
			const match = romPath.match(COURSE_CARC_RE);
			if (match == null) continue;
			if (match[1] === this.skipCourse) continue;
			if (romPath.endsWith("Tex.carc") || romPath.endsWith("D.carc")) continue;

			const archive = new narc(lz77.decompress(this.rom.getFile(romPath)!));
			for (const path of mapObjPathsInArchive(request)) {
				const file = archive.tryGetFile(path);
				if (file != null) {
					this._byRequest.set(path, file);
					return file;
				}
			}
		}

		return null;
	}
}

export type MapObjResolverContext = {
	course: narc;
	shared: MapObjSharedArchives;
	coursePool: MapObjCoursePool;
};

export function createMapObjResolver(rom: ndsFS, course: narc, shared: MapObjSharedArchives, courseName: string): MapObjResolverContext {
	return {
		course,
		shared,
		coursePool: new MapObjCoursePool(rom, courseName),
	};
}

/**
 * MapObj lookup order:
 * 1. Relative — current course archive
 * 2. Absolute shared — /data/Main/MapObj.carc and /data/MainRace.carc
 * 3. Absolute pool — any other /data/Course/*.carc MapObj entry
 */
export function resolveMapObj(request: string, ctx: MapObjResolverContext): ArrayBuffer | null {
	return (
		resolveMapObjRelative(request, ctx.course) ??
		resolveMapObjShared(request, ctx.shared) ??
		ctx.coursePool.resolve(request)
	);
}
