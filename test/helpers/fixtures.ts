import { BinaryWriter } from "./binary";

export type NitroBlock = {
	type: string;
	body: BinaryWriter | Uint8Array | number[];
};

/** Builds a Nitro-format file header with optional section blocks. */
export function buildNitroFile(stamp: string, blocks: NitroBlock[] = []): ArrayBuffer {
	const sectionOffsets: number[] = [];
	let cursor = 0x10 + blocks.length * 4;

	const blockBuffers = blocks.map((block) => {
		const body =
			block.body instanceof BinaryWriter
				? new Uint8Array(block.body.toArrayBuffer())
				: block.body instanceof Uint8Array
					? block.body
					: new Uint8Array(block.body);
		sectionOffsets.push(cursor);
		const writer = new BinaryWriter();
		writer.writeAscii(block.type, 4);
		writer.writeU32(8 + body.length);
		writer.writeBytes(body);
		cursor += 8 + body.length;
		return writer.toArrayBuffer();
	});

	const writer = new BinaryWriter();
	writer.writeAscii(stamp, 4);
	writer.writeU32(0);
	writer.writeU32(cursor);
	writer.writeU16(0x10 + blocks.length * 4);
	writer.writeU16(blocks.length);
	for (const offset of sectionOffsets) {
		writer.writeU32(offset);
	}
	for (const blockBuffer of blockBuffers) {
		writer.writeBytes(new Uint8Array(blockBuffer));
	}
	return writer.toArrayBuffer();
}

/** Builds a minimal SDAT-style container with a DATA block. */
export function buildSdatBlock(stamp: string, dataBody: BinaryWriter): ArrayBuffer {
	const dataBytes = new Uint8Array(dataBody.toArrayBuffer());
	const dataOffset = 16 + 8;
	const writer = new BinaryWriter();
	writer.writeAscii(stamp, 4);
	writer.writeU32(0);
	writer.writeU32(dataOffset + 8 + dataBytes.length);
	writer.writeU16(16);
	writer.writeU16(1);
	writer.writeAscii("DATA", 4);
	writer.writeU32(8 + dataBytes.length);
	writer.writeU32(dataOffset + 8);
	writer.writeBytes(dataBytes);
	return writer.toArrayBuffer();
}

/** Builds a minimal PCM8 SWAV payload (no SWAV header). */
export function buildSwavPcm8(sampleRate: number, samples: number[]): ArrayBuffer {
	const writer = new BinaryWriter();
	writer.writeU8(0);
	writer.writeU8(0);
	writer.writeU16(sampleRate);
	writer.writeU16(0);
	writer.writeU16(0);
	writer.writeU32(Math.ceil(samples.length / 4));
	for (const sample of samples) {
		writer.writeU8(sample);
	}
	while (writer.size % 4 !== 0) {
		writer.writeU8(0);
	}
	return writer.toArrayBuffer();
}

/** Builds a minimal empty NKM file. */
export function buildMinimalNkm(stamp = "NKMD"): ArrayBuffer {
	const writer = new BinaryWriter();
	writer.writeAscii(stamp, 4);
	writer.writeU16(1);
	writer.writeU16(8);
	return writer.toArrayBuffer();
}

/** Builds a minimal empty KCL file (MKDS mode). */
export function buildMinimalKcl(): ArrayBuffer {
	const writer = new BinaryWriter();
	writer.writeU32(0x100);
	writer.writeU32(0x100);
	writer.writeU32(0x100);
	writer.writeU32(0x100);
	for (let i = 0; i < 10; i++) {
		writer.writeI32(0);
	}
	writer.writeU32(0xffffff80);
	writer.writeU32(0xffffff80);
	writer.writeU32(0xffffff80);
	writer.writeU32(7);
	writer.writeU32(3);
	writer.writeU32(5);
	writer.writeI32(0);
	writer.writeU32(0x100);
	return writer.toArrayBuffer();
}

/** Zero-filled buffer of the given byte size. */
export function zeroBuffer(size: number): ArrayBuffer {
	return new BinaryWriter().writeZeros(size).toArrayBuffer();
}
