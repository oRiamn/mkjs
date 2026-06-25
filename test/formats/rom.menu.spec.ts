import { describe, expect, it } from "vitest";
import { ncgr } from "../../src/formats/2d/ncgr";
import { nclr } from "../../src/formats/2d/nclr";
import { nscr } from "../../src/formats/2d/nscr";
import { nftr } from "../../src/formats/nftr";
import { CUP_INDICES, LOCALIZED_CARCS, getRomFile, loadLz77Narc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("rom menu UI", () => {
	it("should load every nitro and retro cup selection screen", () => {
		for (const index of CUP_INDICES) {
			const id = String(index).padStart(2, "0");

			for (const prefix of ["nitro", "retro"] as const) {
				const screen = new nscr(getRomFile(`/data/CupPicture/select_cup_${prefix}${id}_m_picture.NSCR`));
				const banner = new ncgr(getRomFile(`/data/CupPicture/select_cup_${prefix}${id}_m_b.NCGR`));
				const palette = new nclr(getRomFile(`/data/CupPicture/select_cup_${prefix}${id}_m_b.NCLR`));

				expect(screen.scrn.screenWidth).toBe(256);
				expect(screen.scrn.screenHeight).toBe(256);
				expect(screen.scrn.data).toHaveLength(1024);
				expect(banner.char.tiles.length).toBe(110);
				expect(palette.pltt.palettes).toHaveLength(16);
			}
		}
	});

	it("should load the general menu background screens", () => {
		const menu = loadLz77Narc("/data/GeneralMenu.carc");

		expect(menu.list().length).toBeGreaterThanOrEqual(20);
		expect(menu.tryGetFile("/back_screen_m_bg_00.NSCR")).not.toBeNull();
		expect(menu.tryGetFile("/back_screen_m_b_00.NCGR")).not.toBeNull();
		expect(menu.tryGetFile("/back_screen_m_b_00.NCLR")).not.toBeNull();

		const screen = new nscr(menu.getFile("/back_screen_m_bg_00.NSCR")!);
		expect(screen.scrn.type).toBe("NRCS");
		expect(screen.scrn.screenWidth).toBeGreaterThan(0);
	});

	it("should load localized UI archives alongside the base Main2D pack", () => {
		const base = loadLz77Narc("/data/Main2D.carc");
		expect(base.tryGetFile("marioFont.NFTR")).not.toBeNull();

		for (const path of LOCALIZED_CARCS) {
			const archive = loadLz77Narc(path);
			expect(archive.list().length).toBeGreaterThan(0);
		}

		const localized = loadLz77Narc("/data/Main2D_us.carc");
		expect(localized.tryGetFile("/player_character_L.nce.ncgr")).not.toBeNull();
	});

	it("should load all three HUD font variants from Main2D", () => {
		const main2d = loadLz77Narc("/data/Main2D.carc");

		for (const fontName of ["marioFont.NFTR", "LC_Font_m.NFTR", "LC_Font_s.NFTR"]) {
			const font = new nftr(main2d.getFile(fontName)!);
			expect(Object.keys(font.charMap).length).toBeGreaterThan(50);
		}
	});

	it("should expose character select 2D assets", () => {
		const select = loadLz77Narc("/data/CharacterKartSelect.carc");

		expect(select.tryGetFile("/select_character_gp_m_o.NCLR")).not.toBeNull();
		expect(select.tryGetFile("/select_character_s.nce.ncgr")).not.toBeNull();
		expect(select.list().length).toBeGreaterThanOrEqual(10);
	});
});
