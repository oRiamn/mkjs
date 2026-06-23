import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { nkm_section_OBJI } from "../../formats/nkm";
import { nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { modelPolyLocalYBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { ObjDecor } from "../objDecor";

export class EarthenPipe extends ObjDecor {
	colRad: number;
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat: mat4;
	private _colFrame: number;

	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
		this.collidable = true;
		this.colRad = 512;
		this._colMat = mat4.create();
		this._colFrame = 0;
		this.setDecorTexFrame(0);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "earthen_pipe1.nsbmd" }] };
	}

	provideRes(r: ProvidedRes) {
		const poly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalYBounds(poly.disp);
		const world = modelWorldYExtent(bounds.minY, bounds.maxY, this.scale[1]);
		this._yOffset = -world.bottom;

		super.provideRes(r);
		this._colRes = r.mdl[0].getBoundingCollisionModel(0, 0);
		for (let i = 0; i < this._colRes.dat.length; i++) {
			this._colRes.dat[i].CollisionType = MKDS_COLTYPE.WALL << 8;
		}
		this._setColMat();
	}

	getCollision() {
		return { tris: this._colRes.dat, mat: this._colMat, frame: this._colFrame };
	}

	private _setColMat() {
		const p = this._placementPos();
		const mat = mat4.create();
		mat4.translate(mat, mat, p);
		if (this.angle[2] != 0) mat4.rotateZ(mat, mat, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] != 0) mat4.rotateY(mat, mat, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] != 0) mat4.rotateX(mat, mat, this.angle[0] * (Math.PI / 180));
		mat4.scale(mat, mat, vec3.scale(vec3.create(), this.scale, 16));
		mat4.scale(this._colMat, mat, [this._colRes.scale, this._colRes.scale, this._colRes.scale]);
	}
}
