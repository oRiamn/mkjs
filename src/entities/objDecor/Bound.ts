import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { MKDSCONST } from "../../engine/mkdsConst";
import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { Item } from "../item";
import { Kart } from "../kart";
import { ObjDecor } from "../objDecor";

/** Rest pitch when OBJI angle[0] is 0 (pinball_course jelly blocks). */
const BOUND_DEFAULT_PITCH = 10;
/** World units per frame along PATH/POIT (@ 60 fps). */
const BOUND_ROUTE_SPEED = 3;
/** Jelly wobble duration after a kart impact (@ 60 fps). */
const BOUND_WOBBLE_DURATION = 40;

/** Jelly block (0x01a8) on pinball_course / donkey_course / luigi_course. */
export class Bound extends ObjDecor {
	colRad: number;
	vel: vec3;
	private _route: nkm_section_POIT[];
	private _loopPath: boolean;
	private _restPitch: number;
	private _segFrom = 0;
	private _segTo = 1;
	private _segT = 0;
	private _wobbleLeft = 0;
	private _wobblePitch = 0;
	private _wobbleRoll = 0;
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat: mat4;
	private _colFrame = 0;
	private _prevPos: vec3;

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this._staringAtCamera = false;
		this.collidable = true;
		this.colRad = 512;
		this.vel = vec3.create();
		this._colMat = mat4.create();
		this._prevPos = vec3.clone(this.pos);
		this._restPitch = obji.angle[0] !== 0 ? obji.angle[0] : BOUND_DEFAULT_PITCH;

		this._route = obji.routeID !== MKDSCONST.OBJI_ROUTE_NONE ? scene.getRoute(obji.routeID) : [];
		const pathMeta = scene.nkm.sections.PATH.entries[obji.routeID];
		this._loopPath = pathMeta != null && pathMeta.loop !== 0;

		if (this._route.length > 0) {
			vec3.copy(this.pos, this._route[0].pos);
			this._prevPos = vec3.clone(this.pos);
		}
		if (this._route.length < 2) {
			this._segTo = 0;
		}
	}

	requireRes() {
		return { mdl: [{ nsbmd: "bound.nsbmd" }], other: [null, null, "bound.nsbtp"] };
	}

	provideRes(r: ProvidedRes) {
		super.provideRes(r);
		this._colRes = r.mdl[0].getBoundingCollisionModel(0, 0);
		for (let i = 0; i < this._colRes.dat.length; i++) {
			this._colRes.dat[i].CollisionType = MKDS_COLTYPE.WALL << 8;
		}
		this._setColMat();
	}

	getCollision() {
		if (!this._colRes) return { tris: [], mat: this._colMat, frame: 0 };
		return { tris: this._colRes.dat, mat: this._colMat, frame: this._colFrame };
	}

	moveWith(obj: Kart | Item) {
		vec3.add(obj.pos, obj.pos, this.vel);
	}

	onKartHit() {
		this._wobbleLeft = BOUND_WOBBLE_DURATION;
	}

	update(scn?: Scene) {
		if (this._route.length >= 2) {
			this._stepRoute();
		} else {
			this.vel = [0, 0, 0];
		}
		this._updateWobble();
		this._setColMat();
		super.update(scn);
	}

	draw(view: mat4, pMatrix: mat4) {
		const savedPitch = this.angle[0];
		const savedRoll = this.angle[2];
		this.angle[0] = this._restPitch + this._wobblePitch;
		this.angle[2] = savedRoll + this._wobbleRoll;
		super.draw(view, pMatrix);
		this.angle[0] = savedPitch;
		this.angle[2] = savedRoll;
	}

	private _updateWobble() {
		if (this._wobbleLeft <= 0) {
			this._drawScale = [1, 1, 1];
			this._wobblePitch = 0;
			this._wobbleRoll = 0;
			return;
		}

		const phase = BOUND_WOBBLE_DURATION - this._wobbleLeft + 1;
		const t = phase / BOUND_WOBBLE_DURATION;
		const decay = 1 - t;
		const wave = Math.sin(phase * 0.55) * decay;
		const bulge = Math.sin(Math.min(1, phase / 10) * Math.PI) * 0.12 * decay;

		this._drawScale = [1 + bulge + wave * 0.05, 1 - bulge * 0.45 - wave * 0.03, 1 + bulge + wave * 0.05];
		this._wobblePitch = wave * 4;
		this._wobbleRoll = Math.sin(phase * 0.4 + 0.7) * decay * 3;
		this._wobbleLeft--;
	}

	private _stepRoute() {
		const from = this._route[this._segFrom].pos;
		const to = this._route[this._segTo].pos;
		const dist = vec3.distance(from, to);
		const step = dist > 0 ? BOUND_ROUTE_SPEED / dist : 1;

		this._segT += step;
		if (this._segT >= 1) {
			this._segT = 0;
			vec3.copy(this.pos, to);
			this._segFrom = this._segTo;
			this._advanceSegment();
		} else {
			this.pos[0] = from[0] + (to[0] - from[0]) * this._segT;
			this.pos[1] = from[1] + (to[1] - from[1]) * this._segT;
			this.pos[2] = from[2] + (to[2] - from[2]) * this._segT;
		}

		vec3.sub(this.vel, this.pos, this._prevPos);
		this._prevPos = vec3.clone(this.pos);
	}

	private _advanceSegment() {
		if (this._loopPath) {
			this._segTo = (this._segTo + 1) % this._route.length;
			return;
		}
		let next = this._segTo + 1;
		if (next >= this._route.length) next = 0;
		this._segTo = next;
	}

	private _setColMat() {
		if (!this._colRes) return;
		const mat = mat4.create();
		mat4.translate(mat, mat, this._placementPos());

		const pitch = (this._restPitch + this._wobblePitch) * (Math.PI / 180);
		const roll = (this.angle[2] + this._wobbleRoll) * (Math.PI / 180);
		if (roll !== 0) mat4.rotateZ(mat, mat, roll);
		if (this.angle[1] !== 0) mat4.rotateY(mat, mat, this.angle[1] * (Math.PI / 180));
		if (pitch !== 0) mat4.rotateX(mat, mat, pitch);

		mat4.scale(mat, mat, vec3.scale(vec3.create(), vec3.mul(vec3.create(), this.scale, this._drawScale), 16));
		mat4.scale(this._colMat, mat, [this._colRes.scale, this._colRes.scale, this._colRes.scale]);
		this._colFrame++;
	}
}
