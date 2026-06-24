import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { modelPolyLocalYBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { ObjDecor } from "../objDecor";

/** Default vertical travel when no PATH is linked (world units). */
const DOSSUN_DEFAULT_LIFT = 100;
/** Default segment durations (frames) from old_koopa_agb POIT routes. */
const DOSSUN_DEFAULT_RISE_DUR = 40;
const DOSSUN_DEFAULT_FALL_DUR = 20;
/** Frames to wait at the raised position before dropping. */
const DOSSUN_AIR_HOLD = 3*60;

/** Thwomp / granite block (0x0193).
 *
 * ROM assets: dossun.nsbmd + dossun_shadow.nsbmd (no skeletal animation).
 *
 * Vertical motion comes from the linked PATH/POIT route when present; OBJI settings
 * override or default when routeID is 65535:
 * - setting1 >> 16: rise duration (frames)
 * - setting1 & 0xffff: fall duration (frames)
 * - setting2: start delay (frames)
 *
 * Shipped routes (old_koopa_agb) use two POITs with the same X/Z and different Y.
 * POIT[i].duration is the travel time from point i to point i+1:
 * - segment 0→1: slow rise (40 frames on old_koopa_agb)
 * - segment 1→0: fast fall (20 frames)
 * - 80 frames hold at the raised position before falling
 *
 * Only pos[1] is driven by the route; X/Z stay at the OBJI placement.
 */
export class Dossun extends ObjDecor {
	colRad: number;
	knockbackDamage = 3; // DAMAGE_STOMP — thwomp flatten
	private _route: nkm_section_POIT[] | null;
	private _riseDur: number;
	private _fallDur: number;
	private _startDelay: number;
	private _restY: number;
	private _raisedY: number;
	private _seg = 0;
	private _segTime = 0;
	private _delayLeft: number;
	private _airHoldLeft = 0;
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat: mat4;
	private _colFrame = 0;

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this._staringAtCamera = false;
		this.collidable = true;
		this.colRad = 512;
		this._colMat = mat4.create();

		this._route = obji.routeID !== 65535 ? scene.paths[obji.routeID] : null;
		this._restY = this._route?.[0]?.pos[1] ?? obji.pos[1];
		this._raisedY = this._route?.[1]?.pos[1] ?? this._restY - DOSSUN_DEFAULT_LIFT;

		const riseFromRoute = this._route?.[0]?.duration ?? 0;
		const fallFromRoute = this._route?.[1]?.duration ?? 0;
		this._riseDur = (obji.setting1 >> 16) || riseFromRoute || DOSSUN_DEFAULT_RISE_DUR;
		this._fallDur = (obji.setting1 & 0xffff) || fallFromRoute || DOSSUN_DEFAULT_FALL_DUR;
		this._startDelay = obji.setting2;
		this._delayLeft = this._startDelay;

		this.pos[1] = this._restY;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "dossun.nsbmd" }, { nsbmd: "dossun_shadow.nsbmd" }] };
	}

	provideRes(r: ProvidedRes) {
		const poly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalYBounds(poly.disp);
		const world = modelWorldYExtent(bounds.minY, bounds.maxY, this.scale[1]);
		this._yOffset = -world.bottom;

		super.provideRes(r);
		this._colRes = r.mdl[0].getBoundingCollisionModel(0, 0);
		for (let i = 0; i < this._colRes.dat.length; i++) {
			this._colRes.dat[i].CollisionType = MKDS_COLTYPE.KNOCKBACK_DAMAGE << 8;
		}
		this._setColMat();
	}

	getCollision() {
		if (!this._colRes) return { tris: [], mat: this._colMat, frame: 0 };
		return {
			tris: this._hitActive() ? this._colRes.dat : [],
			mat: this._colMat,
			frame: this._colFrame,
		};
	}

	update(_scn?: Scene) {
		if (this._delayLeft > 0) {
			this._delayLeft--;
			this.pos[1] = this._restY;
		} else if (this._airHoldLeft > 0) {
			this._airHoldLeft--;
			this.pos[1] = this._raisedY;
		} else if (this._route != null && this._route.length >= 2) {
			this._stepRoute();
		} else {
			this._stepDefault();
		}

		this._setColMat();
		this._colFrame++;
		super.update(_scn);
	}

	private _stepRoute() {
		const route = this._route!;
		const next = (this._seg + 1) % route.length;
		const from = route[this._seg];
		const to = route[next];
		const dur = this._seg === 0 ? this._riseDur : this._fallDur;
		this._segTime++;
		const t = Math.min(1, this._segTime / dur);
		this.pos[1] = from.pos[1] + (to.pos[1] - from.pos[1]) * t;

		if (this._segTime >= dur) {
			this._seg = next;
			this._segTime = 0;
			this.pos[1] = to.pos[1];
			if (this._seg === 1) this._airHoldLeft = DOSSUN_AIR_HOLD;
		}
	}

	private _stepDefault() {
		// No PATH: alternate between rest and raised using OBJI timing settings.
		const rising = this._seg === 0;
		const dur = rising ? this._riseDur : this._fallDur;
		const fromY = rising ? this._restY : this._raisedY;
		const toY = rising ? this._raisedY : this._restY;
		this._segTime++;
		const t = Math.min(1, this._segTime / dur);
		this.pos[1] = fromY + (toY - fromY) * t;

		if (this._segTime >= dur) {
			this._seg = rising ? 1 : 0;
			this._segTime = 0;
			this.pos[1] = toY;
			if (this._seg === 1) this._airHoldLeft = DOSSUN_AIR_HOLD;
		}
	}

	private _hitActive(): boolean {
		if (this._delayLeft > 0 || this._airHoldLeft > 0) return false;
		if (this._route != null && this._route.length >= 2) {
			return this._seg === 1 && this._segTime / this._fallDur >= 0.5;
		}
		return this._seg === 1 && this._segTime / this._fallDur >= 0.5;
	}

	private _setColMat() {
		if (!this._colRes) return;
		const p = this._placementPos();
		const mat = mat4.create();
		mat4.translate(mat, mat, p);
		if (this.angle[2] != 0) mat4.rotateZ(mat, mat, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] != 0) mat4.rotateY(mat, mat, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] != 0) mat4.rotateX(mat, mat, this.angle[0] * (Math.PI / 180));
		mat4.scale(mat, mat, vec3.scale(vec3.create(), vec3.mul(vec3.create(), this.scale, this._drawScale), 16));
		mat4.scale(this._colMat, mat, [this._colRes.scale, this._colRes.scale, this._colRes.scale]);
	}
}
