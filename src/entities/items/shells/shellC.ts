import { nitroAudio, nitroAudioSound } from "../../../audio/nitroAudio";
import { MKDS_COLTYPE } from "../../../engine/collisionTypes";
import { MKDSCONST } from "../../../engine/mkdsConst";
import { nkm_section_CPAT, nkm_section_EPOI, nkm_section_IPOI, nkm_section_MEPA, nkm_section_MEPO } from "../../../formats/nkm";
import { Item } from "../../item";
import { Kart } from "../../kart";

/** Shell lifetime after release (@ 60 fps). */
const SHELL_TTL_FRAMES = 10 * 60;

export abstract class ShellC implements KartItemEntity {
	isSolid!: boolean;
	item: Item;
	minimumMove: number;
	canBeHeld: boolean;
	canBeDropped: boolean;
	isDestructive: boolean;
	angle: number;
	speed: number;
	sound: nitroAudioSound | null;
	soundCooldown: number;
	gravity: vec3;
	private _ttlFrames = 0;

	constructor(item: Item, _scene: Scene, _type: string) {
		this.item = item;
		this.minimumMove = 0.17;
		this.canBeHeld = true;
		this.canBeDropped = true;
		this.isDestructive = true;
		this.angle = 0;
		this.speed = 6; //base speed + kart speed
		this.sound = null;
		this.soundCooldown = 0;
		this.item.colRadius = 3;
		this.gravity = [0, -0.17, 0]; //100% confirmed by me messing around with the gravity value in mkds
	}

	onlyHeld() {
		return false;
	}

	release(forward: number) {
		this.sound = nitroAudio.playSound(215, { volume: 1.5 }, 0, this.item);
		this.speed = 6;
		this.angle = this.item.owner.physicalDir;
		this.onRelease(forward);
		if (forward < 0) {
			this.angle += Math.PI;
			this.angle %= Math.PI * 2;
		} else {
			this.speed += this.item.owner.speed;
		}
		this._ttlFrames = SHELL_TTL_FRAMES;
		return false;
	}

	protected onRelease(_forward: number) {}

	onDie(final: boolean) {
		if (!final) {
			nitroAudio.playSound(214, { volume: 2 }, 0, this.item);
		}
		if (this.sound) {
			nitroAudio.instaKill(this.sound);
			this.sound = null;
		}
	}

	collideKart(kart: Kart) {
		this.item.deadTimer = 1;
		kart.damage(MKDSCONST.DAMAGE_FLIP);
	}

	update(scene: Scene) {
		this.updateSteering(scene);
		this.applyMotion();
		if (this._ttlFrames > 0) {
			this._ttlFrames--;
			if (this._ttlFrames <= 0 && this.item.deadTimer === 0) {
				this.item.deadTimer = 1;
			}
		}
	}

	protected updateSteering(_scene: Scene) {}

	protected applyMotion() {
		this.item.vel = [Math.sin(this.angle) * this.speed, this.item.vel[1], -Math.cos(this.angle) * this.speed];
		vec3.add(this.item.vel, this.item.vel, this.gravity);
		if (this.soundCooldown > 0) this.soundCooldown--;
	}

