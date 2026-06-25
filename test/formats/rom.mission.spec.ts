import { describe, expect, it } from "vitest";
import { nsbca } from "../../src/formats/nsbca";
import { nsbmd } from "../../src/formats/nsbmd";
import { nsbta } from "../../src/formats/nsbta";
import { spa } from "../../src/formats/spa";
import { getRomFile, loadRomFS, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("rom mission mode", () => {
	it("should expose every MissionRun asset through the ROM filesystem", () => {
		const missionFiles = loadRomFS()
			.list()
			.filter((path) => path.startsWith("/data/MissionRun/"));

		expect(missionFiles.length).toBe(43);

		for (const path of missionFiles) {
			const file = getRomFile(path);
			expect(file.byteLength).toBeGreaterThan(0);
		}
	});

	it("should load mission boss models and animations", () => {
		for (const boss of ["boss_donketu", "king_teresa", "king_ice_donketu", "bomb_king"] as const) {
			const model = new nsbmd(getRomFile(`/data/MissionRun/${boss}.nsbmd`));
			const animation = new nsbca(getRomFile(`/data/MissionRun/${boss}.nsbca`));

			expect(model.modelData.numObjects).toBeGreaterThan(0);
			expect(animation.animData.numObjects).toBeGreaterThan(0);
		}
	});

	it("should load kuriking with texture, material and texture animation data", () => {
		const model = new nsbmd(getRomFile("/data/MissionRun/kuriking.nsbmd"));
		const animation = new nsbca(getRomFile("/data/MissionRun/kuriking.nsbca"));
		const textureAnim = new nsbta(getRomFile("/data/MissionRun/kuriking.nsbta"));

		expect(model.modelData.names[0]).toBe("kuriking");
		expect(animation.speeds.length).toBeGreaterThan(0);
		expect(textureAnim.animData.numObjects).toBeGreaterThan(0);
	});

	it("should load the mission particle effect archive", () => {
		const effects = new spa(getRomFile("/data/MissionRun/MissionEffect.spa"));

		expect(effects.particles).toHaveLength(94);
		expect(effects.particleTextures).toHaveLength(29);
	});
});
