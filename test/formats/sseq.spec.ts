import { describe, expect, it } from "vitest";
import { sseq } from "../../src/formats/sseq";
import { BinaryWriter } from "../helpers/binary";
import { buildSdatBlock } from "../helpers/fixtures";
import { loadSdat, romExists } from "../helpers/rom";

function buildSeqDataBlock(payload: Uint8Array): ArrayBuffer {
	const writer = new BinaryWriter();
	writer.writeU32(0);
	writer.writeBytes(payload);
	return writer.toArrayBuffer();
}

describe("sseq", () => {
	it("should load sequence data from a valid SSEQ file", () => {
		const payload = new Uint8Array([0x01, 0x02, 0x03]);
		const file = buildSdatBlock("SSEQ", new BinaryWriter().writeBytes(buildSeqDataBlock(payload)));
		const seq = new sseq(file);
		expect(Array.from(seq.data)).toEqual([0x01, 0x02, 0x03]);
	});

	it("should reject invalid magic", () => {
		expect(() => new sseq(new ArrayBuffer(32))).toThrow(/SSEQ invalid/);
	});
});

describe.skipIf(!romExists)("sseq from ROM", () => {
	it("should expose sequence bytecode from the SDAT index", () => {
		const sequence = loadSdat().sections.$INFO[0][0].seq;

		expect(sequence.data.length).toBe(11288);
		expect(sequence.data[0]).toBeDefined();
	});
});