	colResponse(pos: vec3, pvel: vec3, dat: lscraycast, ignoreList: lsc_collision_triangle[]) {
		const plane = dat.plane;
		const collisionType = plane.CollisionType ?? 0;
		const colType = (collisionType >> 8) & 31;
		vec3.add(pos, pos, vec3.scale(vec3.create(), pvel, dat.t));

		const n = dat.normal;
		vec3.normalize(n, n);
		let adjustPos = true;

		if (MKDS_COLTYPE.GROUP_WALL.indexOf(colType) != -1) {
			//wall
			//shell reflection code - slide y vel across plane, bounce on xz
			if (this.soundCooldown <= 0) {
				nitroAudio.playSound(213, { volume: 2.5 }, 0, this.item);
				this.soundCooldown = 30;
			}
			vec3.add(this.item.vel, vec3.scale(vec3.create(), n, -2 * (vec3.dot(this.item.vel, n) / vec3.dot(n, n))), this.item.vel);
			this.item.vel[1] = 0;

			const v = this.item.vel;
			this.angle = Math.atan2(v[0], -v[2]);
		} else if (colType == MKDS_COLTYPE.OOB || colType == MKDS_COLTYPE.FALL) {
			if (this.item.deadTimer == 0) this.item.deadTimer++;
		} else if (MKDS_COLTYPE.GROUP_ROAD.indexOf(colType) != -1) {
			//sliding plane
			const proj = vec3.dot(this.item.vel, n);
			vec3.sub(this.item.vel, this.item.vel, vec3.scale(vec3.create(), n, proj));
			this.item.stuckTo = dat.object;
		} else {
			adjustPos = false;
			ignoreList.push(plane);
		}

		const rVelMag = Math.sqrt(vec3.dot(this.item.vel, this.item.vel));
		vec3.scale(this.item.vel, this.item.vel, this.speed / rVelMag);

		if (adjustPos) {
			//move back from plane slightly
			vec3.add(pos, pos, vec3.scale(vec3.create(), n, this.minimumMove));
		}
	}
}

export class GreenShellC extends ShellC {}

type routePath = nkm_section_CPAT | nkm_section_MEPA;
type pathPoint = nkm_section_EPOI | nkm_section_IPOI | nkm_section_MEPO;

function isEpoi(p: pathPoint): p is nkm_section_EPOI {
	return "pointSize" in p;
}

/** Max heading change per frame (radians @ 60 fps). */
const TURN_RATE = 0.08;
const DEFAULT_POINT_SIZE = 24;
/** Homing duration after release (@ 60 fps). */
const CHASE_FRAMES = 3 * 60;
/** World units — start homing when a kart is this close. */
const TARGET_PROXIMITY = 192;

export class RedShellC extends ShellC {
	private _paths: routePath[] = [];
	private _points: pathPoint[] = [];
	private _battleMode = false;
	private _pathReady = false;
	private _ePath: routePath | null = null;
	private _ePoiInd = 0;
	private _ePoi: pathPoint | null = null;
	private _destPoint = vec3.create();
	private _destNorm = vec3.create();
	private _destConst = 0;
	private _chaseFramesLeft = 0;
	private _lockedTarget: Kart | null = null;

	protected onRelease(_forward: number) {
		this._pathReady = false;
		this._ePoiInd = 0;
		this._ePoi = null;
		this._lockedTarget = null;
		this._chaseFramesLeft = CHASE_FRAMES;
	}

	protected updateSteering(scene: Scene) {
		if (this._chaseFramesLeft > 0) {
			this._chaseFramesLeft--;

			if (!this._pathReady) {
				this._initRouteFromShooter(scene);
			}

			const nearby = this._findNearbyKart(scene);
			if (nearby) {
				this._lockedTarget = nearby;
			} else if (this._lockedTarget && vec3.distance(this.item.pos, this._lockedTarget.pos) > TARGET_PROXIMITY * 1.5) {
				this._lockedTarget = null;
			}

			let desiredAngle = this.angle;

			if (this._pathReady) {
				this._skipBackwardWaypoints();
				this._updatePathProgress();
				desiredAngle = this._angleTo(this._destPoint);
			}

			const target = this._lockedTarget;
			if (target) {
				const targetAngle = this._angleTo(target.pos);
				if (this._isAheadAngle(targetAngle)) {
					desiredAngle = this._lerpAngle(desiredAngle, targetAngle, 0.85);
				}
			}

			desiredAngle = this._clampForwardAngle(desiredAngle);
			this.angle = this._turnToward(this.angle, desiredAngle, TURN_RATE);
		}
	}

