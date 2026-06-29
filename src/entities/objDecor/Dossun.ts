import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { modelPolyLocalYBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { ObjDecor } from "../objDecor";

const DOSSUN_RISE_DURATION = 60 * 4;
const DOSSUN_FALL_DURATION = 15;
const DOSSUN_WIGGLE_DURATION = 60;
const DOSSUN_WIGGLE_AMP = 5;
const DOSSUN_WIGGLE_SPEED = 0.45;
const DOSSUN_PEEK_DURATION = 15;
const DOSSUN_PEEK_OFFSET = 15;
/** World units per frame for generic move (0x3), same factor as route platforms. */
const DOSSUN_MOVE_SPEED = 1 / 6;

enum DossunPhase {
	Wait,
	Wiggle,
	Peek,
	Move,
}

enum DossunMoveType {
	Rise = 0x1,
	Fall = 0x2,
	Move = 0x3,
}

/** Thwomp / granite block (OBJI id 0x0193).
 *
 * --- Understanding from ROM data (NKM) ---
 *
 * Route link: OBJI.routeID → scene.paths[routeID].
 *
 * PATH section (metadata):
 *   routeID  — route identifier
 *   loop     — 0 = ping-pong, ≠ 0 = loop
 *   numPts   — number of points
 *
 * POIT section (scene.paths[routeID], one entry per point):
 *   pos      — target 3D position [x, y, z] (world units)
 *   pointInd — point index within the route
 *   duration — wait delay (frames @ 60 fps) before executing the move toward this point
 *   unknown1  — movement type used to reach this point
 *   nextOff  — parser-internal offset (unused in-game)
 *
 * Typical case: 2 points at the same X/Z — point 0 on the ground (low y), point 1 in the air (high y).
 * Spawns at point 0 pos.
 *
 * Behaviour is driven by the *target* point (the one being moved toward), not a hard-coded sequence.
 * Each step:
 *   1. pos      — destination of the next move (interpolated from current position)
 *   2. duration — hold still for N frames, then execute the move toward this point
 *   3. unknown1  — how to get there (rise/fall durations are gameplay constants):
 *        0x1 rise — ascent, 240 frames (4 s)
 *        0x2 fall — drop,   15 frames
 *        0x3 move — generic move, constant speed until the target is reached
 *
 * Route cycle (at point i, target = point (i+1) % numPts):
 *   point 0 → wait target.duration → move with target.unknown1 toward target.pos
 *         → … loop …
 *
 * Extra sequence before a fall (ARM9 behaviour, not described in POIT):
 *   wait (fall target) → wiggle (visual shake, 1 s) → peek (+Y offset, 15 f)
 *   → fall toward target.pos
 *   No wiggle/peek before a rise or move.
 *
 * Collision:
 *   always active; WALL by default, KNOCKBACK_DAMAGE only during fall (0x2).
 *
 * ROM assets: dossun.nsbmd (no nsbca/nsbta animation on the original object).
 */
export class Dossun extends ObjDecor {
	colRad: number;
	knockbackDamage = 3;
	private _route: nkm_section_POIT[];
	private _atPointIdx = 0;
	private _targetPoint!: nkm_section_POIT;
	private _phase = DossunPhase.Wait;
	private _frame = 0;
	private _moveStartPos = vec3.create();
	private _moveDur = 1;
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat: mat4;
	private _colFrame = 0;
	private _wiggleZ = 0;
	private _peekStartY = 0;

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this._staringAtCamera = false;
		this.collidable = true;
		this.colRad = 512;
		this._colMat = mat4.create();

		this._route = scene.getRoute(obji.routeID);
		if (this._route.length > 0) {
			vec3.copy(this.pos, this._route[0].pos);
			this._atPointIdx = 0;
			this._beginWait();
		}
	}

	requireRes() {
		return {
			mdl: [
				{ nsbmd: "dossun.nsbmd" },
				//{ nsbmd: "dossun_shadow.nsbmd" } // shadow looks ugly
			],
		};
	}

	provideRes(r: ProvidedRes) {
		const poly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalYBounds(poly.disp);
		const world = modelWorldYExtent(bounds.minY, bounds.maxY, this.scale[1]);
		this._yOffset = -world.bottom;

		super.provideRes(r);
		this._colRes = r.mdl[0].getBoundingCollisionModel(0, 0);
		this._updateColType();
		this._setColMat();
	}

	getCollision() {
		if (!this._colRes) return { tris: [], mat: this._colMat, frame: 0 };
		return {
			tris: this._colRes.dat,
			mat: this._colMat,
			frame: this._colFrame,
		};
	}

	update(_scn?: Scene) {
		if (this._route.length < 2) {
			this._setColMat();
			this._colFrame++;
			super.update(_scn);
			return;
		}

		switch (this._phase) {
			case DossunPhase.Wait:
				if (++this._frame >= this._targetPoint.duration) {
					if (this._targetPoint.unknown1 === DossunMoveType.Fall) {
						this._beginWiggle();
					} else {
						this._beginMove();
					}
				}
				break;
			case DossunPhase.Wiggle:
				this._wiggleZ = Math.sin(this._frame * DOSSUN_WIGGLE_SPEED) * DOSSUN_WIGGLE_AMP;
				if (++this._frame >= DOSSUN_WIGGLE_DURATION) {
					this._beginPeek();
				}
				break;
			case DossunPhase.Peek: {
				const t = Math.min(1, this._frame / DOSSUN_PEEK_DURATION);
				this.pos[1] = this._peekStartY + DOSSUN_PEEK_OFFSET * t;
				if (++this._frame >= DOSSUN_PEEK_DURATION) {
					this.pos[1] = this._peekStartY + DOSSUN_PEEK_OFFSET;
					this._beginMove();
				}
				break;
			}
			case DossunPhase.Move: {
				const t = Math.min(1, this._frame / this._moveDur);
				for (let i = 0; i < 3; i++) {
					this.pos[i] = this._moveStartPos[i] + (this._targetPoint.pos[i] - this._moveStartPos[i]) * t;
				}
				if (++this._frame >= this._moveDur) {
					vec3.copy(this.pos, this._targetPoint.pos);
					this._atPointIdx = this._nextPointIdx();
					this._beginWait();
				}
				break;
			}
		}

		this._setColMat();
		this._colFrame++;
		super.update(_scn);
	}

	private _nextPointIdx(): number {
		return (this._atPointIdx + 1) % this._route.length;
	}

	private _beginWait() {
		this._phase = DossunPhase.Wait;
		this._frame = 0;
		this._wiggleZ = 0;
		this._targetPoint = this._route[this._nextPointIdx()];
		this._updateColType();
	}

	private _beginWiggle() {
		this._phase = DossunPhase.Wiggle;
		this._frame = 0;
		this._wiggleZ = 0;
		this._updateColType();
	}

	private _beginPeek() {
		this._phase = DossunPhase.Peek;
		this._frame = 0;
		this._wiggleZ = 0;
		this._peekStartY = this.pos[1];
		this._updateColType();
	}

	private _beginMove() {
		this._phase = DossunPhase.Move;
		this._frame = 0;
		vec3.copy(this._moveStartPos, this.pos);
		this._moveDur = this._moveDuration(this._targetPoint.unknown1);
		this._updateColType();
	}

	private _moveDuration(moveType: number): number {
		switch (moveType) {
			case DossunMoveType.Rise:
				return DOSSUN_RISE_DURATION;
			case DossunMoveType.Fall:
				return DOSSUN_FALL_DURATION;
			default: {
				const delta = vec3.sub(vec3.create(), this._targetPoint.pos, this._moveStartPos);
				return Math.max(1, Math.ceil(vec3.length(delta) / DOSSUN_MOVE_SPEED));
			}
		}
	}

	private _updateColType() {
		if (!this._colRes) return;
		const falling = this._phase === DossunPhase.Move && this._targetPoint.unknown1 === DossunMoveType.Fall;
		const colType = falling ? MKDS_COLTYPE.KNOCKBACK_DAMAGE : MKDS_COLTYPE.WALL;
		const packed = colType << 8;
		for (let i = 0; i < this._colRes.dat.length; i++) {
			this._colRes.dat[i].CollisionType = packed;
		}
	}

	draw(view: mat4, pMatrix: mat4) {
		if (this._phase === DossunPhase.Wiggle) {
			this.angle[2] += this._wiggleZ;
			super.draw(view, pMatrix);
			this.angle[2] -= this._wiggleZ;
			return;
		}
		super.draw(view, pMatrix);
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
