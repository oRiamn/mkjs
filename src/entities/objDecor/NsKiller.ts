import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { courseScene } from "../../engine/scenes/courseScene";
import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { nitroModel, nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { nitroModelWorldYExtent } from "../../utils/modelLocalBounds";
import { ObjDecor } from "../objDecor";

/** World units per frame along PATH/POIT (@ 60 fps). */
export const KILLER_ROUTE_SPEED = 1;
/** Pooled Bullet Bill instances per launcher; only idle ones can be relaunched. */
const KILLER_POOL_SIZE = 7;
const KILLER_PROJECTILE_RANGE = 3400;
const KILLER_PROJECTILE_SPEED = 6;

/** Bullet Bill launcher (0x01a1). NsKiller1 follows the linked PATH; NsKiller2 fires perpendicular to it. */
export class NsKiller extends ObjDecor {
	private _scene: Scene;
	private _route: nkm_section_POIT[];
	private _loopPath: boolean;
	private _fireDir: vec3 | null;
	private _projectileLiftY = 0;
	private _cannonPos: vec3;
	private _segFrom = 0;
	private _segTo = 1;
	private _segT = 0;
	private _dir = 1;
	private _drawMat: mat4;
	private _mdl: nitroModel[] = [];
	private _projectiles: NsKillerProjectile[] = [];

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this._staringAtCamera = false;
		this._scene = scene;
		this._drawMat = mat4.create();

		this._route = obji.routeID !== 65535 ? (scene.paths[obji.routeID] ?? []) : [];
		const pathMeta = scene.nkm.sections.PATH.entries[obji.routeID];
		this._loopPath = pathMeta != null && pathMeta.loop !== 0;
		this._fireDir = killerFireDirection(this._route);
		this._cannonPos = vec3.clone(this._route.length > 0 ? this._route[0].pos : this.pos);
		if (this._route.length < 2) {
			this._segTo = 0;
		}
	}

	requireRes() {
		return { mdl: [{ nsbmd: "NsKiller1.nsbmd" }, { nsbmd: "NsKiller2.nsbmd" }, { nsbmd: "NsKiller2_s.nsbmd" }] };
	}

	provideRes(r: ProvidedRes) {
		super.provideRes(r);
		this._mdl = r.mdl;

		const scaleY = this.scale[1] * this._drawScale[1];
		const cannonWorld = nitroModelWorldYExtent(r.mdl[0], scaleY);
		this._projectileLiftY = cannonWorld.height * .5;
		this._initProjectilePool();
	}

	private _initProjectilePool() {
		if (this._projectiles.length > 0 || this._mdl.length < 3) return;

		const scale = vec3.mul(vec3.create(), this.scale, this._drawScale);
		const cs = this._scene as courseScene;
		for (let i = 0; i < KILLER_POOL_SIZE; i++) {
			const proj = new NsKillerProjectile(this._mdl[1], this._mdl[2], scale);
			this._projectiles.push(proj);
			cs.colEnt.push(proj);
		}
	}

	update(_scn?: Scene) {
		if (this._route.length >= 2) {
			this._stepRoute();
		}
		for (let i = 0; i < this._projectiles.length; i++) {
			this._projectiles[i].update();
		}
		super.update(_scn);
	}

	draw(view: mat4, pMatrix: mat4) {
		const scaleVec = vec3.scale(vec3.create(), vec3.mul(vec3.create(), this.scale, this._drawScale), 16);
		const drawPos: vec3 = [this._cannonPos[0], this._cannonPos[1] + this._yOffset, this._cannonPos[2]];

		mat4.translate(this._drawMat, view, drawPos);
		if (this.angle[2] !== 0) mat4.rotateZ(this._drawMat, this._drawMat, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] !== 0) mat4.rotateY(this._drawMat, this._drawMat, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] !== 0) mat4.rotateX(this._drawMat, this._drawMat, this.angle[0] * (Math.PI / 180));
		mat4.scale(this._drawMat, this._drawMat, scaleVec);
		this._mdl[0].draw(this._drawMat, pMatrix);

		for (let i = 0; i < this._projectiles.length; i++) {
			this._projectiles[i].draw(view, pMatrix);
		}
	}

	private _cannonSpawnPos(): vec3 {
		return [this._cannonPos[0], this._cannonPos[1] + this._yOffset, this._cannonPos[2]];
	}

	private _spawnProjectile() {
		if (this._fireDir == null || this._projectiles.length === 0) return;

		const proj = this._projectiles.find((p) => p.isIdle());
		if (proj == null) return;

		proj.launch(this._cannonSpawnPos(), this._fireDir, this._projectileLiftY);
	}

	private _stepRoute() {
		const from = this._route[this._segFrom].pos;
		const to = this._route[this._segTo].pos;
		const dist = vec3.distance(from, to);
		const step = dist > 0 ? KILLER_ROUTE_SPEED / dist : 1;

		this._segT += step;
		if (this._segT >= 1) {
			this._segT = 0;
			vec3.copy(this._cannonPos, to);
			this._segFrom = this._segTo;
			this._advanceSegment();
			this._spawnProjectile();
		} else {
			this._cannonPos[0] = from[0] + (to[0] - from[0]) * this._segT;
			this._cannonPos[1] = from[1] + (to[1] - from[1]) * this._segT;
			this._cannonPos[2] = from[2] + (to[2] - from[2]) * this._segT;
		}
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
}

