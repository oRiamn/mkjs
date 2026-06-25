import type { nitroModel } from "../render/nitroModel";

type vec3 = [number, number, number];

/** GX display-list parameter sizes (words), matching nitroRender._parameters. */
const DISP_PARAM_WORDS: Record<number, number> = {
	0: 0,
	0x10: 1,
	0x11: 0,
	0x12: 1,
	0x13: 1,
	0x14: 1,
	0x15: 0,
	0x16: 16,
	0x17: 12,
	0x18: 16,
	0x19: 12,
	0x1a: 9,
	0x1b: 3,
	0x1c: 3,
	0x20: 1,
	0x21: 1,
	0x22: 1,
	0x23: 2,
	0x24: 1,
	0x25: 1,
	0x26: 1,
	0x27: 1,
	0x28: 1,
	0x29: 1,
	0x2a: 1,
	0x2b: 1,
	0x30: 1,
	0x31: 1,
	0x32: 1,
	0x33: 1,
	0x34: 32,
	0x40: 1,
	0x41: 0,
	0x50: 1,
	0x60: 1,
	0x70: 3,
	0x71: 2,
	0x72: 1,
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

	const pushY = () => {
		const y = cVec[1] * vtxScale[1];
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	};

	let off = 0;
	while (off < disp.byteLength) {
		const ioff = off;
		off += 4;
		for (let i = 0; i < 4; i++) {
			const inst = view.getUint8(ioff + i);
			const paramWords = DISP_PARAM_WORDS[inst] ?? 0;
			const poff = off;
			switch (inst) {
				case 0x14:
					vtxScale[0] = 1;
					vtxScale[1] = 1;
					vtxScale[2] = 1;
					break;
				case 0x1b:
					vtxScale[0] *= fix32(view.getUint32(poff, true));
					vtxScale[1] *= fix32(view.getUint32(poff + 4, true));
					vtxScale[2] *= fix32(view.getUint32(poff + 8, true));
					break;
				case 0x23:
					cVec[0] = view.getInt16(poff, true) / 4096;
					cVec[1] = view.getInt16(poff + 2, true) / 4096;
					cVec[2] = view.getInt16(poff + 4, true) / 4096;
					pushY();
					break;
				case 0x24: {
					const dat = view.getUint32(poff, true);
					cVec[0] = tenBitSign(dat);
					cVec[1] = tenBitSign(dat >> 10);
					cVec[2] = tenBitSign(dat >> 20);
					pushY();
					break;
				}
				case 0x25:
					cVec[0] = view.getInt16(poff, true) / 4096;
					cVec[1] = view.getInt16(poff + 2, true) / 4096;
					pushY();
					break;
				case 0x26:
					cVec[0] = view.getInt16(poff, true) / 4096;
					cVec[2] = view.getInt16(poff + 2, true) / 4096;
					pushY();
					break;
				case 0x27:
					cVec[1] = view.getInt16(poff, true) / 4096;
					cVec[2] = view.getInt16(poff + 2, true) / 4096;
					pushY();
					break;
				case 0x28: {
					const dat = view.getUint32(poff, true);
					cVec[0] += relativeSign(dat);
					cVec[1] += relativeSign(dat >> 10);
					cVec[2] += relativeSign(dat >> 20);
					pushY();
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

/** Y bounds from a rendered nitro model mesh (reliable when disp-list parsing fails). */
export function nitroModelWorldYExtent(mdl: nitroModel, scaleY = 1): { bottom: number; top: number; height: number } {
	const col = mdl.getBoundingCollisionModel(0, 0);
	let minY = Infinity;
	let maxY = -Infinity;
	for (const tri of col.dat) {
		for (const v of tri.Vertices) {
			if (v[1] < minY) minY = v[1];
			if (v[1] > maxY) maxY = v[1];
		}
	}
	if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
		return { bottom: 0, top: 0, height: 0 };
	}
	return modelWorldYExtent(minY, maxY, scaleY);
}
