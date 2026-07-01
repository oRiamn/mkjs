import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { MKDSCONST } from "../../engine/mkdsConst";
import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { modelPolyLocalBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { Item } from "../item";
import { Kart } from "../kart";
import { ObjDecor } from "../objDecor";

/** Constant world speed (units/frame @ 60 fps) for the entire route. */
const IRON_BALL_SPEED = 7;
/** setting2 low word values ≥ this encode a start delay (pinball_course route 5). */
const IRON_BALL_START_DELAY_LOW_THRESHOLD = 1000;
/** Retail pinball static mounts (0x01b3) leave setting1 at 0; route balls use 105/110 in the low word. */
export const IRON_BALL_DEFAULT_DIAMETER = 105;

/** World-space ball diameter from OBJI (0 = model default scale only). */
export function ironBallTargetDiameter(obji: nkm_section_OBJI): number {
	const encoded = obji.setting1 & 0xffff;
	if (encoded > 0) return encoded;
	// Wall-mounted iron balls (0x01b3) omit diameter in NKM; match the standard route ball size.
	if (obji.ID === 0x01b3) return IRON_BALL_DEFAULT_DIAMETER;
	return 0;
}

/** Decode OBJI start delay from pinball_course iron-ball instances. */
export function ironBallStartDelay(obji: nkm_section_OBJI): number {
	const setting1High = obji.setting1 >> 16;
	if (setting1High > 0) return setting1High;

	const setting2Low = obji.setting2 & 0xffff;
	if (setting2Low >= IRON_BALL_START_DELAY_LOW_THRESHOLD) return setting2Low;

	return obji.setting2 >> 16;
}

/**
 * Iron ball hazard (0x01b0 swinging ball / 0x01b3 static mount on pinball_course).
 *
 * --- POIT layout (nkm.ts) ---
 *   pointInd  (u8)  — stable id within the route; matched by unknown1 branches
 *   unknown2  (u8)  — segment sub-type on the *target* point (see below)
 *   duration  (u16) — present in NKM; not used for speed (constant IRON_BALL_SPEED).
 *   unknown1  (u32) — when ≠ OBJI_ROUTE_NONE (0xffff), names a pointInd to branch to
 *
 * --- OBJI (pinball_course) ---
 *   setting1 & 0xffff → ball diameter in world units (105 or 110 on route balls)
 *   0x01b3 static mounts leave setting1 at 0; retail uses the standard 105 u diameter.
 *   Start delay (frames @ 60 fps), three encodings on retail:
 *     1. setting1 >> 16           (ball 20, route 6: 3300 ≈ 55 s)
 *     2. setting2 & 0xffff ≥ 1000 (ball 15, route 5: 3300 ≈ 55 s)
 *     3. setting2 >> 16           (ball 12, route 4: 657 ≈ 11 s)
 *
 * --- Movement ---
 *   Constant speed (IRON_BALL_SPEED) along the PATH at all times — no per-segment
 *   variation from POIT `duration`, no acceleration smoothing. `duration` is still
 *   present in NKM data but not used for speed here.
 *
 * --- unknown1 (branch) ---
 *   Checked on the POIT just arrived at. When unknown1 names a pointInd (e.g. 72 on
 *   pts 75 and 80), the ball may divert to that index instead of walking to index + 1.
 *   On routes with branches: take the redirect every other visit; on the *last* POIT of
 *   the PATH, always take it. At end of PATH (no pending branch), restart from index 0.
 *
 * --- unknown2 ---
 *   u8 on the *target* POIT, value 0 or 1 on retail; set only on pts 35–36 / 68–69
 *   (the downhill roll pairs before each swing). Not used for movement here.
 *
 * --- pt78 interval timing (debug log "end of route in Xf", @ 60 fps, IRON_BALL_SPEED) ---
 *   Log fires each time the ball arrives at pointInd 78; X = frames since the previous
 *   visit. Values cluster around a short cycle plus whole multiples of one swing leg.
 *   Strict PGCD of logged intervals is 1 (±1 frame jitter at 7 u/frame, e.g. 916≈917).
 *
 *   Route 4 — ball 12:
 *     • Short cycle (skip branch @75, path 78→80→72→…→76→78): ~917 f (~15.3 s)
 *     • Swing leg (72→73→74→75): 251 f (~4.18 s)
 *     • Formula: interval ≈ 917 + n×251 (n = extra branch@75 taken since last pt78)
 *     • Examples: 1168 = 917+251, 1419 = 917+502, 1671 ≈ 917+754, 2174 ≈ 917+5×251
 *
 *   Route 6 — ball 20 (mirror of R4):
 *     • Short cycle (skip @75): ~922 f (~15.4 s)
 *     • Swing leg (72→75): 257 f (~4.28 s)
 *     • Formula: interval ≈ 922 + n×257
 *     • Examples: 1435 = 922+2×257, 1692 ≈ 922+3×257; 1179 = 922+257 rarely seen in logs
 *
 *   Taking unknown1 @75 adds one swing leg (+251 or +257 f) to the pt78→pt78 period;
 *   skipping @75 (continue to pt76) keeps the short cycle.
 *
 * --- Rendering ---
 *   IronBall.nsbmd is a flat disc; _yOffset lifts the mesh so the path anchor is the
 *   bottom of the ball. _drawScale fits the disc to setting1 diameter.
 */
export class IronBall extends ObjDecor {
	colRad: number;
	vel: vec3;
	knockbackDamage = MKDSCONST.DAMAGE_FLIP;
	private _route: nkm_section_POIT[];
	private _targetDiameter = 0;
	private _segFrom = 0;
	private _segTo = 1;
	/** Distance travelled along the current segment (world units). */
	private _segDist = 0;
	private _delayLeft = 0;
	/** Frames elapsed since movement started (excludes OBJI start delay). */
	private _routeFrame = 0;
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat: mat4;
	private _colFrame = 0;
	private _prevPos: vec3;
	private _scene: Scene;
	private _isStaticMount: boolean;

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this._isStaticMount = obji.ID === 0x01b3;
		this.colRad = 512;
		this.vel = vec3.create();
		this._colMat = mat4.create();
		this._prevPos = vec3.clone(this.pos);
		this._scene = scene;

		const targetDiameter = ironBallTargetDiameter(obji);
		if (targetDiameter > 0) {
			this._targetDiameter = targetDiameter;
		}

		this._route = obji.routeID !== MKDSCONST.OBJI_ROUTE_NONE ? scene.getRoute(obji.routeID) : [];

		if (this._route.length > 0) {
			vec3.copy(this.pos, this._route[0].pos);
			this._prevPos = vec3.clone(this.pos);
			this._delayLeft = ironBallStartDelay(obji);
		}
		if (this._route.length < 2) {
			this._segTo = 0;
		}
		this.collidable = this._route.length >= 2;
	}

	provideRes(r: ProvidedRes) {
		const poly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalBounds(poly.disp);

		if (this._targetDiameter > 0) {
			const modelDiameter = Math.max(bounds.width, bounds.height) * 16 * this.scale[0];
			if (modelDiameter > 0) {
				const fit = this._targetDiameter / modelDiameter;
				this._drawScale = [fit, fit, fit];
			}
		}

		const scaleY = this.scale[1] * this._drawScale[1];
		const world = modelWorldYExtent(bounds.min[1], bounds.max[1], scaleY);
		// Route POIT = bottom of ball; static OBJI.pos = model origin (center of disc).
		this._yOffset = this._isStaticMount ? 0 : world.height / 2;

		super.provideRes(r);
		if (!this.collidable) return;

		this._colRes = r.mdl[0].getBoundingCollisionModel(0, 0);
		for (let i = 0; i < this._colRes.dat.length; i++) {
			this._colRes.dat[i].CollisionType = MKDS_COLTYPE.KNOCKBACK_DAMAGE << 8;
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

	update(scn?: Scene) {
		if (this._route.length >= 2) {
			this._stepRoute();
			this._setColMat();
		} else {
			this.vel = [0, 0, 0];
		}
		super.update(scn);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "IronBall.nsbmd" }] };
	}

	private _stepRoute() {
		// Hold at spawn until OBJI start delay elapses (see ironBallStartDelay).
		if (this._delayLeft > 0) {
			this._delayLeft--;
			this.vel = [0, 0, 0];
			return;
		}

		this._routeFrame++;

		// Walk at fixed speed along the path, crossing POITs as needed.
		let move = IRON_BALL_SPEED;
		while (move > 0) {
			const len = vec3.distance(this._route[this._segFrom].pos, this._route[this._segTo].pos);
			const remain = len - this._segDist;
			if (move < remain) {
				this._segDist += move;
				move = 0;
			} else {
				move -= remain;
				this._segDist = 0;
				this._segFrom = this._segTo;
				this._advanceSegment();

			}
		}

		const from = this._route[this._segFrom].pos;
		const to = this._route[this._segTo].pos;
		const len = vec3.distance(from, to);
		const t = len > 0 ? this._segDist / len : 1;
		this.pos[0] = from[0] + (to[0] - from[0]) * t;
		this.pos[1] = from[1] + (to[1] - from[1]) * t;
		this.pos[2] = from[2] + (to[2] - from[2]) * t;

		vec3.sub(this.vel, this.pos, this._prevPos);
		this._prevPos = vec3.clone(this.pos);
	}

	private _advanceSegment() {
		const at = this._route[this._segFrom];
		const lastIdx = this._route.length - 1;

		// unknown1: optional branch to another pointInd (pendulum pts 75/80 → 72).
		if (at.unknown1 !== MKDSCONST.OBJI_ROUTE_NONE) {
			const branchIdx = this._route.findIndex((p) => p.pointInd === at.unknown1);
			if (branchIdx >= 0 && this._shouldTakeUnknown1Branch(this._segFrom, lastIdx)) {
				//this._logBranchTaken(at.unknown1);
				this._segTo = branchIdx;
				return;
			}
		}

		if (this._segFrom >= lastIdx) {
			// End of PATH: teleport state back to the first POIT and run again.
			this._restartRoute();
			return;
		}

		this._segTo = this._segFrom + 1;
	}

	/**
	 * Last POIT of the route: always follow unknown1.
	 * Earlier branch POITs: follow every other time (alternating take / skip).
	 */
	private _shouldTakeUnknown1Branch(atIdx: number, lastIdx: number): boolean {
		if (atIdx >= lastIdx) return true;

		return Math.random() > 1 / 2;
	}

	/** Reset segment state to route index 0 (start delay is not replayed). */
	private _restartRoute() {
		this._segFrom = 0;
		this._segTo = 1;
		this._segDist = 0;
		vec3.copy(this.pos, this._route[0].pos);
		this._prevPos = vec3.clone(this.pos);
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
		this._colFrame++;
	}
}
