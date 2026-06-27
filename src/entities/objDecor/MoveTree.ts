import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { nsbca } from "../../formats/nsbca";
import { nitroAnimator, nitroAnimator_matStack } from "../../render/nitroAnimator";
import { nitroModel, nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { nitroRender } from "../../render/nitroRender";
import { modelPolyLocalYBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { Item } from "../item";
import { Kart } from "../kart";
import { ObjDecor } from "../objDecor";

/** OBJI.setting1 → world units per frame (@ 60 fps); trees lumber slower than crabs. */
const MOVE_TREE_SPEED_SCALE = 1 / 256;

/** Walking palm tree (0x01a3). Follows PATH/POIT routes like Crab on beach_course. */
export class MoveTree extends ObjDecor {
	colRad: number;
	vel: vec3;
	private _route: nkm_section_POIT[];
	private _loopPath: boolean;
	private _speed: number;
	private _segFrom = 0;
	private _segTo = 1;
	private _segT = 0;
	private _dir = 1;
	private _prevPos: vec3;
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat: mat4;
	private _colFrame = 0;
	private _mdl: nitroModel[] = [];
	private _walkAnim: nitroAnimator | null = null;
	private _walkAnimMat: nitroAnimator_matStack | null = null;
	private _walkAnimFrame = 0;
	private _drawMat = mat4.create();

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this._staringAtCamera = false;
		this.collidable = true;
		this.colRad = 512;
		this.vel = vec3.create();
		this._colMat = mat4.create();
		this._prevPos = vec3.clone(this.pos);

		this._route = scene.getRoute(obji.routeID);
		const pathMeta = scene.nkm.sections.PATH.entries[obji.routeID];
		this._loopPath = pathMeta != null && pathMeta.loop !== 0;
		this._speed = obji.setting1 * MOVE_TREE_SPEED_SCALE;

		if (this._route.length > 0) {
			vec3.copy(this.pos, this._route[0].pos);
			this._prevPos = vec3.clone(this.pos);
		}
		if (this._route.length < 2) {
			this._segTo = 0;
		}
	}

	requireRes() {
		return { mdl: [{ nsbmd: "move_tree.nsbmd" }], other: [null, "move_tree.nsbca"] };
	}

	provideRes(r: ProvidedRes) {
		const poly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalYBounds(poly.disp);
		const world = modelWorldYExtent(bounds.minY, bounds.maxY, this.scale[1]);
		this._yOffset = -world.bottom;

		this._mdl = r.mdl;
		this._clearPerObjectBillboards(r.mdl[0]);
		if (r.other?.[1] != null) {
			this._walkAnim = new nitroAnimator(r.mdl[0].bmd, r.other[1] as nsbca);
		}

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

	update(_scn?: Scene) {
		if (this._route.length >= 2) {
			this._stepRoute();
		}
		if (this._walkAnim != null) {
			this._walkAnimMat = this._walkAnim.setFrame(0, 0, this._walkAnimFrame);
		}
		this._walkAnimFrame++;
	}

	draw(view: mat4, pMatrix: mat4) {
		nitroRender.setShadBias(0.001);
		mat4.translate(this._drawMat, view, this._placementPos());
		mat4.multiply(this._drawMat, this._drawMat, nitroRender.yBillboardMat);
		mat4.scale(this._drawMat, this._drawMat, vec3.scale(vec3.create(), vec3.mul(vec3.create(), this.scale, this._drawScale), 16));
		this._mdl[0].draw(this._drawMat, pMatrix, this._walkAnimMat ?? undefined);
		nitroRender.resetShadOff();
	}

	private _clearPerObjectBillboards(mdl: nitroModel) {
		const bmd = mdl.bmd;
		bmd.hasBillboards = false;
		for (let i = 0; i < bmd.modelData.objectData.length; i++) {
			const objs = bmd.modelData.objectData[i].objects.objectData;
			for (let j = 0; j < objs.length; j++) {
				objs[j].billboardMode = 0;
			}
		}
	}

	private _stepRoute() {
		const from = this._route[this._segFrom].pos;
		const to = this._route[this._segTo].pos;
		const dist = vec3.distance(from, to);
		const step = dist > 0 ? this._speed / dist : 1;

		this._segT += step;
		if (this._segT >= 1) {
			this._segT = 0;
			vec3.copy(this.pos, to);
			this._segFrom = this._segTo;
			this._advanceSegment();
		} else {
			this._setPosAlongSeg(from, to);
		}

		vec3.sub(this.vel, this.pos, this._prevPos);
		this._prevPos = vec3.clone(this.pos);
		this._setColMat();
	}

	private _setPosAlongSeg(from: vec3, to: vec3) {
		this.pos[0] = from[0] + (to[0] - from[0]) * this._segT;
		this.pos[1] = from[1] + (to[1] - from[1]) * this._segT;
		this.pos[2] = from[2] + (to[2] - from[2]) * this._segT;
	}

	private _advanceSegment() {
		if (this._loopPath) {
			this._segTo = (this._segTo + 1) % this._route.length;
			return;
		}
		let next = this._segTo + this._dir;
		if (next >= this._route.length) {
			this._dir = -1;
			next = this._segTo - 1;
		} else if (next < 0) {
			this._dir = 1;
			next = this._segTo + 1;
		}
		this._segTo = next;
	}

	private _setColMat() {
		if (!this._colRes) return;
		const p = this._placementPos();
		const mat = mat4.create();
		mat4.translate(mat, mat, p);
		mat4.scale(mat, mat, vec3.scale(vec3.create(), this.scale, 16));
		mat4.scale(this._colMat, mat, [this._colRes.scale, this._colRes.scale, this._colRes.scale]);
		this._colFrame++;
	}
}
