import { describe, expect, it } from "vitest";
import { kartoffsetdata } from "../../src/formats/kartoffsetdata";
import { kartphysicalparam } from "../../src/formats/kartphysicalparam";
import { kcl } from "../../src/formats/kcl";
import { lz77 } from "../../src/formats/lz77";
import { narc } from "../../src/formats/narc";
import { nkm } from "../../src/formats/nkm";
import { nsbmd } from "../../src/formats/nsbmd";
import { nsbtx } from "../../src/formats/nsbtx";
import {
	BEACH_COURSE,
	ROM_COURSES,
	getRomFile,
	loadCourseCarc,
	loadCourseTexCarc,
	loadLz77Narc,
	loadRomFS,
	loadSdat,
	romExists,
} from "../helpers/rom";

describe.skipIf(!romExists)("rom integration", () => {
	it("should load the NDS filesystem and read known paths", () => {
		const list = loadRomFS().list();
		expect(list).toEqual(
			expect.arrayContaining([
				"/data/Boot/builddate.bin",
				"/data/Boot/dbgfont.NCGR",
				"/data/Boot/dbgfont.NCLR",
				"/data/Boot/mkds_banner02.nbfc",
				"/data/Boot/mkds_banner02.nbfp",
				"/data/Sound/sound_data.sdat",
			])
		);
		expect(list.length).toEqual(606);
	});

	it("should expose the MKDS build stamp", () => {
		const buildDate = new TextDecoder().decode(new Uint8Array(getRomFile("/data/Boot/builddate.bin")));
		expect(buildDate).toContain("Build: 2005");
		expect(buildDate).toContain("23:05:54");
	});

	it("should load every shipped course archive", () => {
		for (const courseName of ROM_COURSES) {
			const course = loadCourseCarc(courseName);
			const track = new nkm(course.getFile("/course_map.nkm")!);
			const collision = new kcl(course.getFile("/course_collision.kcl")!, false);

			expect(track.stamp).toBe("NKMD");
			expect(track.version).toBe(37);
			expect(collision.loaded).toBe(true);
			expect(collision.planes.length).toBeGreaterThan(100);
		}
	});

	it("should load beach course assets end-to-end", () => {
		const course = loadCourseCarc();
		const textures = loadCourseTexCarc();

		const collision = new kcl(course.getFile("/course_collision.kcl")!, false);
		expect(collision.loaded).toBe(true);
		expect(collision.planes.length).toBeGreaterThan(1000);

		const track = new nkm(course.getFile("/course_map.nkm")!);
		expect(track.stamp).toBe("NKMD");
		expect(track.version).toBe(37);
		expect(track.sections.KTPS.entries).toHaveLength(1);
		expect(track.sections.CPOI.entries.length).toBeGreaterThan(20);

		const model = new nsbmd(course.getFile("/course_model.nsbmd")!);
		expect(model.modelData.names).toContain("beach_course");
		expect(model.modelData.objectData[0].head.numTriangles).toBeGreaterThan(0);

		const tex = new nsbtx(textures.getFile("/course_model.nsbtx")!);
		expect(tex.textureInfo.names).toEqual(expect.arrayContaining(["dash1", "nb_jungle1", "nb_suna1"]));
	});

	it("should load kart menu data from the ROM", () => {
		const phys = new kartphysicalparam(getRomFile("/data/KartModelMenu/kartphysicalparam.bin"));
		expect(phys.karts).toHaveLength(50);
		expect(phys.karts[0].colRadius).toBeGreaterThan(6);
		expect(phys.karts[0].topSpeed).toBeCloseTo(7.5, 0);

		const offsets = new kartoffsetdata(getRomFile("/data/KartModelMenu/kartoffsetdata.bin"));
		expect(offsets.karts).toHaveLength(37);
		expect(new Set(offsets.karts.map((kart) => kart.name))).toEqual(new Set(["kart_tire_L", "kart_tire_M", "kart_tire_S"]));
	});

	it("should load Race.carc from the ROM", () => {
		const raceCarc = getRomFile("/data/Scene/Race.carc");
		const archive = new narc(lz77.decompress(raceCarc));
		expect(archive.stamp).toBe("NARC");
		expect(archive.list().length).toBeGreaterThan(0);
	});

	it("should decompress LZ77 course archives to valid NARC data", () => {
		const carc = getRomFile(`/data/Course/${BEACH_COURSE}.carc`);
		expect(new Uint8Array(carc)[0]).toBe(0x10);

		const decompressed = lz77.decompress(carc);
		const stamp = String.fromCharCode(...new Uint8Array(decompressed.slice(0, 4)));
		expect(stamp).toBe("NARC");
		expect(decompressed.byteLength).toBeGreaterThan(100_000);
	});

	it("should resolve collision near the beach course start grid", () => {
		const course = loadCourseCarc();
		const track = new nkm(course.getFile("/course_map.nkm")!);
		const start = track.sections.KTPS.entries[0];

		const collision = new kcl(course.getFile("/course_collision.kcl")!, false);
		const planes = collision.getPlanesAt(start.pos[0], start.pos[1], start.pos[2]);
		expect(planes.length).toBeGreaterThan(0);
	});

	it("should load shared ingame archives", () => {
		const mainRace = loadLz77Narc("/data/MainRace.carc");
		expect(mainRace.list()).toEqual(expect.arrayContaining(["/Item/it_banana.nsbmd", "/Item/it_star.nsbmd"]));

		const main2d = loadLz77Narc("/data/Main2D.carc");
		expect(main2d.tryGetFile("marioFont.NFTR")).not.toBeNull();

		const mapObj = loadLz77Narc("/data/Main/MapObj.carc");
		expect(mapObj.list()).toEqual(expect.arrayContaining(["/itembox.nsbmd", "/question.nsbmd", "/box.nsbmd"]));

		const kartSub = loadLz77Narc("/data/KartModelSub.carc");
		expect(kartSub.list()).toEqual(
			expect.arrayContaining(["/character/mario/P_MR.nsbmd", "/character/mario/P_MR_win.nsbca", "/character/luigi/P_LG.nsbmd"])
		);
	});

	it("should index the SDAT sound archive", () => {
		const sound = loadSdat();
		expect(sound.sections["$FAT "].length).toBe(284);
		expect(sound.sections.$INFO[0]).toHaveLength(76);
		expect(sound.sections.$INFO[3][0].arc.samples.length).toBe(90);
	});
});
