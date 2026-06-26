import { nitroAudioSound, nitroAudio } from "../../../audio/nitroAudio";
import { controlRaceCPU } from "../../../engine/controls/controlRaceCPU";
import { MKDS_COLTYPE } from "../../../engine/collisionTypes";
import { MKDSCONST } from "../../../engine/mkdsConst";
import { nkm_section_CPAT, nkm_section_EPOI, nkm_section_IPOI, nkm_section_MEPA, nkm_section_MEPO } from "../../../formats/nkm";
import { Item } from "../../item";
import { Kart } from "../../kart";

type routePath = nkm_section_CPAT | nkm_section_MEPA;
type pathPoint = nkm_section_EPOI | nkm_section_IPOI | nkm_section_MEPO;

function isEpoi(p: pathPoint): p is nkm_section_EPOI {
	return "pointSize" in p;
}

/** Max heading change per frame (radians @ 60 fps). */
const TURN_RATE = 0.08;
/** Minimum blend toward the track waypoint while homing. */
const TRACK_BLEND = 0.55;
const DEFAULT_POINT_SIZE = 24;
/** Homing duration after release (@ 60 fps). */
const CHASE_FRAMES = 3 * 60;
/** Frames before switching chase target or jumping to a new ePoi. */
const ROUTE_DEBOUNCE_FRAMES = 20;
/** Hysteresis on waypoint plane crossing (fraction of pointSize). */
const POI_ADVANCE_RATIO = 0.65;

export class RedShellC implements KartItemEntity {
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

