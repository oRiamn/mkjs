import { existsSync, readFileSync } from "node:fs";
import { lz77 } from "../../src/formats/lz77";
import { narc, narcGroup } from "../../src/formats/narc";
import { ndsFS } from "../../src/formats/ndsFS";
import { sdat } from "../../src/formats/sdat";

export const ROM_PATH = "test/mkds.nds";
export const romExists = existsSync(ROM_PATH);

/** Default MKDS course used in ROM-backed parser tests. */
export const BEACH_COURSE = "beach_course";

/** Battle arena with eight spawn points and no checkpoints. */
export const BATTLE_COURSE = "mini_stage1";

/** Download-play course variants present in the ROM. */
export const COURSE_D_VARIANTS = ["beach_course", "cross_course", "mansion_course", "old_luigi_gc", "old_momo_64"] as const;

/** Nitro and retro cup screen indices used in CupPicture assets. */
export const CUP_INDICES = [1, 2, 3, 4] as const;

/** Localized UI archives shipped beside the base English assets. */
export const LOCALIZED_CARCS = ["/data/Main2D_us.carc", "/data/GeneralMenu_us.carc", "/data/CharacterKartSelect_us.carc"] as const;

/** Language suffixes used by localized CARC archives in the ROM. */
export const ROM_LANG_SUFFIXES = ["", "_es", "_fr", "_ge", "_it", "_us"] as const;

/** Top-level LZ77 archives under /data (excluding per-course and per-scene packs). */
export const ROM_TOP_CARCS = [
	"/data/CharacterKartSelect.carc",
	"/data/CharacterKartSelect_es.carc",
	"/data/CharacterKartSelect_fr.carc",
	"/data/CharacterKartSelect_ge.carc",
	"/data/CharacterKartSelect_it.carc",
	"/data/CharacterKartSelect_us.carc",
	"/data/GeneralMenu.carc",
	"/data/GeneralMenu_es.carc",
	"/data/GeneralMenu_fr.carc",
	"/data/GeneralMenu_ge.carc",
	"/data/GeneralMenu_it.carc",
	"/data/GeneralMenu_us.carc",
	"/data/KartModelMain.carc",
	"/data/KartModelMainA.carc",
	"/data/KartModelMainB.carc",
	"/data/KartModelMenu.carc",
	"/data/KartModelSub.carc",
	"/data/Main2D.carc",
	"/data/Main2D_es.carc",
	"/data/Main2D_fr.carc",
	"/data/Main2D_ge.carc",
	"/data/Main2D_it.carc",
	"/data/Main2D_us.carc",
	"/data/MainEffect.carc",
	"/data/MainRace.carc",
	"/data/Static2D.carc",
] as const;

/** Nitro, retro and battle courses shipped in the MKDS ROM. */
export const ROM_COURSES = [
	"cross_course",
	"bank_course",
	"beach_course",
	"mansion_course",
	"desert_course",
	"town_course",
	"pinball_course",
	"ridge_course",
	"snow_course",
	"clock_course",
	"mario_course",
	"airship_course",
	"stadium_course",
	"garden_course",
	"koopa_course",
	"rainbow_course",
	"old_mario_sfc",
	"old_momo_64",
	"old_peach_agb",
	"old_luigi_gc",
	"old_donut_sfc",
	"old_frappe_64",
	"old_koopa_agb",
	"old_baby_gc",
	"old_noko_sfc",
	"old_choco_64",
	"old_luigi_agb",
	"old_kinoko_gc",
	"old_choco_sfc",
	"old_hyudoro_64",
	"old_sky_agb",
	"old_yoshi_gc",
	"mini_stage1",
	"mini_stage2",
	"mini_stage3",
	"mini_stage4",
	"mini_block_64",
	"mini_dokan_gc",
] as const;

/** Node readFileSync returns a Buffer; format parsers expect an ArrayBuffer. */
export function readRom(path = ROM_PATH): ArrayBuffer {
	const buffer = readFileSync(path);
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

let cachedRom: ndsFS | undefined;
let cachedSdat: sdat | undefined;

export function loadRomFS(): ndsFS {
	cachedRom ??= new ndsFS(readRom());
	return cachedRom;
}

export function getRomFile(path: string): ArrayBuffer {
	const data = loadRomFS().getFile(path);
	if (data == null) {
		throw new Error(`ROM file not found: ${path}`);
	}
	return data;
}

export function loadLz77Narc(path: string): narc {
	return new narc(lz77.decompress(getRomFile(path)));
}

export function loadCourseCarc(courseName = BEACH_COURSE): narc {
	return loadLz77Narc(`/data/Course/${courseName}.carc`);
}

export function loadCourseTexCarc(courseName = BEACH_COURSE): narc {
	return loadLz77Narc(`/data/Course/${courseName}Tex.carc`);
}

export function loadSdat(): sdat {
	cachedSdat ??= new sdat(getRomFile("/data/Sound/sound_data.sdat"));
	return cachedSdat;
}

export function loadCourseDCarc(courseName: string): narc {
	return loadLz77Narc(`/data/Course/${courseName}D.carc`);
}

export function listRomCarcs(): string[] {
	return loadRomFS()
		.list()
		.filter((path) => path.endsWith(".carc"));
}

export function loadKartModelMainGroup(): narcGroup {
	return new narcGroup([
		loadLz77Narc("/data/KartModelMain.carc"),
		loadLz77Narc("/data/KartModelMainA.carc"),
		loadLz77Narc("/data/KartModelMainB.carc"),
	]);
}

/** Expected decompressed size encoded in the LZ77 header (bytes 1-3). */
export function readLz77DecompressedSize(buffer: ArrayBuffer): number {
	return new DataView(buffer).getUint32(0, true) >> 8;
}
