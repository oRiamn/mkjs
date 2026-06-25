import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { nkm_section_OBJI } from "../../formats/nkm";
import { nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { modelPolyLocalYBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { ObjDecor } from "../objDecor";

/** Jump arc duration in frames (same for every instance). */
const CHOROPU_JUMP_DUR = 38;
/** Peak height above ground in world units (choropu mesh height 13 × 3 at scale 1). */
const CHOROPU_JUMP_HEIGHT = 39;
/** Hidden time between jumps before NKM setting1 offsets */
const CHOROPU_HIDE_BASE = 100;
/** Head peek before jump (1 s at 60 fps). */
const CHOROPU_LURK_DUR = 60;
/** Fraction of body height visible during lurk (top of head). */
const CHOROPU_LURK_PEEK = 0.35;

/** Peach Gardens / Moo Moo Meadows Monty Mole (0x0199).
 *
 * ROM assets (per course CARC): choropu.nsbmd + choropu.nsbtp only.
 * No nsbca / nsbta — the mesh has no skeleton; nsbtp has 2 texture frames (normal / hit).
 *
 * Timing comes from NKM OBJI settings (not from model bounds):
 * - setting1 >> 16: hide duration (frames), e.g. 600 on garden_course
 * - setting1 & 0xffff: show duration (frames), e.g. 120 on garden_course
 * - setting2: start delay (frames)
 *
 * Hide interval = CHOROPU_HIDE_BASE + both halves of setting1 (instances with hide=0
 * still wait at least the base time; the low half desynchronises staggered moles).
 *
 * Cycle: delay → lurk (head peek) → show (jump) → hide → lurk → …
 *
 * The vertical jump/burrow motion is handled by the original ARM9 object code
 * (likely sinThing-style easing), not by asset animation files.
 * routeID is always 65535 (no path) on DS tracks.
 */
export class Choropu extends ObjDecor {
	colRad: number;
	private _hideDur: number;
	private _startDelay: number;
	private _frame = 0;
	private _phase: "delay" | "lurk" | "show" | "hide";
	private _visible = false;
	private _surfaceY = 0;
	private _buryDepth = 0;
	private _lurkY = 0;
	private _jumpArc = 0;
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat: mat4;
	private _colFrame = 0;

	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
		this.collidable = true;
		this.colRad = 512;
		this._colMat = mat4.create();
		this._hideDur = CHOROPU_HIDE_BASE + (obji.setting1 >> 16) + (obji.setting1 & 0xffff);
		this._startDelay = obji.setting2;
		this._phase = "delay";
	}

	requireRes() {
		return { mdl: [{ nsbmd: "choropu.nsbmd" }], other: [null, null, "choropu.nsbtp"] };
	}

	provideRes(r: ProvidedRes) {
		const poly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalYBounds(poly.disp);
		const world = modelWorldYExtent(bounds.minY, bounds.maxY, this.scale[1]);
		this._surfaceY = -world.bottom;
		this._buryDepth = world.height;
		this._lurkY = this._surfaceY - this._buryDepth * (1 - CHOROPU_LURK_PEEK);

		super.provideRes(r);
		this.setDecorTexFrame(0);
		this._yOffset = this._surfaceY - this._buryDepth;
		this._colRes = r.mdl[0].getBoundingCollisionModel(0, 0);
		for (let i = 0; i < this._colRes.dat.length; i++) {
			this._colRes.dat[i].CollisionType = MKDS_COLTYPE.KNOCKBACK_DAMAGE << 8;
		}
		this._setColMat();
	}

	getCollision() {
		return {
			tris: this._visible && this._jumpArc > 0.3 ? this._colRes.dat : [],
			mat: this._colMat,
			frame: this._colFrame,
		};
	}

	onKartHit() {
		this.setDecorTexFrame(1);
	}

	update(_scn?: Scene) {
		this._frame++;

		switch (this._phase) {
			case "delay":
				this._visible = false;
				this._jumpArc = 0;
				this._yOffset = this._surfaceY - this._buryDepth;
				this._drawScale = [1, 1, 1];
				if (this._frame >= this._startDelay) {
					this._phase = "lurk";
					this._frame = 0;
				}
				break;
			case "lurk":
				this._jumpArc = 0;
				this._yOffset = this._lurkY;
				this._drawScale = [1, 1, 1];
				if (this._frame === 1) this.setDecorTexFrame(0);
				this._visible = true;
				if (this._frame >= CHOROPU_LURK_DUR) {
					this._phase = "show";
					this._frame = 0;
				}
				break;
			case "show": {
				if (this._frame === 1) this.setDecorTexFrame(1);
				const t = Math.min(1, this._frame / CHOROPU_JUMP_DUR);
				this._jumpArc = Math.sin(t * Math.PI);
				this._yOffset = this._surfaceY - this._buryDepth * (1 - this._jumpArc) + CHOROPU_JUMP_HEIGHT * this._jumpArc;
				this._visible = this._jumpArc > 0.01;

				const vy = Math.cos(t * Math.PI);
				this._drawScale = [1 - vy * 0.05, 1 + vy * 0.1, 1 - vy * 0.05];

				if (this._frame >= CHOROPU_JUMP_DUR) {
					this._phase = "hide";
					this._frame = 0;
					this._visible = false;
				}
				break;
			}
			case "hide":
				if (this._frame === 1) this.setDecorTexFrame(0);
				this._visible = false;
				this._jumpArc = 0;
				this._yOffset = this._surfaceY - this._buryDepth;
				this._drawScale = [1, 1, 1];
				if (this._frame >= this._hideDur) {
					this._phase = "lurk";
					this._frame = 0;
				}
				break;
		}

		if (this._visible) {
			this._setColMat();
			this._colFrame++;
		}

		super.update(_scn);
	}

	draw(view: mat4, pMatrix: mat4) {
		if (!this._visible) return;
		super.draw(view, pMatrix);
	}

	private _setColMat() {
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
