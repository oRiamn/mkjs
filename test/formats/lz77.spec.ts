import { describe, expect, it } from "vitest";
import { lz77 } from "../../src/formats/lz77";
import { buildLz77AbcReference, buildLz77Literal, buildLz77Wrapped } from "../helpers/lz77";
import { BEACH_COURSE, ROM_TOP_CARCS, getRomFile, listRomCarcs, readLz77DecompressedSize, romExists } from "../helpers/rom";

describe("lz77", () => {
	it("should decompress literal-only LZ77 data", () => {
		const original = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
		const result = new Uint8Array(lz77.decompress(buildLz77Literal(original)));
		expect(result).toEqual(original);
	});

	it("should decompress data with a back-reference", () => {
		const result = new Uint8Array(lz77.decompress(buildLz77AbcReference()));
		expect(result).toEqual(new Uint8Array([0x41, 0x42, 0x43, 0x41, 0x42, 0x43]));
	});

	it("should round-trip multi-block literal data", () => {
		const original = new Uint8Array(20);
		for (let i = 0; i < original.length; i++) {
			original[i] = i;
		}
		const result = new Uint8Array(lz77.decompress(buildLz77Literal(original)));
		expect(result).toEqual(original);
	});

	it("should decompress NSMB-style LZ77-wrapped data", () => {
		const original = new Uint8Array([0x42, 0x4d, 0x44, 0x30, 0xff, 0xfe]);
		const wrapped = buildLz77Wrapped(buildLz77Literal(original));
		expect(String.fromCharCode(...new Uint8Array(wrapped.slice(0, 4)))).toBe("LZ77");
		expect(new Uint8Array(lz77.maybeDecompress(wrapped))).toEqual(original);
	});
});

describe.skipIf(!romExists)("lz77 from ROM", () => {
	it("should decompress a course archive to a NARC container", () => {
		const compressed = getRomFile(`/data/Course/${BEACH_COURSE}.carc`);
		expect(new Uint8Array(compressed)[0]).toBe(0x10);

		const decompressed = lz77.decompress(compressed);
		const stamp = String.fromCharCode(...new Uint8Array(decompressed.slice(0, 4)));
		expect(stamp).toBe("NARC");
		expect(decompressed.byteLength).toBeGreaterThan(100_000);
	});

	it("should match the decompressed size encoded in every top-level archive header", () => {
		for (const path of ROM_TOP_CARCS) {
			const compressed = getRomFile(path);
			const expectedSize = readLz77DecompressedSize(compressed);
			const decompressed = lz77.decompress(compressed);

			expect(decompressed.byteLength).toBe(expectedSize);
		}
	});

	it("should decompress every course archive to a NARC stamp", () => {
		const courseCarcs = listRomCarcs().filter((path) => path.startsWith("/data/Course/"));
		expect(courseCarcs.length).toBe(118);

		for (const path of courseCarcs) {
			const decompressed = lz77.decompress(getRomFile(path));
			expect(String.fromCharCode(...new Uint8Array(decompressed.slice(0, 4)))).toBe("NARC");
		}
	});
});
