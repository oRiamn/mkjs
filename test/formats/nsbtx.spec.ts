import { describe, expect, it } from "vitest";
import { nsbtx } from "../../src/formats/nsbtx";
import { buildNitroFile } from "../helpers/fixtures";
import { getRomFile, loadCourseTexCarc, romExists } from "../helpers/rom";
import { ROM_CHARACTERS } from "../helpers/romCourse";

describe("nsbtx", () => {
	it("should reject invalid magic", () => {
		expect(() => new nsbtx(buildNitroFile("XXXX"))).toThrow(/nsbtx invalid/);
	});
});

describe.skipIf(!romExists)("nsbtx from ROM", () => {
	it("should load beach course textures", () => {
		const textures = loadCourseTexCarc();
		const tex = new nsbtx(textures.getFile("/course_model.nsbtx")!);

		expect(tex.textureInfo.numObjects).toBe(18);
		expect(tex.textureInfo.names).toEqual(expect.arrayContaining(["dash1", "nb_jungle1", "nb_suna1", "nb_tree_cmb"]));
		expect(tex.textureInfo.objectData[0].width).toBe(16);
		expect(tex.textureInfo.objectData[0].height).toBe(64);
	});

	it("should load a texture set for every playable character", () => {
		for (const [slug, suffix] of ROM_CHARACTERS) {
			const tex = new nsbtx(getRomFile(`/data/KartModelMenu/character/${slug}/P_${suffix}.nsbtx`));

			expect(tex.textureInfo.numObjects).toBeGreaterThanOrEqual(1);
			expect(tex.textureInfo.names.length).toBe(tex.textureInfo.numObjects);
		}
	});
});
