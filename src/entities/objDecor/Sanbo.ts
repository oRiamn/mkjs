import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { nitroModel, nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { nitroRender } from "../../render/nitroRender";
import { modelPolyLocalYBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { Item } from "../item";
import { Kart } from "../kart";
import { ObjDecor } from "../objDecor";

const SANBO_BODY_COUNT = 3;
const SANBO_PART_COUNT = SANBO_BODY_COUNT + 1;
/** Frames of trail lag per link in the chain (@ 60 fps). */
const SANBO_LINK_LAG = 8;
const SANBO_HISTORY_LEN = SANBO_LINK_LAG * SANBO_PART_COUNT + 20;
/** Soft catch-up per frame toward the delayed trail (no bounce). */
const SANBO_SMOOTH = 0.03;
/** Max lean (degrees) from chain tangent. */
const SANBO_MAX_LEAN = 20;
/** Frames for one forward glide burst (@ 60 fps). */
const SANBO_SLIDE_MOVE_FRAMES = 35;
/** Pause between glide bursts (@ 60 fps). */
const SANBO_SLIDE_REST_FRAMES = 40;
/** Fixed world units advanced per burst (same for every instance). */
const SANBO_SLIDE_DIST = 20;

/** Desert Pokey (0x01b2). Three sanbo_b segments plus sanbo_h on a linked PATH/POIT route. */
export class Sanbo extends ObjDecor {
	colRad: number;
	vel: vec3;
	private _route: nkm_section_POIT[];
	private _loopPath: boolean;
	private _slidePhase: "rest" | "slide" = "rest";
	private _slideLeft = 0;
	private _slideT = 0;
	private _slideFrom = vec3.create();
	private _slideTo = vec3.create();
	private _slideEndSeg = { segFrom: 0, segTo: 1, segT: 0, dir: 1 };
	private _segFrom = 0;
	private _segTo = 1;
	private _segT = 0;
	private _dir = 1;
	private _prevPos: vec3;
	private _partPos: vec3[] = [];
	private _partLean: vec3[] = [];
	private _linkHistories: vec3[][] = [];
	private _stackLocalY: number[] = [];
	private _mdl: nitroModel[] = [];
	private _drawMat = mat4.create();
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat = mat4.create();
	private _colFrame = 0;

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this._staringAtCamera = true;
		this.collidable = true;
		this.colRad = 512;
		this.vel = vec3.create();
		this._prevPos = vec3.clone(this.pos);

		this._route = scene.getRoute(obji.routeID);
		const pathMeta = scene.nkm.sections.PATH.entries[obji.routeID];
		this._loopPath = pathMeta != null && pathMeta.loop !== 0;

		if (this._route.length > 0) {
			vec3.copy(this.pos, this._route[0].pos);
			this._prevPos = vec3.clone(this.pos);
		}
		if (this._route.length < 2) {
			this._segTo = 0;
		}

		this._initPartState();
		this._fillHistories();
	}

	requireRes() {
		return { mdl: [{ nsbmd: "sanbo_b.nsbmd" }, { nsbmd: "sanbo_h.nsbmd" }] };
	}

	provideRes(r: ProvidedRes) {
		const bodyPoly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bodyBounds = modelPolyLocalYBounds(bodyPoly.disp);
		const bodyWorld = modelWorldYExtent(bodyBounds.minY, bodyBounds.maxY, this.scale[1]);

		const headPoly = r.mdl[1].bmd.modelData.objectData[0].polys.objectData[0];
		const headBounds = modelPolyLocalYBounds(headPoly.disp);
		const headWorld = modelWorldYExtent(headBounds.minY, headBounds.maxY, this.scale[1]);

		const stackStep = bodyWorld.top * 1.4;
		const groundLift = -bodyWorld.bottom;

		this._stackLocalY = [];
		for (let i = 0; i < SANBO_BODY_COUNT; i++) {
			this._stackLocalY.push(groundLift + i * stackStep);
		}
		this._stackLocalY.push(-headWorld.bottom + SANBO_BODY_COUNT * stackStep);

		for (let i = 0; i < SANBO_PART_COUNT; i++) {
			const localY = this._stackLocalY[i];
			this._partPos[i][0] = this.pos[0];
			this._partPos[i][1] = this.pos[1] + localY;
			this._partPos[i][2] = this.pos[2];
		}
		this._fillHistories();

		super.provideRes(r);
		this._mdl = r.mdl;

		this._colRes = r.mdl[0].getBoundingCollisionModel(0, 0);
		for (let i = 0; i < this._colRes.dat.length; i++) {
			this._colRes.dat[i].CollisionType = MKDS_COLTYPE.KNOCKBACK_DAMAGE << 8;
		}
		this._updateParts();
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
		this._updateParts();
		this._setColMat();
		super.update(_scn);
	}

	draw(view: mat4, pMatrix: mat4) {
		nitroRender.setShadBias(0.001);
		const scaleVec = vec3.scale(vec3.create(), vec3.mul(vec3.create(), this.scale, this._drawScale), 16);

		for (let i = 0; i < SANBO_BODY_COUNT; i++) {
			this._drawPart(view, pMatrix, i, 0, scaleVec);
		}
		this._drawPart(view, pMatrix, SANBO_BODY_COUNT, 1, scaleVec);
		nitroRender.resetShadOff();
	}

	private _initPartState() {
		this._partPos = [];
		this._partLean = [];
		this._linkHistories = [];
		for (let i = 0; i < SANBO_PART_COUNT; i++) {
			const localY = this._stackLocalY[i] ?? 0;
			this._partPos.push([this.pos[0], this.pos[1] + localY, this.pos[2]]);
			this._partLean.push([0, 0, 0]);
			this._linkHistories.push([]);
		}
	}

	private _fillHistories() {
		for (let i = 0; i < SANBO_PART_COUNT; i++) {
			const hist = this._linkHistories[i];
			hist.length = 0;
			const p = this._partPos[i];
			for (let j = 0; j < SANBO_HISTORY_LEN; j++) {
				hist.push(vec3.clone(p));
			}
		}
	}

	private _pushLinkHistories() {
		for (let i = 0; i < SANBO_PART_COUNT; i++) {
			const hist = this._linkHistories[i];
			hist.unshift(vec3.clone(this._partPos[i]));
			if (hist.length > SANBO_HISTORY_LEN) hist.length = SANBO_HISTORY_LEN;
		}
	}

	private _sampleTrail(history: vec3[], lagFrames: number): vec3 {
		if (history.length === 0) return vec3.create();
		const f = Math.min(lagFrames, history.length - 1.001);
		const i0 = Math.floor(f);
		const i1 = Math.min(i0 + 1, history.length - 1);
		const raw = f - i0;
		const t = raw * raw * (3 - 2 * raw);
		return vec3.lerp(vec3.create(), history[i0], history[i1], t);
	}

	private _updateParts() {
		const baseY = this._stackLocalY[0] ?? 0;
		this._partPos[0][0] = this.pos[0];
		this._partPos[0][1] = this.pos[1] + baseY;
		this._partPos[0][2] = this.pos[2];
		this._partLean[0] = [0, 0, 0];

		for (let i = 1; i < SANBO_PART_COUNT; i++) {
			const stackDy = (this._stackLocalY[i] ?? 0) - (this._stackLocalY[i - 1] ?? 0);
			const trail = this._sampleTrail(this._linkHistories[i - 1], SANBO_LINK_LAG);
			const target: vec3 = [trail[0], trail[1] + stackDy, trail[2]];
			const p = this._partPos[i];
			const smooth = Math.max(0.04, SANBO_SMOOTH - (i - 1) * 0.01);
			p[0] += (target[0] - p[0]) * smooth;
			p[1] += (target[1] - p[1]) * smooth;
			p[2] += (target[2] - p[2]) * smooth;
			this._partLean[i] = i < SANBO_BODY_COUNT ? this._computeLean(i) : [0, 0, 0];
		}

		this._pushLinkHistories();
	}

	private _computeLean(partIndex: number): vec3 {
		if (partIndex === 0) return [0, 0, 0];

		const child = this._partPos[partIndex];
		const parent = this._partPos[partIndex - 1];
		const dx = parent[0] - child[0];
		const dz = parent[2] - child[2];
		const dist = Math.hypot(dx, dz);
		if (dist < 0.05) return [0, 0, 0];

		const lean = Math.min(SANBO_MAX_LEAN, dist * 2.1);
		const inv = 1 / dist;
		return [(dz * inv * lean * Math.PI) / 180, 0, (-(dx * inv) * lean * Math.PI) / 180];
	}

	private _drawPart(view: mat4, pMatrix: mat4, partIndex: number, modelIndex: number, scaleVec: vec3) {
		const p = this._partPos[partIndex];
		const lean = this._partLean[partIndex];
		mat4.translate(this._drawMat, view, p);
		if (lean[2] !== 0) mat4.rotateZ(this._drawMat, this._drawMat, lean[2]);
		if (this.angle[1] !== 0) mat4.rotateY(this._drawMat, this._drawMat, this.angle[1] * (Math.PI / 180));
		if (lean[0] !== 0) mat4.rotateX(this._drawMat, this._drawMat, lean[0]);
		if (this.angle[0] !== 0) mat4.rotateX(this._drawMat, this._drawMat, this.angle[0] * (Math.PI / 180));
		if (this.angle[2] !== 0) mat4.rotateZ(this._drawMat, this._drawMat, this.angle[2] * (Math.PI / 180));
		mat4.scale(this._drawMat, this._drawMat, scaleVec);
		this._mdl[modelIndex].draw(this._drawMat, pMatrix);
	}

	private _stepRoute() {
		if (this._slidePhase === "rest") {
			this.vel[0] = 0;
			this.vel[1] = 0;
			this.vel[2] = 0;
			if (this._slideLeft > 0) {
				this._slideLeft--;
				return;
			}

			const ahead = this._simulateWalk(this.pos, this._segFrom, this._segTo, this._dir, SANBO_SLIDE_DIST);
			if (vec3.squaredDistance(this.pos, ahead.pos) < 0.25) {
				this._slideLeft = SANBO_SLIDE_REST_FRAMES;
				return;
			}

			vec3.copy(this._slideFrom, this.pos);
			vec3.copy(this._slideTo, ahead.pos);
			this._slideEndSeg = {
				segFrom: ahead.segFrom,
				segTo: ahead.segTo,
				segT: ahead.segT,
				dir: ahead.dir,
			};
			this._slidePhase = "slide";
			this._slideT = 0;
			return;
		}

		this._slideT += 1 / SANBO_SLIDE_MOVE_FRAMES;
		const t = Math.min(1, this._slideT);
		vec3.lerp(this.pos, this._slideFrom, this._slideTo, t);

		if (t >= 1) {
			vec3.copy(this.pos, this._slideTo);
			this._segFrom = this._slideEndSeg.segFrom;
			this._segTo = this._slideEndSeg.segTo;
			this._segT = this._slideEndSeg.segT;
			this._dir = this._slideEndSeg.dir;
			this._slidePhase = "rest";
			this._slideLeft = SANBO_SLIDE_REST_FRAMES;
		}

		vec3.sub(this.vel, this.pos, this._prevPos);
		this._prevPos = vec3.clone(this.pos);
	}

	private _simulateWalk(
		startPos: vec3,
		segFrom: number,
		segTo: number,
		dir: number,
		distance: number
	): { pos: vec3; segFrom: number; segTo: number; segT: number; dir: number } {
		let pos = vec3.clone(startPos);
		let fromIdx = segFrom;
		let toIdx = segTo;
		let travelDir = dir;
		let segT = 0;
		let left = distance;

		while (left > 0.001) {
			const end = this._route[toIdx].pos;
			const segLen = vec3.distance(pos, end);
			if (segLen < 0.001) {
				const next = this._peekNextSeg(toIdx, travelDir);
				if (next == null) {
					if (this._loopPath) break;
					travelDir = -travelDir;
					const reversed = this._peekNextSeg(toIdx, travelDir);
					if (reversed == null) break;
					fromIdx = toIdx;
					toIdx = reversed;
					continue;
				}
				fromIdx = toIdx;
				toIdx = next;
				continue;
			}

			if (left <= segLen) {
				const step = left / segLen;
				pos[0] += (end[0] - pos[0]) * step;
				pos[1] += (end[1] - pos[1]) * step;
				pos[2] += (end[2] - pos[2]) * step;
				const from = this._route[fromIdx].pos;
				const fullLen = vec3.distance(from, end);
				segT = fullLen > 0.001 ? vec3.distance(from, pos) / fullLen : 1;
				left = 0;
			} else {
				left -= segLen;
				pos = vec3.clone(end);
				const next = this._peekNextSeg(toIdx, travelDir);
				if (next == null) {
					if (this._loopPath) break;
					travelDir = -travelDir;
					const reversed = this._peekNextSeg(toIdx, travelDir);
					if (reversed == null) break;
					fromIdx = toIdx;
					toIdx = reversed;
					continue;
				}
				fromIdx = toIdx;
				toIdx = next;
				segT = 0;
			}
		}

		return { pos, segFrom: fromIdx, segTo: toIdx, segT, dir: travelDir };
	}

	private _peekNextSeg(cur: number, dir: number): number | null {
		if (this._loopPath) return (cur + 1) % this._route.length;
		const next = cur + dir;
		if (next < 0 || next >= this._route.length) return null;
		return next;
	}

	private _setColMat() {
		if (!this._colRes) return;
		const p = this._partPos[0];
		const mat = mat4.create();
		mat4.translate(mat, mat, p);
		if (this.angle[2] !== 0) mat4.rotateZ(mat, mat, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] !== 0) mat4.rotateY(mat, mat, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] !== 0) mat4.rotateX(mat, mat, this.angle[0] * (Math.PI / 180));
		mat4.scale(mat, mat, vec3.scale(vec3.create(), this.scale, 16));
		mat4.scale(this._colMat, mat, [this._colRes.scale, this._colRes.scale, this._colRes.scale]);
		this._colFrame++;
	}
}
