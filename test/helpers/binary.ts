export class BinaryWriter {
	private chunks: Uint8Array[] = [];
	private length = 0;

	get size(): number {
		return this.length;
	}

	writeBytes(bytes: Uint8Array | number[]): this {
		const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
		this.chunks.push(buf);
		this.length += buf.length;
		return this;
	}

	writeU8(value: number): this {
		return this.writeBytes([value & 0xff]);
	}

	writeU16(value: number): this {
		const buf = new ArrayBuffer(2);
		new DataView(buf).setUint16(0, value, true);
		return this.writeBytes(new Uint8Array(buf));
	}

	writeU32(value: number): this {
		const buf = new ArrayBuffer(4);
		new DataView(buf).setUint32(0, value >>> 0, true);
		return this.writeBytes(new Uint8Array(buf));
	}

	writeI32(value: number): this {
		const buf = new ArrayBuffer(4);
		new DataView(buf).setInt32(0, value, true);
		return this.writeBytes(new Uint8Array(buf));
	}

	writeAscii(text: string, padTo?: number): this {
		const bytes = new Uint8Array(padTo ?? text.length);
		for (let i = 0; i < text.length; i++) {
			bytes[i] = text.charCodeAt(i);
		}
		return this.writeBytes(bytes);
	}

	writeZeros(count: number): this {
		return this.writeBytes(new Uint8Array(count));
	}

	padToAlignment(alignment: number): this {
		const remainder = this.length % alignment;
		if (remainder !== 0) {
			this.writeZeros(alignment - remainder);
		}
		return this;
	}

	toArrayBuffer(): ArrayBuffer {
		const out = new Uint8Array(this.length);
		let offset = 0;
		for (const chunk of this.chunks) {
			out.set(chunk, offset);
			offset += chunk.length;
		}
		return out.buffer;
	}
}

export function u32At(buffer: ArrayBuffer, offset: number): number {
	return new DataView(buffer).getUint32(offset, true);
}
