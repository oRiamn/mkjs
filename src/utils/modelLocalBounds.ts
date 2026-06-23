type vec3 = [number, number, number];

const PARAM_WORDS: Record<number, number> = {
	0x14: 1,
	0x1b: 3,
	0x23: 2,
	0x24: 1,
	0x25: 1,
	0x26: 1,
	0x27: 1,
	0x28: 1,
	0x40: 1,
	0x41: 0,
};

function fix32(val: number) {
	val >>>= 0;
	if (val & 0x80000000) val -= 0x100000000;
	return val / 4096;
}

function tenBitSign(val: number) {
	val &= 1023;
	if (val & 512) return (val - 1024) / 64;
	return val / 64;
}

function relativeSign(val: number) {
	val &= 1023;
	if (val & 512) return (val - 1024) / 4096;
	return val / 4096;
}

/** Parses a Nitro display list and returns local-space Y bounds of emitted vertices. */
export function modelPolyLocalYBounds(disp: ArrayBuffer): { minY: number; maxY: number } {
	const view = new DataView(disp);
	const cVec: vec3 = [0, 0, 0];
	const vtxScale: vec3 = [1, 1, 1];
	let minY = Infinity;
	let maxY = -Infinity;

	const pushY = (y: number) => {
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	};

	let off = 0;
	while (off < disp.byteLength) {
		const ioff = off;
		off += 4;
		for (let i = 0; i < 4; i++) {
			const inst = view.getUint8(ioff + i);
			const paramWords = PARAM_WORDS[inst] ?? 0;
			const poff = off;
			switch (inst) {
				case 0x1b:
					vtxScale[0] *= fix32(view.getUint32(poff, true));
					vtxScale[1] *= fix32(view.getUint32(poff + 4, true));
					vtxScale[2] *= fix32(view.getUint32(poff + 8, true));
					break;
				case 0x23:
					pushY((view.getInt16(poff + 2, true) / 4096) * vtxScale[1]);
					break;
				case 0x24: {
					const dat = view.getUint32(poff, true);
					pushY(tenBitSign(dat >> 10) * vtxScale[1]);
					break;
				}
				case 0x25:
					pushY((view.getInt16(poff + 2, true) / 4096) * vtxScale[1]);
					break;
				case 0x27:
					pushY((view.getInt16(poff, true) / 4096) * vtxScale[1]);
					break;
				case 0x28: {
					const dat = view.getUint32(poff, true);
					cVec[1] += relativeSign(dat >> 10);
					pushY(cVec[1] * vtxScale[1]);
					break;
				}
			}
			off += paramWords * 4;
		}
	}

	if (!Number.isFinite(minY)) return { minY: 0, maxY: 0 };
	return { minY, maxY };
}

/** World-space vertical extent after ObjDecor scale (x16). */
export function modelWorldYExtent(minY: number, maxY: number, scaleY = 1): { bottom: number; top: number; height: number } {
	const s = scaleY * 16;
	const bottom = minY * s;
	const top = maxY * s;
	return { bottom, top, height: top - bottom };
}
