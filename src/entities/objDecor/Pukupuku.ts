import { nkm_section_OBJI } from "../../formats/nkm";
import { modelPolyLocalYBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { ObjDecor } from "../objDecor";

/** Jump arc length in frames (≈0.8 s @ 60 fps). */
const PUKUPUKU_JUMP_DUR = 48;
/** Shortest pause between jumps (frames). */
const PUKUPUKU_WAIT_MIN = 28;
/** Longest pause between jumps (frames). */
const PUKUPUKU_WAIT_MAX = 72;
/** Default peak height when NKM setting4 high half is 0 (world units). */
const PUKUPUKU_JUMP_HEIGHT = 40;
/** Horizontal wander radius around the OBJI anchor (world units). */
const PUKUPUKU_ZONE_RADIUS = 50;

/** Cheep Cheep beach decoration (0x019b). Jumps out of the water on a sine arc.
 *
 * Beach course stores timing in setting4:
 * - setting4 >> 16: base jump height in 1/256 world units (beach_course uses 10000 → ~39)
 * - setting4 & 0xffff: wait between jumps in frames (0 → random short wait)
 * - setting2: extra start delay in frames
 *
 * Each instance wanders in a small XZ patch and picks a new jump height every leap.
 * The mesh is a single flat quad; full billboards keep it facing the camera.
 */
export class Pukupuku extends ObjDecor {
	private _homePos: vec3;
	private _seed: number;
	private _baseJumpHeight: number;
	private _jumpHeight: number;
	private _waitDur: number;
	private _jumpDur: number;
	private _startDelay: number;
	private _jumpCount = 0;
	private _tick = 0;
	private _phaseFrame = 0;
	private _phase: "delay" | "wait" | "jump";
	private _visible = false;
	private _jumpArc = 0;
	private _surfaceY = 0;
	private _buryDepth = 0;
	private _zoneRX: number;
	private _zoneRZ: number;
	private _wanderPhaseX: number;
	private _wanderPhaseZ: number;
	private _wanderSpeed: number;
	private _fixedWait: number;

	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;

		this._homePos = vec3.clone(obji.pos);
		this._seed = _pukupukuSeed(obji);
		const rawHeight = obji.setting4 >> 16;
		this._baseJumpHeight = rawHeight > 0 ? rawHeight / 256 : PUKUPUKU_JUMP_HEIGHT;
		this._jumpHeight = this._baseJumpHeight;
		this._jumpDur = PUKUPUKU_JUMP_DUR;
		this._fixedWait = obji.setting4 & 0xffff;
		this._waitDur = _pickWait(this._fixedWait, this._seed, 0);
		this._startDelay = obji.setting2 + Math.floor(_hash01(this._seed, 0) * PUKUPUKU_WAIT_MAX);
		this._phase = this._startDelay > 0 ? "delay" : "wait";

		const zone = PUKUPUKU_ZONE_RADIUS * (0.55 + _hash01(this._seed, 1) * 0.45);
		this._zoneRX = zone * (0.7 + _hash01(this._seed, 2) * 0.3);
		this._zoneRZ = zone * (0.7 + _hash01(this._seed, 3) * 0.3);
		this._wanderPhaseX = _hash01(this._seed, 4) * Math.PI * 2;
		this._wanderPhaseZ = _hash01(this._seed, 5) * Math.PI * 2;
		this._wanderSpeed = 0.018 + _hash01(this._seed, 6) * 0.014;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "pukupuku.nsbmd" }] };
	}

	provideRes(r: ProvidedRes) {
		const poly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalYBounds(poly.disp);
		const world = modelWorldYExtent(bounds.minY, bounds.maxY, this.scale[1]);
		this._surfaceY = -world.bottom;
		this._buryDepth = world.height;

		super.provideRes(r);

		for (let i = 0; i < r.mdl.length; i++) {
			const bmd = r.mdl[i].bmd;
			bmd.hasBillboards = true;
			const models = bmd.modelData.objectData;
			for (let j = 0; j < models.length; j++) {
				const objs = models[j].objects.objectData;
				for (let k = 0; k < objs.length; k++) {
					objs[k].billboardMode = 1;
				}
			}
		}

		this._yOffset = this._surfaceY - this._buryDepth;
	}

	update(_scn?: Scene) {
		this._tick++;
		this._phaseFrame++;
		this._applyWander();

		switch (this._phase) {
			case "delay":
				this._visible = false;
				this._jumpArc = 0;
				this._yOffset = this._surfaceY - this._buryDepth;
				if (this._phaseFrame >= this._startDelay) {
					this._beginWait();
				}
				break;
			case "wait":
				this._visible = false;
				this._jumpArc = 0;
				this._yOffset = this._surfaceY - this._buryDepth;
				if (this._phaseFrame >= this._waitDur) {
					this._beginJump();
				}
				break;
			case "jump": {
				const t = Math.min(1, this._phaseFrame / this._jumpDur);
				this._jumpArc = Math.sin(t * Math.PI);
				this._yOffset = this._surfaceY - this._buryDepth * (1 - this._jumpArc) + this._jumpHeight * this._jumpArc;
				this._visible = this._jumpArc > 0.05;
				if (this._phaseFrame >= this._jumpDur) {
					this._beginWait();
				}
				break;
			}
		}
	}

	draw(view: mat4, pMatrix: mat4) {
		if (!this._visible) return;
		super.draw(view, pMatrix);
	}

	private _beginWait() {
		this._phase = "wait";
		this._phaseFrame = 0;
		this._waitDur = _pickWait(this._fixedWait, this._seed, this._jumpCount);
	}

	private _beginJump() {
		this._phase = "jump";
		this._phaseFrame = 0;
		this._jumpCount++;
		this._jumpHeight = _pickJumpHeight(this._baseJumpHeight, this._seed, this._jumpCount);
	}

	private _applyWander() {
		const t = this._tick * this._wanderSpeed;
		const bob = Math.sin(t * 1.7 + this._wanderPhaseX) * this._zoneRX * 0.18;
		const weave = Math.cos(t * 2.3 + this._wanderPhaseZ) * this._zoneRZ * 0.18;
		this.pos[0] = this._homePos[0] + Math.sin(t + this._wanderPhaseX) * this._zoneRX + bob;
		this.pos[2] = this._homePos[2] + Math.cos(t * 0.85 + this._wanderPhaseZ) * this._zoneRZ + weave;
	}
}

function _pukupukuSeed(obji: nkm_section_OBJI): number {
	return Math.abs(Math.floor(obji.pos[0] * 12.9898 + obji.pos[2] * 78.233 + obji.pos[1] * 37.719)) | 0;
}

function _hash01(seed: number, salt: number): number {
	const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
	return x - Math.floor(x);
}

function _pickWait(fixedWait: number, seed: number, jumpCount: number): number {
	if (fixedWait > 0) return fixedWait;
	const t = _hash01(seed, 10 + jumpCount * 3);
	return Math.floor(PUKUPUKU_WAIT_MIN + t * (PUKUPUKU_WAIT_MAX - PUKUPUKU_WAIT_MIN));
}

function _pickJumpHeight(base: number, seed: number, jumpCount: number): number {
	const t = _hash01(seed, 20 + jumpCount * 5);
	return base * (0.5 + t * 1.1);
}
