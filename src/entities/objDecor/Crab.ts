import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { nsbtp } from "../../formats/nsbtp";
import { nitroModel, nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { nitroRender } from "../../render/nitroRender";
import { modelPolyLocalYBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { Item } from "../item";
import { Kart } from "../kart";
import { ObjDecor } from "../objDecor";

/** Body texture flip rate while the crab is walking (game runs at 60 fps). */
const CRAB_TEX_FPS = 5;
const CRAB_TEX_TICKS_PER_FRAME = 60 / CRAB_TEX_FPS;
/** Mid-path rest stop (1 s @ 60 fps). */
const CRAB_PAUSE_FRAMES = 60 * 2;
/** OBJI.setting1 scale; lower than the DS default feel on this route set. */
const CRAB_SPEED_SCALE = 1 / 60;

/** Beach crab (0x01ac). Follows PATH/POIT routes on beach_course. */
export class Crab extends ObjDecor {
	colRad: number;
	vel: vec3;
	private _route: nkm_section_POIT[];
	private _loopPath: boolean;
	private _speed: number;
	private _segFrom = 0;
	private _segTo = 1;
	private _segT = 0;
	private _dir = 1;
	private _walkFrame = 0;
	private _clawFrame = 0;
	private _bodyTexFrame = 0;
	private _handTexFrame = 0;
	private _pauseLeft = 0;
	private _midIdx = 0;
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat: mat4;
	private _colFrame = 0;
	private _prevPos: vec3;
	private _mdl: nitroModel[] = [];
	private _drawMat: mat4;

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this.collidable = true;
		this.colRad = 512;
		this.vel = vec3.create();
		this._colMat = mat4.create();
		this._drawMat = mat4.create();
		this._prevPos = vec3.clone(this.pos);

		this._route = scene.getRoute(obji.routeID);
		const pathMeta = scene.nkm.sections.PATH.entries[obji.routeID];
		this._loopPath = pathMeta != null && pathMeta.loop !== 0;
		this._speed = obji.setting1 * CRAB_SPEED_SCALE;
		this._midIdx = Math.floor((this._route.length - 1) / 2);

		if (this._route.length > 0) {
			vec3.copy(this.pos, this._route[0].pos);
			this._prevPos = vec3.clone(this.pos);
		}
		if (this._route.length < 2) {
			this._segTo = 0;
		}
	}

	requireRes() {
		return {
			mdl: [{ nsbmd: "crab.nsbmd" }, { nsbmd: "crab_hand.nsbmd" }],
			other: [null, null, "crab.nsbtp", "crab_hand.nsbtp"],
		};
	}

	provideRes(r: ProvidedRes) {
		super.provideRes(r);
		this._mdl = r.mdl;
		if (r.other[3] != null) {
			this._mdl[1].loadTexPAnim(r.other[3] as nsbtp);
		}

		const poly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalYBounds(poly.disp);
		const world = modelWorldYExtent(bounds.minY, bounds.maxY, this.scale[1]);
		this._yOffset = -world.bottom;

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

	update(_scene?: Scene) {
		const wasPausing = this._pauseLeft > 0;
		if (this._route.length >= 2) {
			this._stepRoute();
		}
		const inPause = wasPausing || this._pauseLeft > 0;

		if (inPause) {
			this._clawFrame++;
			this._handTexFrame = Math.floor(this._clawFrame / CRAB_TEX_TICKS_PER_FRAME) % 2;
			this._bodyTexFrame = 0;
		} else if (vec3.length(this.vel) > 0.05) {
			this._clawFrame = 0;
			this._walkFrame++;
			this._bodyTexFrame = Math.floor(this._walkFrame / CRAB_TEX_TICKS_PER_FRAME) % 2;
			this._handTexFrame = 0;
		} else {
			this._walkFrame = 0;
			this._clawFrame = 0;
			this._bodyTexFrame = 0;
			this._handTexFrame = 0;
		}
	}

	draw(view: mat4, pMatrix: mat4) {
		nitroRender.setShadBias(0.001);
		mat4.translate(this._drawMat, view, this._placementPos());
		mat4.scale(this._drawMat, this._drawMat, vec3.scale(vec3.create(), vec3.mul(vec3.create(), this.scale, this._drawScale), 16));

		this._mdl[0].setFrame(this._bodyTexFrame);
		this._mdl[0].draw(this._drawMat, pMatrix);
		this._mdl[1].setFrame(this._handTexFrame);
		this._mdl[1].draw(this._drawMat, pMatrix);
		nitroRender.resetShadOff();
	}

	private _stepRoute() {
		if (this._pauseLeft > 0) {
			this._pauseLeft--;
			this.vel = [0, 0, 0];
			this._setColMat();
			return;
		}

		const from = this._route[this._segFrom].pos;
		const to = this._route[this._segTo].pos;
		const dist = vec3.distance(from, to);
		const step = dist > 0 ? this._speed / dist : 1;

		if (this._route.length === 2 && this._segT < 0.5 && this._segT + step >= 0.5) {
			this._segT = 0.5;
			this._setPosAlongSeg(from, to);
			this._pauseLeft = CRAB_PAUSE_FRAMES;
			this.vel = [0, 0, 0];
			this._prevPos = vec3.clone(this.pos);
			this._setColMat();
			return;
		}

		this._segT += step;

		if (this._segT >= 1) {
			this._segT = 0;
			vec3.copy(this.pos, to);
			if (this._route.length > 2 && this._segTo === this._midIdx) {
				this._pauseLeft = CRAB_PAUSE_FRAMES;
			}
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
		this._segFrom = this._segTo;
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
