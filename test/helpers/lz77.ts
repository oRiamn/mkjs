import { BinaryWriter } from "./binary";

/** Builds an LZ77 (mode 0x10) buffer from raw bytes using only literal blocks. */
export function buildLz77Literal(data: Uint8Array | number[]): ArrayBuffer {
	const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
	const writer = new BinaryWriter();
	writer.writeU8(0x10);
	writer.writeU8(bytes.length & 0xff);
	writer.writeU8((bytes.length >> 8) & 0xff);
	writer.writeU8((bytes.length >> 16) & 0xff);

	let offset = 0;
	while (offset < bytes.length) {
		const blockSize = Math.min(8, bytes.length - offset);
		writer.writeU8(0);
		for (let i = 0; i < blockSize; i++) {
			writer.writeU8(bytes[offset + i]!);
		}
		offset += blockSize;
	}

	return writer.toArrayBuffer();
}

/** Known-good LZ77 buffer: "ABC" + back-reference copying "ABC". */
export function buildLz77AbcReference(): ArrayBuffer {
	return new Uint8Array([0x10, 0x06, 0x00, 0x00, 0x10, 0x41, 0x42, 0x43, 0x00, 0x02]).buffer;
}

/** NSMB-style LZ77 wrapper: literal "LZ77" stamp followed by a standard Nitro LZ77 block. */
export function buildLz77Wrapped(lz77Block: ArrayBuffer): ArrayBuffer {
	const stamp = new Uint8Array([0x4c, 0x5a, 0x37, 0x37]);
	const body = new Uint8Array(lz77Block);
	const out = new Uint8Array(stamp.length + body.length);
	out.set(stamp, 0);
	out.set(body, stamp.length);
	return out.buffer;
}
