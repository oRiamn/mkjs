import { describe, expect, it } from "vitest";
import { nsbmd } from "../../src/formats/nsbmd";
import { nsbtx } from "../../src/formats/nsbtx";
import { loadLz77Narc, romExists } from "../helpers/rom";
import { ROM_KART_CHARACTERS } from "../helpers/romCourse";

describe.skipIf(!romExists)("rom karts", () => {
	it("should load shared tire models from KartModelMain", () => {
		const karts = loadLz77Narc("/data/KartModelMain.carc");

		for (const tire of ["kart_tire_L", "kart_tire_M", "kart_tire_S"] as const) {
			const model = new nsbmd(karts.getFile(`/kart/tire/${tire}.nsbmd`)!);
			expect(model.modelData.names).toEqual([tire]);
		}
	});

	it("should load body and cockpit kart meshes for every playable kart", () => {
		const karts = loadLz77Narc("/data/KartModelMain.carc");

		for (const [slug, suffix] of ROM_KART_CHARACTERS) {
			for (const part of ["b", "c"] as const) {
				const model = new nsbmd(karts.getFile(`/kart/${slug}/kart_${suffix}_${part}.nsbmd`)!);
				expect(model.modelData.numObjects).toBeGreaterThan(0);
				expect(model.modelData.names[0]).toBe(`kart_${suffix}_${part}`);
			}
		}
	});

	it("should pair kart body meshes with texture archives in KartModelMain", () => {
		const karts = loadLz77Narc("/data/KartModelMain.carc");

		for (const [slug, suffix] of ROM_KART_CHARACTERS) {
			const bodyTex = new nsbtx(karts.getFile(`/kart/${slug}/kart_${suffix}_b.nsbtx`)!);
			expect(bodyTex.textureInfo.numObjects).toBeGreaterThan(0);
		}
	});

	it("should index more than one hundred kart assets in KartModelMain", () => {
		const karts = loadLz77Narc("/data/KartModelMain.carc");
		const models = karts.list().filter((path) => path.endsWith(".nsbmd"));

		expect(karts.list().length).toBeGreaterThanOrEqual(130);
		expect(models.length).toBeGreaterThanOrEqual(40);
	});
});
