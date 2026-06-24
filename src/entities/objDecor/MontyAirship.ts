import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { nkm_section_OBJI } from "../../formats/nkm";
import { nitroModel, nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { nitroRender } from "../../render/nitroRender";
import { modelPolyLocalYBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { ObjDecor } from "../objDecor";

/** Frames to slide poo up or down. */
const MONTY_MOVE_DUR = 24;
/** Frames poo stays fully out. */
const MONTY_OUT_DUR = 90;
/** Frames poo stays buried before rising again. */
const MONTY_HIDE_DUR = 120;
/** Raise hole/cover rim above OBJI Y (world units). */
const MONTY_GROUND_LIFT = 1;
/** Cover sits slightly above hole rim when poo is buried. */
const MONTY_COVER_ABOVE_HOLE = 1;

/** Airship Fortress Monty Mole (0x01a7).
 *
 * ROM assets (airship_course CARC): poo.nsbmd + cover.nsbmd + hole.nsbmd + poo.nsbtp.
 * - hole.nsbmd stays fixed at the OBJI placement
 * - cover.nsbmd follows poo vertically, stacked above it
 * - poo.nsbmd slides in and out; only poo has collision
 *
 * NKM timing:
 * - setting1: start delay / stagger (frames), 240–370 on airship_course
 */
export class MontyAirship extends ObjDecor {
	colRad: number;
	private _mdl!: nitroModel[];
	private _startDelay: number;
	private _frame = 0;
	private _phase: "delay" | "rise" | "out" | "sink" | "hide";
	private _pooY = 0;
	private _buriedY = 0;
	private _outY = 0;
	private _holeY = 0;
	private _coverDelta = 0;
	private _pooDrop = 0;
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat: mat4;
	private _colFrame = 0;
	private _drawMat = mat4.create();

	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this.collidable = true;
		this._staringAtCamera = false;
		this.colRad = 512;
		this._colMat = mat4.create();
		this._startDelay = obji.setting1;
		this._phase = "delay";
		this.setDecorTexFrame(1);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "poo.nsbmd" }, { nsbmd: "cover.nsbmd" }, { nsbmd: "hole.nsbmd" }], other: [null, null, "poo.nsbtp"] };
	}

	provideRes(r: ProvidedRes) {
		const poly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalYBounds(poly.disp);
		const world = modelWorldYExtent(bounds.minY, bounds.maxY, this.scale[1]);
		const surfaceY = -world.bottom;
		this._outY = surfaceY;
		this._buriedY = surfaceY - world.height;
		this._pooY = this._buriedY;
		this._pooDrop = -world.height / 2;

		const holePoly = r.mdl[2].bmd.modelData.objectData[0].polys.objectData[0];
		const holeBounds = modelPolyLocalYBounds(holePoly.disp);
		const holeWorld = modelWorldYExtent(holeBounds.minY, holeBounds.maxY, this.scale[1]);
		this._holeY = holeWorld.top + MONTY_GROUND_LIFT;
		this._coverDelta = this._holeY + MONTY_COVER_ABOVE_HOLE - this._buriedY;

		super.provideRes(r);
		this._mdl = r.mdl;
		this._mdl[0].setFrame(1);
		this._enableBillboard(r.mdl[0]);
		this._colRes = r.mdl[0].getBoundingCollisionModel(0, 0);
		for (let i = 0; i < this._colRes.dat.length; i++) {
			this._colRes.dat[i].CollisionType = MKDS_COLTYPE.KNOCKBACK_DAMAGE << 8;
		}
	}

	getCollision() {
		return {
			tris: this._pooCollides() ? this._colRes.dat : [],
			mat: this._colMat,
			frame: this._colFrame,
		};
	}

	update(_scn?: Scene) {
		this._frame++;

		switch (this._phase) {
			case "delay":
				this._pooY = this._buriedY;
				if (this._frame >= this._startDelay) {
					this._phase = "rise";
					this._frame = 0;
				}
				break;
			case "rise": {
				const t = Math.min(1, this._frame / MONTY_MOVE_DUR);
				this._pooY = this._buriedY + (this._outY - this._buriedY) * t;
				if (this._frame >= MONTY_MOVE_DUR) {
					this._phase = "out";
					this._frame = 0;
					this._pooY = this._outY;
				}
				break;
			}
			case "out":
				this._pooY = this._outY;
				if (this._frame >= MONTY_OUT_DUR) {
					this._phase = "sink";
					this._frame = 0;
				}
				break;
			case "sink": {
				const t = Math.min(1, this._frame / MONTY_MOVE_DUR);
				this._pooY = this._outY + (this._buriedY - this._outY) * t;
				if (this._frame >= MONTY_MOVE_DUR) {
					this._phase = "hide";
					this._frame = 0;
					this._pooY = this._buriedY;
				}
				break;
			}
			case "hide":
				this._pooY = this._buriedY;
				if (this._frame >= MONTY_HIDE_DUR) {
					this._phase = "rise";
					this._frame = 0;
				}
				break;
		}

		if (this._pooCollides()) {
			this._setColMat();
			this._colFrame++;
		}
	}

	draw(view: mat4, pMatrix: mat4) {
		this._drawPart(view, pMatrix, this._holeY, 2, false);
		if (this._pooVisible()) {
			nitroRender.setShadBias(0.001);
			this._drawPart(view, pMatrix, this._pooY + this._pooDrop, 0, true);
			nitroRender.resetShadOff();
		}
		this._drawPart(view, pMatrix, this._pooY + this._coverDelta, 1, false);
	}

	private _pooVisible(): boolean {
		return this._phase !== "delay" && this._phase !== "hide";
	}

	private _pooCollides(): boolean {
		return this._pooVisible() && this._pooY > this._buriedY + (this._outY - this._buriedY) * 0.4;
	}

	private _drawPart(view: mat4, pMatrix: mat4, yOffset: number, modelIndex: number, billboard: boolean) {
		const p: vec3 = [this.pos[0], this.pos[1] + yOffset, this.pos[2]];
		mat4.translate(this._drawMat, view, p);

		if (this.angle[2] != 0) mat4.rotateZ(this._drawMat, this._drawMat, this.angle[2] * (Math.PI / 180));
		if (!billboard && this.angle[1] != 0) mat4.rotateY(this._drawMat, this._drawMat, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] != 0) mat4.rotateX(this._drawMat, this._drawMat, this.angle[0] * (Math.PI / 180));

		mat4.scale(this._drawMat, this._drawMat, vec3.scale(vec3.create(), this.scale, 16));

		this._mdl[modelIndex].draw(this._drawMat, pMatrix);
	}

	private _enableBillboard(mdl: nitroModel) {
		const bmd = mdl.bmd;
		bmd.hasBillboards = true;
		for (let i = 0; i < bmd.modelData.objectData.length; i++) {
			const objs = bmd.modelData.objectData[i].objects.objectData;
			for (let j = 0; j < objs.length; j++) {
				objs[j].billboardMode = 2;
			}
		}
	}

	private _setColMat() {
		const p: vec3 = [this.pos[0], this.pos[1] + this._pooY + this._pooDrop, this.pos[2]];
		const mat = mat4.create();
		mat4.translate(mat, mat, p);
		if (this.angle[2] != 0) mat4.rotateZ(mat, mat, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] != 0) mat4.rotateY(mat, mat, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] != 0) mat4.rotateX(mat, mat, this.angle[0] * (Math.PI / 180));
		mat4.scale(mat, mat, vec3.scale(vec3.create(), this.scale, 16));
		mat4.scale(this._colMat, mat, [this._colRes.scale, this._colRes.scale, this._colRes.scale]);
	}
}
