import { describe, expect, it } from "vitest";
import { narc, narcGroup } from "../../src/formats/narc";
import { buildMinimalNarc, buildNestedMinimalNarc } from "../helpers/narc";
import { loadCourseCarc, loadLz77Narc, romExists } from "../helpers/rom";

describe("narc", () => {
	it("should load a minimal NARC archive", () => {
		const archive = new narc(buildMinimalNarc([{ path: "hello.bin", content: "Hello NARC" }]));
		expect(archive.stamp).toBe("NARC");
		expect(archive.numBlocks).toBe(3);
		expect(archive.sections.BTAF?.numFiles).toBe(1);
	});

	it("should read files by path", () => {
		const buffer = buildMinimalNarc([
			{ path: "hello.bin", content: "Hello NARC" },
			{ path: "data.bin", content: [1, 2, 3, 4] },
		]);
		const archive = new narc(buffer);

		const hello = new TextDecoder().decode(new Uint8Array(archive.getFile("hello.bin")!));
		expect(hello).toBe("Hello NARC");

		const data = new Uint8Array(archive.getFile("data.bin")!);
		expect(Array.from(data)).toEqual([1, 2, 3, 4]);
	});

	it("should list files in the archive", () => {
		const archive = new narc(
			buildMinimalNarc([
				{ path: "a.bin", content: "a" },
				{ path: "b.bin", content: "b" },
			])
		);
		expect(archive.list()).toEqual(["/a.bin", "/b.bin"]);
	});

	it("should return null for missing files", () => {
		const archive = new narc(buildMinimalNarc([{ path: "hello.bin", content: "x" }]));
		expect(archive.tryGetFile("missing.bin")).toBeNull();
	});

	it("should throw when loading invalid data", () => {
		expect(() => new narc(new ArrayBuffer(16)).load(new ArrayBuffer(16))).toThrow(/not a NARC archive/);
	});

	it("should search across multiple archives with narcGroup", () => {
		const group = new narcGroup([
			new narc(buildMinimalNarc([{ path: "first.bin", content: "first" }])),
			new narc(buildMinimalNarc([{ path: "second.bin", content: "second" }])),
		]);

		expect(new TextDecoder().decode(new Uint8Array(group.getFile("second.bin")!))).toBe("second");
		expect(group.list()).toEqual(["/first.bin", "/second.bin"]);
	});

	it("should resolve nested directory paths", () => {
		const archive = new narc(
			buildNestedMinimalNarc([
				{ path: "root.txt", content: "root" },
				{ path: "Item/banana.bin", content: [0xaa] },
				{ path: "Item/nested/star.bin", content: [0xbb, 0xcc] },
			])
		);

		expect(archive.list().sort()).toEqual(["/Item/banana.bin", "/Item/nested/star.bin", "/root.txt"]);
		expect(new TextDecoder().decode(new Uint8Array(archive.getFile("/root.txt")!))).toBe("root");
		expect(Array.from(new Uint8Array(archive.getFile("/Item/banana.bin")!))).toEqual([0xaa]);
		expect(Array.from(new Uint8Array(archive.tryGetFile("/Item/nested/star.bin")!))).toEqual([0xbb, 0xcc]);
		expect(archive.tryGetFile("/Item/missing.bin")).toBeNull();
		expect(archive.tryGetFile("/Item")).toBeNull();
	});

	it("should expose archive header metadata", () => {
		const archive = new narc(buildMinimalNarc([{ path: "hello.bin", content: "Hello NARC" }]));
		expect(archive.byteOrder).toBe(0xfffe);
		expect(archive.version).toBe(0x0100);
		expect(archive.headSize).toBe(16);
		expect(archive.sections.BTAF?.numFiles).toBe(1);
		expect(archive.sections.GMIF?.baseOff).toBeGreaterThan(0);
	});
});

describe.skipIf(!romExists)("narc from ROM", () => {
	it("should round-trip every file entry in a decompressed course archive", () => {
		const archive = loadCourseCarc("beach_course");
		const listed = archive.list();

		expect(listed.length).toBeGreaterThan(15);
		expect(listed).toEqual(expect.arrayContaining(["/course_map.nkm", "/course_collision.kcl"]));

		for (const path of listed) {
			const file = archive.getFile(path);
			expect(file).not.toBeNull();
			expect(file!.byteLength).toBeGreaterThan(0);
		}
	});

	it("should resolve nested paths in shared ingame archives", () => {
		const mainRace = loadLz77Narc("/data/MainRace.carc");
		const banana = mainRace.getFile("/Item/it_banana.nsbmd");
		const star = mainRace.tryGetFile("/Item/it_star.nsbmd");

		expect(banana).not.toBeNull();
		expect(star).not.toBeNull();
		expect(banana!.byteLength).toBeGreaterThan(500);
	});

	it("should list and read deeply nested kart assets", () => {
		const karts = loadLz77Narc("/data/KartModelMain.carc");
		const marioBody = karts.getFile("/kart/mario/kart_MR_b.nsbmd");

		expect(marioBody).not.toBeNull();
		expect(karts.list().filter((path) => path.startsWith("/kart/mario/")).length).toBeGreaterThan(2);
	});
});