	private _loadTrackPaths(scene: Scene): boolean {
		const nkm = scene.nkm;
		// Same battle detection as controlRaceCPU: arenas omit EPAT and use MEPA/MEPO.
		this._battleMode = nkm.sections.EPAT == null;

		if (this._battleMode) {
			if (nkm.sections.MEPA?.entries?.length && nkm.sections.MEPO?.entries?.length) {
				this._paths = nkm.sections.MEPA.entries;
				this._points = nkm.sections.MEPO.entries;
				return true;
			}
		} else if (nkm.sections.EPAT?.entries?.length && nkm.sections.EPOI?.entries?.length) {
			this._paths = nkm.sections.EPAT.entries;
			this._points = nkm.sections.EPOI.entries;
			return true;
		}
		if (nkm.sections.IPAT?.entries?.length && nkm.sections.IPOI?.entries?.length) {
			this._paths = nkm.sections.IPAT.entries;
			this._points = nkm.sections.IPOI.entries;
			this._battleMode = false;
			return true;
		}
		return false;
	}

	private _initRouteFromShooter(scene: Scene) {
		if (!this._loadTrackPaths(scene)) {
			this._pathReady = false;
			return;
		}

		const poiInd = this._nearestPointIndex(this.item.owner.pos);
		this._ePoiInd = poiInd;
		this._ePoi = this._points[poiInd];
		if (!this._ePoi) {
			this._pathReady = false;
			return;
		}
		this._recomputePath();
		if (!this._ePath) {
			this._pathReady = false;
			return;
		}
		this._calcDestNorm();
		vec3.copy(this._destPoint, this._ePoi.pos);
		this._pathReady = true;
	}

	private _nearestPointIndex(pos: vec3) {
		let nearest = 0;
		let nearestDist = Infinity;
		for (let i = 0; i < this._points.length; i++) {
			const d = vec3.squaredDistance(pos, this._points[i].pos);
			if (d < nearestDist) {
				nearestDist = d;
				nearest = i;
			}
		}
		return nearest;
	}

	private _recomputePath() {
		this._ePath = this._pathForIndex(this._ePoiInd);
	}

	private _pathForIndex(poiInd: number): routePath | null {
		for (let i = 0; i < this._paths.length; i++) {
			const rel = poiInd - this._paths[i].startInd;
			if (rel >= 0 && rel < this._paths[i].pathLen) {
				return this._paths[i];
			}
		}
		return this._paths[0] ?? null;
	}

	private _skipBackwardWaypoints() {
		if (!this._ePoi || !this._ePath) return;
		if (!this._isAheadAngle(this._angleTo(this._ePoi.pos))) {
			this._advancePoint();
		}
	}

	/** Same progression logic as controlRaceCPU.advancePoint. */
	private _advancePoint() {
		if (!this._ePoi || !this._ePath) return;

		if (++this._ePoiInd < this._ePath.startInd + this._ePath.pathLen) {
			this._ePoi = this._points[this._ePoiInd] ?? null;
		} else if (this._battleMode) {
			this._advanceBattleFork(this._ePath);
		} else if (this._ePath.dest.length > 0) {
			const pathInd = this._pickForkPathIndex(this._ePath);
			const nextPath = this._paths[pathInd];
			if (!nextPath) return;
			this._ePath = nextPath;
			this._ePoiInd = this._ePath.startInd;
			this._ePoi = this._points[this._ePoiInd] ?? null;
		} else {
			return;
		}

		if (!this._ePoi || !this._ePath) return;
		this._calcDestNorm();
		vec3.copy(this._destPoint, this._ePoi.pos);
	}

