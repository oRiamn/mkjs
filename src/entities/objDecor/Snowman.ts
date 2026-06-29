import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { nkm_section_OBJI } from "../../formats/nkm";
import { nitroModel, nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { nitroRender } from "../../render/nitroRender";
import { modelPolyLocalBounds, modelPolyLocalYBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { ObjDecor } from "../objDecor";

/** Sink the head into the body by this fraction of the top mesh height. */
const SNOWMAN_TOP_SINK = 0.2;
/** Max head roll from centre pivot (degrees). */
const SNOWMAN_HEAD_SWING = 20;
/** Head roll speed (@ 60 fps). */
const SNOWMAN_HEAD_SPEED = 0.04;

/** Snowman (0x019d). sman_bottom + sman_top stacked; bottom blocks like a wall. */
export class Snowman extends ObjDecor {
	colRad: number;
	private _mdl: nitroModel[] = [];
	private _bottomY = 0;
	private _topY = 0;
	private _headCenterLocal: vec3 = [0, 0, 0];
	private _headRoll = 0;
	private _frame = 0;
	private _phase = 0;
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat: mat4;
	private _colFrame = 0;
	private _drawMat = mat4.create();

	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		// ROM meshes have no billboard flag; apply Y billboard in draw() instead.
		this._staringAtCamera = false;
		this.collidable = true;
		this.colRad = 512;
		this._colMat = mat4.create();
		this._phase = ((obji.pos[0] + obji.pos[2]) * 0.17) % (Math.PI * 2);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "sman_bottom.nsbmd" }, { nsbmd: "sman_top.nsbmd" }] };
	}

	provideRes(r: ProvidedRes) {
		const bottomPoly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bottomBounds = modelPolyLocalYBounds(bottomPoly.disp);
		const bottomWorld = modelWorldYExtent(bottomBounds.minY, bottomBounds.maxY, this.scale[1]);

		const topPoly = r.mdl[1].bmd.modelData.objectData[0].polys.objectData[0];
		const topBounds = modelPolyLocalYBounds(topPoly.disp);
		const topWorld = modelWorldYExtent(topBounds.minY, topBounds.maxY, this.scale[1]);

		this._bottomY = -bottomWorld.bottom;
		this._topY = this._bottomY + bottomWorld.top - topWorld.bottom - topWorld.height * SNOWMAN_TOP_SINK;
		this._headCenterLocal = modelPolyLocalBounds(topPoly.disp).center;

		super.provideRes(r);
		this._mdl = r.mdl;
		for (let i = 0; i < this._mdl.length; i++) {
			this._clearBillboards(this._mdl[i]);
		}

		this._colRes = r.mdl[0].getBoundingCollisionModel(0, 0);
		for (let i = 0; i < this._colRes.dat.length; i++) {
			this._colRes.dat[i].CollisionType = MKDS_COLTYPE.WALL << 8;
		}
		this._setColMat();
	}

	getCollision() {
		return { tris: this._colRes.dat, mat: this._colMat, frame: this._colFrame };
	}

	update(scn?: Scene) {
		const t = this._frame * SNOWMAN_HEAD_SPEED + this._phase;
		this._headRoll = Math.sin(t) * ((SNOWMAN_HEAD_SWING * Math.PI) / 180);
		this._frame++;
		super.update(scn);
	}

	draw(view: mat4, pMatrix: mat4) {
		nitroRender.setShadBias(0.001);
		const scaleVec = vec3.scale(vec3.create(), vec3.mul(vec3.create(), this.scale, this._drawScale), 16);
		this._drawBillboardPart(view, pMatrix, this._bottomY, 0, scaleVec);
		this._drawBillboardPart(view, pMatrix, this._topY, 1, scaleVec, this._headCenterLocal, this._headRoll);
		nitroRender.resetShadOff();
	}

	private _drawBillboardPart(
		view: mat4,
		pMatrix: mat4,
		yOffset: number,
		modelIndex: number,
		scaleVec: vec3,
		pivotLocal?: vec3,
		roll = 0
	) {
		const worldOrigin: vec3 = [this.pos[0], this.pos[1] + yOffset, this.pos[2]];
		mat4.translate(this._drawMat, view, worldOrigin);
		this._applyObjiRotation(this._drawMat);
		mat4.multiply(this._drawMat, this._drawMat, nitroRender.yBillboardMat);
		if (pivotLocal != null) {
			const scaledCenter = vec3.mul(vec3.create(), pivotLocal, scaleVec);
			mat4.translate(this._drawMat, this._drawMat, scaledCenter);
			if (roll !== 0) mat4.rotateZ(this._drawMat, this._drawMat, roll);
			mat4.translate(this._drawMat, this._drawMat, vec3.negate(vec3.create(), scaledCenter));
		}
		mat4.scale(this._drawMat, this._drawMat, scaleVec);
		this._mdl[modelIndex].draw(this._drawMat, pMatrix);
	}

	private _applyObjiRotation(mat: mat4) {
		if (this.angle[2] !== 0) mat4.rotateZ(mat, mat, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] !== 0) mat4.rotateY(mat, mat, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] !== 0) mat4.rotateX(mat, mat, this.angle[0] * (Math.PI / 180));
	}

	private _clearBillboards(mdl: nitroModel) {
		const bmd = mdl.bmd;
		bmd.hasBillboards = false;
		for (let i = 0; i < bmd.modelData.objectData.length; i++) {
			const objs = bmd.modelData.objectData[i].objects.objectData;
			for (let j = 0; j < objs.length; j++) {
				objs[j].billboardMode = 0;
			}
		}
	}

	private _setColMat() {
		const p: vec3 = [this.pos[0], this.pos[1] + this._bottomY, this.pos[2]];
		const mat = mat4.create();
		mat4.translate(mat, mat, p);
		this._applyObjiRotation(mat);
		mat4.scale(mat, mat, vec3.scale(vec3.create(), this.scale, 16));
		mat4.scale(this._colMat, mat, [this._colRes.scale, this._colRes.scale, this._colRes.scale]);
	}
}
