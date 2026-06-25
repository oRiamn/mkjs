import { describe, expect, it } from "vitest";
import { spa } from "../../src/formats/spa";
import { buildNitroFile } from "../helpers/fixtures";
import { getRomFile, loadLz77Narc, romExists } from "../helpers/rom";

describe("spa", () => {
	it("should reject invalid magic", () => {
		expect(() => new spa(buildNitroFile("XXXX"))).toThrow(/SPA invalid/);
	});
});

describe.skipIf(!romExists)("spa from ROM", () => {
	it("should load the shared race effect particle archive", () => {
		const mainEffect = loadLz77Narc("/data/MainEffect.carc");
		const effects = new spa(mainEffect.getFile("RaceEffect.spa")!);

		expect(effects.particles.length).toBeGreaterThan(100);
		expect(effects.particleTextures.length).toBeGreaterThan(20);
	});

	it("should load the mission mode effect archive from the ROM root", () => {
		const effects = new spa(getRomFile("/data/MissionRun/MissionEffect.spa"));

		expect(effects.particles.length).toBe(94);
		expect(effects.particleTextures.length).toBe(29);
	});
});