	private _paths: routePath[] = [];
	private _points: pathPoint[] = [];
	private _pathReady = false;
	private _routeTarget: Kart | null = null;
	private _ePath!: routePath;
	private _ePoiInd = 0;
	private _ePoi: pathPoint | null = null;
	private _destPoint = vec3.create();
	private _destNorm = vec3.create();
	private _destConst = 0;
	private _chaseFramesLeft = 0;
	private _chaseTarget: Kart | null = null;
	private _pendingChaseTarget: Kart | null = null;
	private _pendingChaseTargetFrames = 0;
	private _pendingPoiInd: number | null = null;
	private _pendingPoiFrames = 0;
	private _poiLockFrames = 0;

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
		this._routeTarget = null;
		this._pathReady = false;
		this._ePoiInd = 0;
		this._ePoi = null;
		this._chaseTarget = null;
		this._pendingChaseTarget = null;
		this._pendingChaseTargetFrames = 0;
		this._pendingPoiInd = null;
		this._pendingPoiFrames = 0;
		this._poiLockFrames = 0;
		this._chaseFramesLeft = CHASE_FRAMES;
		if (forward < 0) {
			this.angle += Math.PI;
			this.angle %= Math.PI * 2;
		} else {
			this.speed += this.item.owner.speed;
		}
		return true;
	}

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
		if (this._chaseFramesLeft > 0) {
			this._chaseFramesLeft--;
			if (this._poiLockFrames > 0) this._poiLockFrames--;

			const target = this._resolveChaseTarget(scene);
			if (target !== this._routeTarget) {
				this._routeTarget = target;
				this._pathReady = false;
				this._pendingPoiInd = null;
				this._pendingPoiFrames = 0;
				this._poiLockFrames = 0;
				if (target) this._initRouteFromKart(target, scene);
				else this._initRouteForward(scene);
			}

			let desiredAngle = this.angle;

			if (this._pathReady) {
				this._skipBackwardWaypoints();
				this._updatePathProgress();
				desiredAngle = this._angleTo(this._destPoint);
			}

			if (target) {
				const targetAngle = this._angleTo(target.pos);
				if (this._isAheadAngle(targetAngle)) {
					const homingWeight = this._pathReady ? this._homingWeight(target) : 1;
					desiredAngle = this._lerpAngle(desiredAngle, targetAngle, homingWeight);
				}
			}

			desiredAngle = this._clampForwardAngle(desiredAngle);
			this.angle = this._turnToward(this.angle, desiredAngle, TURN_RATE);
		}

		this.item.vel = [Math.sin(this.angle) * this.speed, this.item.vel[1], -Math.cos(this.angle) * this.speed];
		vec3.add(this.item.vel, this.item.vel, this.gravity);
		if (this.soundCooldown > 0) this.soundCooldown--;
	}

	colResponse(pos: vec3, pvel: vec3, dat: lscraycast, ignoreList: lsc_collision_triangle[]) {
		let plane = dat.plane;
		const collisionType = plane.CollisionType ?? 0;
		let colType = (collisionType >> 8) & 31;
		vec3.add(pos, pos, vec3.scale(vec3.create(), pvel, dat.t));

		let n = dat.normal;
		vec3.normalize(n, n);
		let gravS = Math.sqrt(vec3.dot(this.gravity, this.gravity));
		let angle = Math.acos(vec3.dot(vec3.scale(vec3.create(), this.gravity, -1 / gravS), n));
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

			let v = this.item.vel;
			this.angle = Math.atan2(v[0], -v[2]);
		} else if (colType == MKDS_COLTYPE.OOB || colType == MKDS_COLTYPE.FALL) {
			if (this.item.deadTimer == 0) this.item.deadTimer++;
		} else if (MKDS_COLTYPE.GROUP_ROAD.indexOf(colType) != -1) {
			//sliding plane
			let proj = vec3.dot(this.item.vel, n);
			vec3.sub(this.item.vel, this.item.vel, vec3.scale(vec3.create(), n, proj));
			this.item.stuckTo = dat.object;
		} else {
			adjustPos = false;
			ignoreList.push(plane);
		}

		let rVelMag = Math.sqrt(vec3.dot(this.item.vel, this.item.vel));
		vec3.scale(this.item.vel, this.item.vel, this.speed / rVelMag); //force speed to shell speed for red shells.

		if (adjustPos) {
			//move back from plane slightly
			vec3.add(pos, pos, vec3.scale(vec3.create(), n, this.minimumMove));
		}
	}

	private _loadTrackPaths(scene: Scene): boolean {
		const nkm = scene.nkm;
		if (nkm.sections.EPAT?.entries?.length && nkm.sections.EPOI?.entries?.length) {
			this._paths = nkm.sections.EPAT.entries;
			this._points = nkm.sections.EPOI.entries;
			return true;
		}
		if (nkm.sections.MEPA?.entries?.length && nkm.sections.MEPO?.entries?.length) {
			this._paths = nkm.sections.MEPA.entries;
			this._points = nkm.sections.MEPO.entries;
			return true;
		}
		if (nkm.sections.IPAT?.entries?.length && nkm.sections.IPOI?.entries?.length) {
			this._paths = nkm.sections.IPAT.entries;
			this._points = nkm.sections.IPOI.entries;
			return true;
		}
		return false;
	}

	private _resolveChaseTarget(scene: Scene): Kart | null {
		const candidate = this._findTarget(scene);

		if (candidate === this._chaseTarget) {
			this._pendingChaseTarget = null;
			this._pendingChaseTargetFrames = 0;
			return this._chaseTarget;
		}

		if (candidate === this._pendingChaseTarget) {
			if (++this._pendingChaseTargetFrames >= ROUTE_DEBOUNCE_FRAMES) {
				this._chaseTarget = candidate;
				this._pendingChaseTarget = null;
				this._pendingChaseTargetFrames = 0;
			}
		} else {
			this._pendingChaseTarget = candidate;
			this._pendingChaseTargetFrames = 1;
		}

		return this._chaseTarget;
	}

	private _initRouteFromKart(kart: Kart, scene: Scene) {
		const ctrl = kart.controller;
		if (ctrl instanceof controlRaceCPU) {
			this._paths = ctrl.paths;
			this._points = ctrl.points;
			if (!this._points.length) {
				this._pathReady = false;
				return;
			}
			const poiInd = Math.max(ctrl.ePoiInd, this._nearestForwardPointIndex());
			this._pathReady = this._assignRoutePoint(poiInd);
			return;
		}

		if (!this._paths.length && !this._loadTrackPaths(scene)) {
			this._pathReady = false;
			return;
		}

		const poiInd = this._nearestForwardPointIndex(kart.pos);
		this._pathReady = this._assignRoutePoint(poiInd);
	}

	private _initRouteForward(scene: Scene) {
		if (!this._paths.length && !this._loadTrackPaths(scene)) {
			this._pathReady = false;
			return;
		}

		const poiInd = this._nearestForwardPointIndex();
		this._pathReady = this._assignRoutePoint(poiInd);
	}

	private _requestRoutePoint(poiInd: number, immediate = false): boolean {
		if (!this._points.length || !this._paths.length) return false;
		poiInd = Math.max(0, Math.min(poiInd, this._points.length - 1));
		if (this._pathReady && poiInd < this._ePoiInd) poiInd = this._ePoiInd;
		if (poiInd === this._ePoiInd) return true;

		const sequential = poiInd === this._ePoiInd + 1;
		if (immediate || sequential) {
			this._pendingPoiInd = null;
			this._pendingPoiFrames = 0;
			return this._assignRoutePoint(poiInd);
		}

		if (this._poiLockFrames > 0) return true;

		if (this._pendingPoiInd !== poiInd) {
			this._pendingPoiInd = poiInd;
			this._pendingPoiFrames = 1;
			return true;
		}
		if (++this._pendingPoiFrames < ROUTE_DEBOUNCE_FRAMES) return true;

		this._pendingPoiInd = null;
		this._pendingPoiFrames = 0;
		this._poiLockFrames = ROUTE_DEBOUNCE_FRAMES;
		return this._assignRoutePoint(poiInd);
	}

	private _assignRoutePoint(poiInd: number): boolean {
		if (!this._points.length || !this._paths.length) return false;
		poiInd = Math.max(0, Math.min(poiInd, this._points.length - 1));
		if (this._pathReady && poiInd < this._ePoiInd) poiInd = this._ePoiInd;
		this._ePoiInd = poiInd;
		this._ePoi = this._points[poiInd];
		if (!this._ePoi) return false;
		this._recomputePath();
		this._calcDestNorm();
		vec3.copy(this._destPoint, this._ePoi.pos);
		return true;
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

	private _nearestForwardPointIndex(nearPos?: vec3) {
		const ref = nearPos ?? this.item.pos;
		let nearest = this._ePoiInd;
		let nearestDist = Infinity;
		for (let i = 0; i < this._points.length; i++) {
			if (!this._isAheadAngle(this._angleTo(this._points[i].pos))) continue;
			const d = vec3.squaredDistance(ref, this._points[i].pos);
			if (d < nearestDist) {
				nearestDist = d;
				nearest = i;
			}
		}
		if (nearestDist === Infinity) {
			if (this._pathReady) return this._ePoiInd;
			return this._nearestPointIndex(ref);
		}
		return Math.max(this._ePoiInd, nearest);
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

	private _skipBackwardWaypoints() {
		if (!this._ePoi) return;
		if (!this._isAheadAngle(this._angleTo(this._ePoi.pos))) {
			this._advancePoint();
		}
	}

	private _recomputePath() {
		const path = this._pathForIndex(this._ePoiInd);
		if (path) this._ePath = path;
	}

	private _advancePoint(): boolean {
		if (!this._ePoi || !this._paths.length || !this._ePath) return false;

		const routeCtrl = this._routeTarget?.controller;
		if (routeCtrl instanceof controlRaceCPU && routeCtrl.ePoiInd > this._ePoiInd + 1) {
			return this._requestRoutePoint(routeCtrl.ePoiInd);
		}

		const nextInd = this._ePoiInd + 1;
		if (nextInd < this._ePath.startInd + this._ePath.pathLen) {
			return this._requestRoutePoint(nextInd);
		}

		if (!this._ePath.dest.length) return false;

		if (routeCtrl instanceof controlRaceCPU && routeCtrl.ePoiInd > this._ePoiInd) {
			return this._requestRoutePoint(routeCtrl.ePoiInd);
		}

		const nextPath = this._paths[this._ePath.dest[0]];
		if (!nextPath) return false;
		this._ePath = nextPath;
		return this._requestRoutePoint(this._ePath.startInd);
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

	private _updatePathProgress() {
		if (!this._ePoi) return;

		if (this._routeTarget?.controller instanceof controlRaceCPU) {
			const ctrl = this._routeTarget.controller;
			if (ctrl.ePoiInd > this._ePoiInd + 1) {
				this._requestRoutePoint(ctrl.ePoiInd);
			}
		}

		const dist = vec3.dot(this._destNorm, this.item.pos) + this._destConst;
		if (dist < this._pointSize() * POI_ADVANCE_RATIO) {
			this._advancePoint();
		}
		if (this._ePoi) vec3.copy(this._destPoint, this._ePoi.pos);
	}

	private _findTarget(scene: Scene): Kart | null {
		const owner = this.item.owner;
		const ownerRacePos = owner.getPosition();
		const hasRacePos = (scene.nkm.sections.CPOI?.entries?.length ?? 0) > 0;

		let best: Kart | null = null;
		let bestMetric = Infinity;

		for (const kart of scene.karts) {
			if (!kart.active || kart === owner || kart === this.item.safeKart) continue;

			if (hasRacePos) {
				const kartRacePos = kart.getPosition();
				if (kartRacePos <= ownerRacePos) continue;
				const metric = kartRacePos - ownerRacePos;
				if (metric < bestMetric) {
					bestMetric = metric;
					best = kart;
				}
				continue;
			}

			const targetAngle = this._angleTo(kart.pos);
			if (!this._isAheadAngle(targetAngle)) continue;
			const dist = vec3.squaredDistance(this.item.pos, kart.pos);
			if (dist < bestMetric) {
				bestMetric = dist;
				best = kart;
			}
		}

		return best;
	}

	private _homingWeight(target: Kart) {
		const dist = vec3.distance(this.item.pos, target.pos);
		const proximity = Math.min(1, 320 / Math.max(dist, 1));
		return Math.min(1, 1 - TRACK_BLEND + proximity * 0.35);
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
