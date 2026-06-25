import { nkm_section_OBJI } from "../formats/nkm";

/** Max tide raise in MKDS fixed-point units (see Tockdom Psea docs). */
const PSEA_TIDE_UNITS = 288;
const PSEA_FIXED = 4096;

type ObjPseaCollision = {
	dat: lsc_collision_triangle[];
	scale: number;
};

/**
 * MOBJ 0x0002 — tide sea controller.
 * Retail ROM has no Psea.nsbmd; the game drives layered water planes from ARM9.
 * bank_course places three instances with timing in setting1/setting2.
 */
export class ObjPsea implements SceneEntityObject, lsc_taget {
	collidable = true;
	colRad = 512;
	colMode = 0;
	colFrame = 0;
	pos: vec3;
	scale: vec3;

	private _obji: nkm_section_OBJI;
	private _res: ProvidedRes;
	private _genCol: ObjPseaCollision;
	private _cycleLength: number;
	private _phaseOffset: number;

	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		this._obji = obji;
		this._res = { mdl: [], other: [] };
		this.pos = vec3.clone(obji.pos);
		this.scale = vec3.clone(obji.scale);

		const rise = Math.max(obji.setting1 & 0xffff, 1);
		const holdHigh = Math.max((obji.setting1 >> 16) & 0xffff, 1);
		const fall = Math.max(obji.setting2 & 0xffff, 1);
		const holdLow = Math.max((obji.setting2 >> 16) & 0xffff, 1);
		this._cycleLength = rise + holdHigh + fall + holdLow;
		this._phaseOffset = (obji.setting3 + obji.setting4) & 0xffff;

		this._genCol = {
			dat: [
				{
					Vertices: [
						[-50, 0, -50],
						[50, 0, -50],
						[50, 0, 50],
					],
					Normal: [0, 1, 0],
				},
				{
					Vertices: [
						[50, 0, 50],
						[-50, 0, 50],
						[-50, 0, -50],
					],
					Normal: [0, 1, 0],
				},
			],
			scale: 1,
		};
	}

	private _tideOffset(frame: number): number {
		const t = (frame + this._phaseOffset) % this._cycleLength;
		const rise = Math.max(this._obji.setting1 & 0xffff, 1);
		const holdHigh = Math.max((this._obji.setting1 >> 16) & 0xffff, 1);
		const fall = Math.max(this._obji.setting2 & 0xffff, 1);
		const amplitude = (PSEA_TIDE_UNITS / PSEA_FIXED) * this.scale[1];

		if (t < rise) return (t / rise) * amplitude;
		if (t < rise + holdHigh) return amplitude;
		if (t < rise + holdHigh + fall) return (1 - (t - rise - holdHigh) / fall) * amplitude;
		return 0;
	}

	private _waterPos(): vec3 {
		return [this.pos[0], this.pos[1] + this._tideOffset(this.colFrame), this.pos[2]];
	}

	draw(view: mat4, pMatrix: mat4) {
		if (this._res.mdl.length === 0) return;
		const mat = mat4.translate(mat4.create(), view, this._waterPos());
		mat4.scale(mat, mat, vec3.scale([0, 0, 0], this.scale, 16));
		this._res.mdl[0].draw(mat, pMatrix);
	}

	update() {
		this.colFrame++;
	}

	requireRes() {
		return { mdl: [] as { nsbmd: string }[] };
	}

	provideRes(r: ProvidedRes) {
		this._res = r;
	}

	getCollision() {
		const waterPos = this._waterPos();
		const mat = mat4.translate(mat4.create(), mat4.create(), waterPos);
		mat4.scale(mat, mat, vec3.mul([0, 0, 0], [16 * this._genCol.scale, 16 * this._genCol.scale, 16 * this._genCol.scale], this.scale));
		return {
			mat,
			frame: this.colFrame,
			tris: this._genCol.dat,
		};
	}
}
