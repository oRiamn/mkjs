import { describe, expect, it, vi } from "vitest";
import { ndsFS } from "../../src/formats/ndsFS";
import { getRomFile, loadRomFS, readRom, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("rom filesystem", () => {
	it("should index every ROM file with a unique absolute path", () => {
		const rom = loadRomFS();
		const listed = rom.list();

		expect(listed).toHaveLength(606);
		expect(new Set(listed).size).toBe(listed.length);
		expect(listed.every((path) => path.startsWith("/"))).toBe(true);
	});

	it("should read every listed file through getFile", () => {
		const rom = loadRomFS();

		for (const path of rom.list()) {
			const file = rom.getFile(path);
			expect(file).not.toBeNull();
			expect(file!.byteLength).toBeGreaterThan(0);
		}
	});

	it("should accept paths with or without a leading slash", () => {
		const samples = [
			"/data/Boot/builddate.bin",
			"/data/KartModelMenu/character/mario/P_MR.nsbmd",
			"/data/Ghost/ghost_000.bin",
			"/data/Course/beach_course.carc",
		];

		for (const path of samples) {
			const withSlash = getRomFile(path);
			const withoutSlash = getRomFile(path.slice(1));
			expect(withoutSlash).not.toBeNull();
			expect(new Uint8Array(withoutSlash!)).toEqual(new Uint8Array(withSlash));
		}
	});

	it("should resolve deeply nested KartModelMenu assets", () => {
		const rom = loadRomFS();
		const menuFiles = rom.list().filter((path) => path.startsWith("/data/KartModelMenu/character/"));

		expect(menuFiles.length).toBeGreaterThan(30);

		for (const path of menuFiles) {
			const file = rom.getFile(path);
			expect(file).not.toBeNull();
			expect(file!.byteLength).toBeGreaterThan(100);
		}
	});

	it("should return null for missing files and directory paths", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const rom = loadRomFS();

		expect(rom.getFile("/data/does/not/exist.bin")).toBeNull();
		expect(rom.getFile("/data/KartModelMenu")).toBeNull();
		expect(rom.getFile("/data/KartModelMenu/character/mario")).toBeNull();

		errorSpy.mockRestore();
	});

	it("should keep file reads stable across repeated lookups", () => {
		const rom = loadRomFS();
		const samples = ["/data/Boot/builddate.bin", "/data/Ghost/ghost_000.bin", "/data/Course/beach_course.carc"];

		for (const path of samples) {
			const first = new Uint8Array(rom.getFile(path)!);
			const second = new Uint8Array(rom.getFile(path)!);
			expect(second).toEqual(first);
		}
	});

	it("should reload cleanly from a fresh ndsFS instance", () => {
		const first = loadRomFS();
		const second = new ndsFS(readRom());

		expect(second.list().length).toBe(first.list().length);
		expect(new TextDecoder().decode(new Uint8Array(second.getFile("/data/Boot/builddate.bin")!))).toContain("Build: 2005");
	});
});
