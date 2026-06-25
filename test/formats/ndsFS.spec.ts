import { describe, expect, it, vi } from "vitest";
import { ndsFS } from "../../src/formats/ndsFS";
import { buildMinimalNdsFs } from "../helpers/nds";

describe("ndsFS", () => {
	it("should load the NitroFS name table from a minimal ROM buffer", () => {
		const rom = new ndsFS(buildMinimalNdsFs([{ path: "test.bin", content: "nds data" }]));
		expect(rom.sections.BTNF.directories).toHaveLength(1);
		expect(rom.sections.BTNF.directories[0].entries).toHaveLength(1);
		expect(rom.sections.BTNF.directories[0].entries[0].name).toBe("test.bin");
	});

	it("should read files by path", () => {
		const rom = new ndsFS(
			buildMinimalNdsFs([
				{ path: "course.kcl", content: [0xde, 0xad, 0xbe, 0xef] },
				{ path: "track.nkm", content: "nkm-data" },
			])
		);

		const kcl = new Uint8Array(rom.getFile("course.kcl")!);
		expect(Array.from(kcl)).toEqual([0xde, 0xad, 0xbe, 0xef]);

		const nkm = new TextDecoder().decode(new Uint8Array(rom.getFile("track.nkm")!));
		expect(nkm).toBe("nkm-data");
	});

	it("should list every file in the minimal ROM", () => {
		const rom = new ndsFS(
			buildMinimalNdsFs([
				{ path: "alpha.bin", content: "a" },
				{ path: "beta.bin", content: "b" },
			])
		);

		expect(rom.list().sort()).toEqual(["/alpha.bin", "/beta.bin"]);
	});

	it("should accept paths with a leading slash", () => {
		const rom = new ndsFS(buildMinimalNdsFs([{ path: "hello.bin", content: "hello" }]));
		expect(new TextDecoder().decode(new Uint8Array(rom.getFile("/hello.bin")!))).toBe("hello");
	});

	it("should return null for missing files", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const rom = new ndsFS(buildMinimalNdsFs([{ path: "exists.bin", content: "ok" }]));
		expect(rom.getFile("missing.bin")).toBeNull();
		errorSpy.mockRestore();
	});

	it("should throw when accessed before load completes", () => {
		const rom = new ndsFS(undefined!);
		expect(() => rom.list()).toThrow(/not loaded/i);
	});
});