	/** Battle arenas link MEPA forks by point index, not path index. */
	private _advanceBattleFork(fromPath: routePath) {
		const candidates = fromPath.source.length > 0 ? [...fromPath.source, ...fromPath.dest] : fromPath.dest;
		if (candidates.length === 0) return;

		const ref = this._lockedTarget?.pos ?? this.item.pos;
		let bestInd = candidates[0];
		let bestDist = Infinity;

		for (let i = 0; i < candidates.length; i++) {
			const poiInd = candidates[i];
			const pt = this._points[poiInd];
			if (!pt) continue;
			const dist = vec3.squaredDistance(ref, pt.pos);
			if (dist < bestDist) {
				bestDist = dist;
				bestInd = poiInd;
			}
		}

		this._ePoiInd = bestInd;
		this._ePoi = this._points[bestInd] ?? null;
		if (this._ePoi) this._recomputePath();
	}

	private _pickForkPathIndex(fromPath: routePath): number {
		if (fromPath.dest.length === 1) return fromPath.dest[0];

		const ref = this._lockedTarget?.pos ?? this.item.pos;
		let bestInd = fromPath.dest[0];
		let bestDist = Infinity;

		for (let d = 0; d < fromPath.dest.length; d++) {
			const path = this._paths[fromPath.dest[d]];
			if (!path) continue;
			const pt = this._points[path.startInd];
			if (!pt) continue;
			const dist = vec3.squaredDistance(ref, pt.pos);
			if (dist < bestDist) {
				bestDist = dist;
				bestInd = fromPath.dest[d];
			}
		}
		return bestInd;
	}

	private _calcDestNorm() {
		if (!this._ePoi) return;
		const norm = vec3.sub(vec3.create(), this.item.pos, this._ePoi.pos);
		vec3.normalize(norm, norm);
		this._destNorm = norm;
		this._destConst = -vec3.dot(this._ePoi.pos, norm);
	}

	private _pointSize() {
		if (!this._ePoi) return DEFAULT_POINT_SIZE;
		return isEpoi(this._ePoi) ? this._ePoi.pointSize : DEFAULT_POINT_SIZE;
	}

	/** Same plane crossing test as controlRaceCPU.fetchInput. */
	private _updatePathProgress() {
		if (!this._ePoi || !this._ePath) return;

		const dist = vec3.dot(this._destNorm, this.item.pos) + this._destConst;
		if (dist < this._pointSize()) {
			this._advancePoint();
		}
		vec3.copy(this._destPoint, this._ePoi.pos);
	}

	private _findNearbyKart(scene: Scene): Kart | null {
		const owner = this.item.owner;
		const limit = TARGET_PROXIMITY * TARGET_PROXIMITY;
		let best: Kart | null = null;
		let bestDist = limit;

		for (const kart of scene.karts) {
			if (!kart.active || kart === owner || kart === this.item.safeKart) continue;
			const dist = vec3.squaredDistance(this.item.pos, kart.pos);
			if (dist < bestDist) {
				bestDist = dist;
				best = kart;
			}
		}

		return best;
	}

	private _angleTo(pos: vec3) {
		return Math.atan2(pos[0] - this.item.pos[0], this.item.pos[2] - pos[2]);
	}

	private _isAheadAngle(angle: number, heading = this.angle) {
		return Math.abs(this._dirDiff(angle, heading)) <= Math.PI / 2;
	}

	private _clampForwardAngle(angle: number) {
		const diff = this._dirDiff(angle, this.angle);
		if (diff < -Math.PI / 2) return this.angle - Math.PI / 2;
		if (diff > Math.PI / 2) return this.angle + Math.PI / 2;
		return angle;
	}

	private _fixDir(dir: number) {
		return ((dir % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
	}

	private _dirDiff(dir1: number, dir2: number) {
		const d = this._fixDir(dir1 - dir2);
		return d > Math.PI ? d - Math.PI * 2 : d;
	}

	private _lerpAngle(from: number, to: number, t: number) {
		return from + this._dirDiff(to, from) * t;
	}

	private _turnToward(current: number, target: number, maxTurn: number) {
		const diff = this._dirDiff(target, current);
		if (Math.abs(diff) <= maxTurn) return target;
		return current + Math.sign(diff) * maxTurn;
	}
}
