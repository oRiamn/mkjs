//
// lz77.js
//--------------------
// Reads and decompresses lz77 (mode 0x10 only) files. In future may be able to recompress.
// by RHY3756547
//

export class lz77 {
	static decompress(buffer: MKJSDataInput): ArrayBuffer {
		let view = new DataView(buffer);
		let compType = view.getUint8(0);
		let size = view.getUint32(0, true) >> 8;

		let targ = new ArrayBuffer(size);
		let targA = new Uint8Array(targ);

		let off = 4;
		let dOff = 0;
		let eof = buffer.byteLength;
		while (off < eof) {
			let flag = view.getUint8(off++);
			for (let j = 7; j >= 0; j--) {
				if (off >= eof) break;
				if ((flag >> j) & 1) {
					//1=compressed, 2=raw byte
					let dat = view.getUint16(off);
					off += 2;
					let cOff = dOff - (dat & 4095) - 1;
					let len = (dat >> 12) + 3;

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
