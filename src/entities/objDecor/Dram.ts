import { nkm_section_OBJI } from "../../formats/nkm";
import { getRandomInt } from "../../utils/getRandomInt";
import { ObjDecor } from "../objDecor";

/** Default item count on the dram wheel (360° / 10 = 36° per slot). */
const SLOT_COUNT = 10;

/** Minimum full rotations per spin cycle. */
const DRAM_MIN_ROTATIONS = 2;

/** Maximum full rotations per spin cycle. */
const DRAM_MAX_ROTATIONS = 5;

/** Cruise duration at constant speed (frames). */
const DRAM_CRUISE_FRAMES = 150;

/** Deceleration duration (frames). */
const DRAM_DECEL_FRAMES = 80;

/** Pause while stopped (frames). */
const DRAM_PAUSE_FRAMES = 180;

/** Angle between two consecutive dram slots. */
const SLOT_STEP_ANGLE = (2 * Math.PI) / SLOT_COUNT;

enum DramState {
	Pause,
	Cruise,
	Decel,
}

/** Cubic Hermite deceleration: starts at startSpeed, ends at rest on targetAngle. */
function dramDecelAngle(
	startAngle: number,
	targetAngle: number,
	progress: number,
	startSpeed: number,
	durationFrames: number,
): number {
	const t = Math.max(0, Math.min(1, progress));
	const t2 = t * t;
	const t3 = t2 * t;
	const m0 = startSpeed * durationFrames;
	return (2 * t3 - 3 * t2 + 1) * startAngle + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * targetAngle;
}


/** Normalize an angle to [0, 2π). */
function dramNormalizeAngle(angle: number): number {
	const twoPi = 2 * Math.PI;
	let a = angle % twoPi;
	if (a < 0) a += twoPi;
	return a;
}

/**
 * Final stop angle: at least fullRotations complete turns from start, aligned on winningSlot.
 */
function dramSpinTargetAngle(
	startAngle: number,
	winningSlot: number,
	fullRotations: number,
): number {
	const targetNorm = winningSlot * SLOT_STEP_ANGLE;
	const minAngle = startAngle + fullRotations * 2 * Math.PI;
	const minNorm = dramNormalizeAngle(minAngle);
	let delta = targetNorm - minNorm;
	if (delta <= 0) delta += 2 * Math.PI;
	return minAngle + delta;
}

/**
 * Cruise speed for a spin that ends on targetAngle after cruise + Hermite decel.
 * Hermite decel distance ≈ startSpeed × decelFrames / 4.
 */
function dramCruiseSpeed(totalTravel: number, cruiseFrames: number, decelFrames: number): number {
	return totalTravel / (cruiseFrames + decelFrames / 4);
}

/**
 * Item roulette (dram, 0x00d2) on Waluigi Pinball / DK Pass.
 *
 * Horizontal drum: items scroll around the local X axis (after OBJI placement).
 * Spin cycle: pause → cruise → ease-out decel → repeat.
 * Each spin travels DRAM_MIN_ROTATIONS..DRAM_MAX_ROTATIONS full turns, then stops on a random slot.
 *
 * Phase timings are hardcoded (see DRAM_* constants).
 */
export class Dram extends ObjDecor {
	private _wheelAngle: number;
	private _winningSlot: number;
	private _mode: DramState;
	private _cruiseDur: number;
	private _pauseDur: number;
	private _decelDur: number;
	private _cruiseSpeed = 0;
	private _spinTargetAngle = 0;
	private _time = 0;
	private _decelStartAngle = 0;
	private _decelTargetAngle = 0;
	private _drawMat = mat4.create();

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this._staringAtCamera = false;
		this.collidable = false;
		this._cruiseDur = DRAM_CRUISE_FRAMES;
		this._pauseDur = DRAM_PAUSE_FRAMES;
		this._decelDur = DRAM_DECEL_FRAMES;

		this._mode = DramState.Pause;
		this._wheelAngle = 0;
		this._winningSlot = 0;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "dram.nsbmd" }] };
	}

	private _beginSpin() {
		this._winningSlot = getRandomInt(0, SLOT_COUNT);
		const rotations = getRandomInt(DRAM_MIN_ROTATIONS, DRAM_MAX_ROTATIONS);
		this._spinTargetAngle = dramSpinTargetAngle(this._wheelAngle, this._winningSlot, rotations);
		const travel = this._spinTargetAngle - this._wheelAngle;
		this._cruiseSpeed = dramCruiseSpeed(travel, this._cruiseDur, this._decelDur);
	}

	update(_scene: Scene) {
		this._time++;

		switch (this._mode) {
			case DramState.Pause:
			default: {
				if (this._time >= this._pauseDur) {
					this._time = 0;
					this._beginSpin();
					this._mode = DramState.Cruise;
				}
				break;
			}
			case DramState.Cruise: {
				this._wheelAngle += this._cruiseSpeed;
				if (this._time >= this._cruiseDur) {
					this._time = 0;
					this._decelStartAngle = this._wheelAngle;
					this._decelTargetAngle = this._spinTargetAngle;
					this._mode = DramState.Decel;
				}
				break;
			}
			case DramState.Decel: {
				const progress = this._time / this._decelDur;
				if (progress >= 1) {
					this._wheelAngle = this._decelTargetAngle;
					this._time = 0;
					this._mode = DramState.Pause;
				} else {
					this._wheelAngle = dramDecelAngle(
						this._decelStartAngle,
						this._decelTargetAngle,
						progress,
						this._cruiseSpeed,
						this._decelDur,
					);
				}
				break;
			}
		}
	}

	draw(view: mat4, pMatrix: mat4) {
		if (this._res == null) return;

		mat4.translate(this._drawMat, view, this._placementPos());

		if (this.angle[2] !== 0) mat4.rotateZ(this._drawMat, this._drawMat, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] !== 0) mat4.rotateY(this._drawMat, this._drawMat, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] !== 0) mat4.rotateX(this._drawMat, this._drawMat, this.angle[0] * (Math.PI / 180));

		mat4.rotateX(this._drawMat, this._drawMat, this._wheelAngle);

		mat4.scale(
			this._drawMat,
			this._drawMat,
			vec3.scale([0, 0, 0], vec3.mul(vec3.create(), this.scale, this._drawScale), 16),
		);

		this._res.mdl[0].draw(this._drawMat, pMatrix);
	}
}
