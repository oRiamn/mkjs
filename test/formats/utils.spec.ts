import { describe, expect, it } from "vitest";
import { MKSUtils } from "../../src/formats/utils";
import { buildLz77Literal, buildLz77Wrapped } from "../helpers/lz77";

describe("MKSUtils", () => {
	it("should convert printable ASCII char codes", () => {
		expect(MKSUtils.asciiFromCharCode(65)).toBe("A");
		expect(MKSUtils.asciiFromCharCode(48)).toBe("0");
	});

	it("should return empty string for non-printable char codes", () => {
		expect(MKSUtils.asciiFromCharCode(0)).toBe("");
		expect(MKSUtils.asciiFromCharCode(128)).toBe("");
	});

	it("should read ASCII chars from a DataView", () => {
		const view = new DataView(new Uint8Array([0x4e, 0x41, 0x52, 0x43]).buffer);
		expect(MKSUtils.asciireadChar(view, 0)).toBe("N");
		expect(MKSUtils.asciireadChar(view, 1)).toBe("A");
		expect(MKSUtils.asciireadChar(view, 2)).toBe("R");
		expect(MKSUtils.asciireadChar(view, 3)).toBe("C");
	});

	it("should transparently decompress NSMB-style LZ77-wrapped input", () => {
		const original = new Uint8Array([0x42, 0x4d, 0x44, 0x30]);
		const wrapped = buildLz77Wrapped(buildLz77Literal(original));
		expect(new Uint8Array(MKSUtils.prepareInput(wrapped))).toEqual(original);
		expect(MKSUtils.prepareInput(original.buffer)).toBe(original.buffer);
	});
});