class NsKillerProjectile implements lsc_taget {
	collidable = false;
	colRad = 512;
	pos: vec3;
	vel: vec3;

	private _active = false;
	private _dir = vec3.create();
	private _speed = KILLER_PROJECTILE_SPEED;
	private _traveled = 0;
	private _bill: nitroModel;
	private _shadow: nitroModel;
	private _scale: vec3;
	private _colRes: nitromodel_BoundingCollisionModel;
	private _colMat = mat4.create();
	private _colFrame = 0;
	private _drawMat = mat4.create();

	constructor(bill: nitroModel, shadow: nitroModel, scale: vec3) {
		this._bill = bill;
		this._shadow = shadow;
		this._scale = vec3.clone(scale);
		this.pos = vec3.create();
		this.pos[1] = -1e6;
		this.vel = vec3.create();

		this._colRes = bill.getBoundingCollisionModel(0, 0);
		for (let i = 0; i < this._colRes.dat.length; i++) {
			this._colRes.dat[i].CollisionType = MKDS_COLTYPE.KNOCKBACK_DAMAGE << 8;
		}
		this._setColMat();
	}

	isIdle() {
		return !this._active;
	}

	launch(spawnPos: vec3, fireDir: vec3, yLift: number) {
		vec3.copy(this._dir, fireDir);
		vec3.copy(this.pos, spawnPos);
		this.pos[1] += yLift;
		vec3.scale(this.vel, this._dir, this._speed);
		this._traveled = 0;
		this._active = true;
		this.collidable = true;
		this._setColMat();
	}

	getCollision() {
		if (!this._active) return { tris: [], mat: this._colMat, frame: this._colFrame };
		return { tris: this._colRes.dat, mat: this._colMat, frame: this._colFrame };
	}

	update() {
		if (!this._active) return;

		vec3.scaleAndAdd(this.pos, this.pos, this._dir, this._speed);
		this._traveled += this._speed;
		this._setColMat();
		if (this._traveled >= KILLER_PROJECTILE_RANGE) {
			this._finish();
		}
	}

	draw(view: mat4, pMatrix: mat4) {
		if (!this._active) return;

		const scaleVec = vec3.scale(vec3.create(), this._scale, 16);
		mat4.translate(this._drawMat, view, this.pos);
		mat4.scale(this._drawMat, this._drawMat, scaleVec);
		this._bill.draw(this._drawMat, pMatrix);
		this._shadow.draw(this._drawMat, pMatrix);
	}

	private _finish() {
		if (!this._active) return;
		this._active = false;
		this.collidable = false;
		vec3.set(this.vel, 0, 0, 0);
		this.pos[1] = -1e6;
	}

	private _setColMat() {
		const mat = mat4.create();
		mat4.translate(mat, mat, this.pos);
		mat4.scale(mat, mat, vec3.scale(vec3.create(), this._scale, 16));
		mat4.scale(this._colMat, mat, [this._colRes.scale, this._colRes.scale, this._colRes.scale]);
		this._colFrame++;
	}
}

function killerFireDirection(route: nkm_section_POIT[]): vec3 | null {
	if (route.length < 2) return null;

	const tangent = vec3.create();
	vec3.sub(tangent, route[1].pos, route[0].pos);
	tangent[1] = 0;
	if (vec3.length(tangent) < 0.01) {
		vec3.sub(tangent, route[2].pos, route[1].pos);
		tangent[1] = 0;
	}
	if (vec3.length(tangent) < 0.01) return null;

	vec3.normalize(tangent, tangent);
	const perp = vec3.cross(vec3.create(), [0, 1, 0], tangent);
	vec3.normalize(perp, perp);
	return perp;
}
