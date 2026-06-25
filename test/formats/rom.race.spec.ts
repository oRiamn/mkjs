import { describe, expect, it } from "vitest";
import { ncer } from "../../src/formats/2d/ncer";
import { ncgr } from "../../src/formats/2d/ncgr";
import { nclr } from "../../src/formats/2d/nclr";
import { nscr } from "../../src/formats/2d/nscr";
import { nsbca } from "../../src/formats/nsbca";
import { nsbmd } from "../../src/formats/nsbmd";
import { loadLz77Narc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("rom race UI", () => {
	it("should load the shared Race.carc scene archive", () => {
		const race = loadLz77Narc("/data/Scene/Race.carc");

		expect(race.list().length).toBeGreaterThanOrEqual(50);
		expect(race.list()).toEqual(
			expect.arrayContaining([
				"/count.nsbmd",
				"/goal.nsbca",
				"/start.nsbca",
				"/race_m.NCER",
				"/race_m_goal.NSCR",
				"/win.nsbca",
				"/jg_flag.nsbmd",
			])
		);
	});

	it("should load countdown and race-end 3D models with animations", () => {
		const race = loadLz77Narc("/data/Scene/Race.carc");

		const count = new nsbmd(race.getFile("/count.nsbmd")!);
		const countAnim = new nsbca(race.getFile("/count.nsbca")!);
		const flag = new nsbmd(race.getFile("/jg_flag.nsbmd")!);
		const winAnim = new nsbca(race.getFile("/win.nsbca")!);

		expect(count.modelData.names).toEqual(["count"]);
		expect(countAnim.animData.numObjects).toBe(1);
		expect(flag.modelData.numObjects).toBeGreaterThan(0);
		expect(winAnim.animData.numObjects).toBeGreaterThan(0);
	});

	it("should load race HUD cell banks and screen layouts", () => {
		const race = loadLz77Narc("/data/Scene/Race.carc");

		const cells = new ncer(race.getFile("/race_m.NCER")!);
		const screen = new nscr(race.getFile("/race_m_goal.NSCR")!);
		const banner = new ncgr(race.getFile("/race_goal_s_b.NCGR")!);
		const palette = new nclr(race.getFile("/race_goal_s_b.NCLR")!);

		expect(cells.cebk.type).toBe("KBEC");
		expect(cells.cebk.imageCount).toBe(57);
		expect(cells.cebk.images).toHaveLength(57);
		expect(screen.scrn.type).toBe("NRCS");
		expect(banner.char.tiles.length).toBeGreaterThan(0);
		expect(palette.pltt.palettes.length).toBeGreaterThan(0);
	});
});
