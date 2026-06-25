import { BinaryWriter } from "./binary";

/** Nitro 2D layout: 0x18-byte header, 8-byte block header at 0x10, payload at 0x18. */
export function buildNitro2dFile(stamp: string, blockName: string, payload: BinaryWriter): ArrayBuffer {
	const body = new Uint8Array(payload.toArrayBuffer());
	const blockSize = 8 + body.length;
	const writer = new BinaryWriter();
	writer.writeAscii(stamp, 4);
	writer.writeU32(0);
	writer.writeU32(0x18 + body.length);
	writer.writeU16(0x18);
	writer.writeU16(1);
	writer.writeAscii(blockName, 4);
	writer.writeU32(blockSize);
	writer.writeBytes(body);
	return writer.toArrayBuffer();
}

export function buildMinimalNclr(colors: number[] = [0x7fff]): ArrayBuffer {
	const payload = new BinaryWriter();
	payload.writeU32(4);
	payload.writeU32(0);
	payload.writeU32(colors.length * 2);
	payload.writeU32(16);
	for (const color of colors) {
		payload.writeU16(color);
	}
	return buildNitro2dFile("RLCN", "TTLP", payload);
}

export function buildMinimalNcgr(tileBytes: number[] = new Array(64).fill(0)): ArrayBuffer {
	const payload = new BinaryWriter();
	payload.writeU16(1);
	payload.writeU16(1);
	payload.writeU32(4);
	payload.writeU32(0);
	payload.writeU32(0);
	payload.writeU32(64);
	payload.writeU32(24);
	for (const byte of tileBytes) {
		payload.writeU8(byte);
	}
	return buildNitro2dFile("RGCN", "RAHC", payload);
}

export function buildMinimalNcer(): ArrayBuffer {
	const payload = new BinaryWriter();
	payload.writeU16(0);
	payload.writeU16(0);
	payload.writeU32(0x12);
	payload.writeU32(0);
	payload.writeU32(0);
	return buildNitro2dFile("RECN", "KBEC", payload);
}

export function buildMinimalNscr(width = 256, height = 256): ArrayBuffer {
	const payload = new BinaryWriter();
	payload.writeU16(width);
	payload.writeU16(height);
	payload.writeU32(0);
	payload.writeU32(0);
	return buildNitro2dFile("RCSN", "NRCS", payload);
}
