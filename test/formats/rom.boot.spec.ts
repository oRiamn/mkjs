import { describe, expect, it } from "vitest";
import { ncgr } from "../../src/formats/2d/ncgr";
import { nitro } from "../../src/formats/nitro";
import { getRomFile, loadRomFS, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("rom boot assets", () => {
	it("should expose the five boot-time files", () => {
		const bootFiles = loadRomFS()
			.list()
			.filter((path) => path.startsWith("/data/Boot/"));

		expect(bootFiles).toEqual([
			"/data/Boot/builddate.bin",
			"/data/Boot/dbgfont.NCGR",
			"/data/Boot/dbgfont.NCLR",
			"/data/Boot/mkds_banner02.nbfc",
			"/data/Boot/mkds_banner02.nbfp",
		]);
	});

	it("should parse the debug font tile sheet", () => {
		const tiles = new ncgr(getRomFile("/data/Boot/dbgfont.NCGR"));
		const header = nitro.readHeader(new DataView(getRomFile("/data/Boot/dbgfont.NCGR")));

		expect(header.stamp).toBe("RGCN");
		expect(tiles.char.type).toBe("RAHC");
		expect(tiles.char.tiles.length).toBeGreaterThan(0);
	});

	it("should expose the expected Nitro stamps for boot assets", () => {
		expect(String.fromCharCode(...new Uint8Array(getRomFile("/data/Boot/dbgfont.NCGR").slice(0, 4)))).toBe("RGCN");
		expect(String.fromCharCode(...new Uint8Array(getRomFile("/data/Boot/dbgfont.NCLR").slice(0, 4)))).toBe("RPCN");
	});

	it("should ship banner frame payloads with stable sizes", () => {
		expect(getRomFile("/data/Boot/mkds_banner02.nbfc").byteLength).toBe(512);
		expect(getRomFile("/data/Boot/mkds_banner02.nbfp").byteLength).toBe(32);
	});
});
