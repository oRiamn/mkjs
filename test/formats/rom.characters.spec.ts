import { describe, expect, it } from "vitest";
import { nsbca } from "../../src/formats/nsbca";
import { nsbmd } from "../../src/formats/nsbmd";
import { getRomFile, loadLz77Narc, romExists } from "../helpers/rom";
import { ROM_CHARACTERS } from "../helpers/romCourse";

describe.skipIf(!romExists)("rom characters", () => {
	it("should load every playable character model from the menu data", () => {
		expect(ROM_CHARACTERS).toHaveLength(12);

		for (const [slug, suffix] of ROM_CHARACTERS) {
			const model = new nsbmd(getRomFile(`/data/KartModelMenu/character/${slug}/P_${suffix}.nsbmd`));

			expect(model.modelData.numObjects).toBeGreaterThan(0);
			expect(model.modelData.names[0]).toBe(`P_${suffix}`);
			expect(model.modelData.objectData[0].head.numTriangles).toBeGreaterThan(50);
		}
	});

	it("should load drive, win and lose animations for every character in KartModelSub", () => {
		const kartSub = loadLz77Narc("/data/KartModelSub.carc");

		for (const [slug, suffix] of ROM_CHARACTERS) {
			for (const anim of ["drive", "win", "lose"] as const) {
				const file = kartSub.getFile(`/character/${slug}/P_${suffix}_${anim}.nsbca`);
				expect(file).not.toBeNull();

				const parsed = new nsbca(file!);
				expect(parsed.animData.numObjects).toBeGreaterThan(0);
				expect(parsed.speeds.length).toBeGreaterThan(0);
			}
		}
	});

	it("should keep Mario's victory animation timing stable", () => {
		const menuAnim = new nsbca(getRomFile("/data/KartModelMenu/character/mario/P_MR_win.nsbca"));
		const subAnim = new nsbca(loadLz77Narc("/data/KartModelSub.carc").getFile("/character/mario/P_MR_win.nsbca")!);

		expect(menuAnim.speeds).toEqual([1, 0.5, 0.25]);
		expect(subAnim.speeds).toEqual([1, 0.5, 0.25]);
	});
});
