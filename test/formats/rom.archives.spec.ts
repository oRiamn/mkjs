import { describe, expect, it } from "vitest";
import { narc } from "../../src/formats/narc";
import { lz77 } from "../../src/formats/lz77";
import {
	BEACH_COURSE,
	ROM_ALL_COURSES,
	ROM_COURSES,
	ROM_TOP_CARCS,
	getRomFile,
	listRomCarcs,
	loadKartModelMainGroup,
	loadLz77Narc,
	readLz77DecompressedSize,
	romExists,
} from "../helpers/rom";

describe.skipIf(!romExists)("rom archives", () => {
	it("should store every CARC entry as LZ77-compressed data", () => {
		for (const path of listRomCarcs()) {
			const raw = getRomFile(path);
			expect(new Uint8Array(raw)[0]).toBe(0x10);
		}
	});

	it("should decompress every top-level CARC archive to a NARC container", () => {
		for (const path of ROM_TOP_CARCS) {
			const raw = getRomFile(path);
			const expectedSize = readLz77DecompressedSize(raw);
			const decompressed = lz77.decompress(raw);

			expect(decompressed.byteLength).toBe(expectedSize);
			expect(String.fromCharCode(...new Uint8Array(decompressed.slice(0, 4)))).toBe("NARC");

			const archive = new narc(decompressed);
			expect(archive.stamp).toBe("NARC");
			expect(archive.list().length).toBeGreaterThan(0);
		}
	});

	it("should round-trip every file in the shared top-level archives", () => {
		for (const path of ROM_TOP_CARCS) {
			const archive = loadLz77Narc(path);

			for (const entry of archive.list()) {
				const file = archive.getFile(entry);
				expect(file).not.toBeNull();
				if (entry.endsWith("dummy.txt")) {
					expect(file!.byteLength).toBe(0);
				} else {
					expect(file!.byteLength).toBeGreaterThan(0);
				}
			}
		}
	});

	it("should load every extra course archive", () => {
		for (const courseName of ROM_ALL_COURSES) {
			if (ROM_COURSES.includes(courseName as (typeof ROM_COURSES)[number])) {
				continue;
			}

			const course = loadLz77Narc(`/data/Course/${courseName}.carc`);
			const textures = loadLz77Narc(`/data/Course/${courseName}Tex.carc`);

			expect(course.tryGetFile("/course_map.nkm")).not.toBeNull();
			expect(course.tryGetFile("/course_collision.kcl")).not.toBeNull();
			expect(textures.list().length).toBeGreaterThan(0);
		}
	});

	it("should load every shipped course and texture archive", () => {
		for (const courseName of ROM_COURSES) {
			const course = loadLz77Narc(`/data/Course/${courseName}.carc`);
			const textures = loadLz77Narc(`/data/Course/${courseName}Tex.carc`);

			expect(course.tryGetFile("/course_map.nkm")).not.toBeNull();
			expect(course.tryGetFile("/course_collision.kcl")).not.toBeNull();
			expect(textures.tryGetFile("/course_model.nsbtx")).not.toBeNull();
		}
	});

	it("should load every download-play course variant present in the ROM", () => {
		const downloadCourses = listRomCarcs()
			.filter((path) => /\/data\/Course\/\w+D\.carc$/.test(path))
			.map((path) => path.match(/\/(\w+)D\.carc$/)![1]);

		expect(downloadCourses).toEqual(expect.arrayContaining(["beach_course", "cross_course", "mansion_course"]));

		for (const courseName of downloadCourses) {
			const download = loadLz77Narc(`/data/Course/${courseName}D.carc`);
			expect(download.tryGetFile("/course_map.nkm")).not.toBeNull();
		}
	});

	it("should keep beach course file sizes stable after decompression", () => {
		const archive = loadLz77Narc(`/data/Course/${BEACH_COURSE}.carc`);
		const expectedSizes: Record<string, number> = {};

		for (const path of archive.list()) {
			expectedSizes[path] = archive.getFile(path)!.byteLength;
		}

		const secondPass = loadLz77Narc(`/data/Course/${BEACH_COURSE}.carc`);
		for (const path of secondPass.list()) {
			expect(secondPass.getFile(path)!.byteLength).toBe(expectedSizes[path]);
		}
	});

	it("should resolve kart assets split across Main, MainA and MainB archives", () => {
		const group = loadKartModelMainGroup();
		const listed = group.list();

		expect(listed.length).toBeGreaterThan(200);
		expect(group.tryGetFile("/kart/tire/kart_tire_M.nsbmd")).not.toBeNull();
		expect(group.tryGetFile("/kart/mario/kart_MR_b.nsbmd")).not.toBeNull();

		for (const path of listed.filter((entry) => entry.endsWith(".nsbmd")).slice(0, 20)) {
			expect(group.getFile(path)).not.toBeNull();
		}
	});

	it("should load every scene CARC pack as a valid NARC archive", () => {
		const sceneCarcs = listRomCarcs().filter((path) => path.startsWith("/data/Scene/"));

		expect(sceneCarcs.length).toBeGreaterThan(10);

		for (const path of sceneCarcs) {
			const archive = loadLz77Narc(path);
			expect(archive.stamp).toBe("NARC");
			expect(archive.list().length).toBeGreaterThan(0);
		}
	});
});
