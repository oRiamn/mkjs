//
// lz77.js
//--------------------
// Reads and decompresses lz77 (mode 0x10 only) files. In future may be able to recompress.
// by RHY3756547
//

export class lz77 {
	/** Some games (eg. NSMB) prefix Nitro LZ77 blobs with a literal "LZ77" stamp. */
	static maybeDecompress(buffer: MKJSDataInput): ArrayBuffer {
		if (buffer.byteLength < 4) return buffer as ArrayBuffer;
		const view = new DataView(buffer);
		if (view.getUint8(0) === 0x4c && view.getUint8(1) === 0x5a && view.getUint8(2) === 0x37 && view.getUint8(3) === 0x37) {
			return lz77.decompress(buffer.slice(4));
		}
		return buffer as ArrayBuffer;
	}

	static decompress(buffer: MKJSDataInput): ArrayBuffer {
		const view = new DataView(buffer);
		const size = view.getUint32(0, true) >> 8;

		const targ = new ArrayBuffer(size);
		const targA = new Uint8Array(targ);

		let off = 4;
		let dOff = 0;
		const eof = buffer.byteLength;
		while (off < eof) {
			const flag = view.getUint8(off++);
			for (let j = 7; j >= 0; j--) {
				if (off >= eof) break;
				if ((flag >> j) & 1) {
					//1=compressed, 2=raw byte
					const dat = view.getUint16(off);
					off += 2;
					let cOff = dOff - (dat & 4095) - 1;
					const len = (dat >> 12) + 3;

					for (let k = 0; k < len; k++) {
						targA[dOff++] = targA[cOff++];
					}
				} else {
					targA[dOff++] = view.getUint8(off++);
				}
			}
		}
		return targ;
	}
}
