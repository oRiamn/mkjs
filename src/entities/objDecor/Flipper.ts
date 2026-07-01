import { MKDS_COLTYPE } from "../../engine/collisionTypes";
import { MKDSCONST } from "../../engine/mkdsConst";
import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { nsbta, nsbta_data_obj } from "../../formats/nsbta";
import { nitromodel_BoundingCollisionModel } from "../../render/nitroModel";
import { modelPolyLocalBounds, modelPolyLocalYBounds, modelWorldYExtent } from "../../utils/modelLocalBounds";
import { nitroRender } from "../../render/nitroRender";
import { ObjDecor } from "../objDecor";

/** Retail flipper.nsbta / nsbtp electric discharge keyframes. */
const FLIPPER_ANIM_FRAMES = 32;
/** Wall-clock length of one flipper swing (@ 60 fps). */
const FLIPPER_SWING_DURATION = 60;
/** nsbta translateS 0→2 maps to this many degrees of mesh swing. */
const FLIPPER_SWING_DEG = 65;
/** flipper.nsbmd rest pose is open; closed rest offset magnitude on the hinge axis. */
const FLIPPER_REST_DEG = -45;
const FLIPPER_SWING_PER_TRANSLATE = FLIPPER_SWING_DEG / 2;
/** Mean idle wait between swing triggers (@ 60 fps). */
export const FLIPPER_TRIGGER_INTERVAL = 160;

function _pickFlipperWait(): number {
	const base = FLIPPER_TRIGGER_INTERVAL;
	return Math.max(1, base + Math.floor((Math.random() - 0.5) * base));
}

function _dumpSetting(val: number) {
	return { hex: "0x" + val.toString(16), low16: val & 0xffff, high16: val >>> 16 };
}

function _lerpNsbta(frame: number, step: number, values: number[]): number {
	if (values.length === 1) return values[0];
	const i = (frame / (1 << step)) % 1;
	let len = values.length;
	if (step > 0) len -= 1;
	const frame1 = (frame >> step) % len;
	const from = values[frame1];
	const to = values[frame1 + 1] ?? values[frame1];
	return to * i + from * (1 - i);
}

/** Map swing phase (1..duration−1) to a 0→peak→0 nsbta sample index. */
export function flipperSwingAnimFrame(phase: number, swingDuration = FLIPPER_SWING_DURATION): number {
	if (phase <= 0 || phase >= swingDuration) return 0;
	const t = (phase - 1) / (swingDuration - 2);
	const progress = t <= 0.5 ? t * 2 : 2 - t * 2;
	return progress * (FLIPPER_ANIM_FRAMES - 1);
}

/** Right flipper = −1, left (setting1 & 1) = +1 — same sign for rest offset and swing. */
function flipperSideSign(mirror: boolean): number {
	return mirror ? 1 : -1;
}

/** Mesh swing in degrees from nsbta translateS at the given anim frame. */
export function flipperSwingDeg(frame: number, mirror: boolean, texAnimKeys?: nsbta_data_obj | null): number {
	let translateS = frame / (FLIPPER_ANIM_FRAMES - 1) * 2;
	if (texAnimKeys != null) {
		const k = texAnimKeys;
		translateS = _lerpNsbta(frame, k.frameStep.translateS, k.translateS);
	}
	return translateS * FLIPPER_SWING_PER_TRANSLATE * flipperSideSign(mirror);
}

/** Closed rest pose offset on the hinge axis (open mesh → rest closed). */
export function flipperRestDeg(mirror: boolean): number {
	return FLIPPER_REST_DEG * flipperSideSign(mirror);
}

/**
 * Pinball flipper (0x01a9) on Waluigi Pinball / donkey_course / luigi_course.
 *
 * --- ROM assets ---
 *   flipper.nsbmd — mesh (long axis +X; main faces normal ±Z, hinge at maxX/minY;
 *                  rest pose is open; ±FLIPPER_REST_DEG closes it per side)
 *   flipper.nsbta — 32-frame timing; translateS 0→2 drives mesh swing out and back
 *   flipper.nsbtp — electric discharge textures during the swing window
 *
 * --- OBJI (retail, no PATH on any course) ---
 *   setting1 & 1 — side mirror (0 = right @ +X, 1 = left @ −X); negates mesh X scale.
 *   angle[0] — rest pitch (10° on pinball_course, 0 elsewhere).
 *
 * --- Timing ---
 *   After each swing, idle for a random wait (~FLIPPER_TRIGGER_INTERVAL f @ 60 fps, ±50%).
 *
 * --- Behaviour ---
 *   translate → swing at hinge (axis = OBJI-tilted local Y) → rotateZ/Y/X (OBJI)
 *   → scale (mirror: scale.x = −1). Swing is applied after rest orientation on the mesh.
 *   Left flipper uses frontFace CW while drawing. Collision always active;
 *   WALL at rest, KNOCKBACK_DAMAGE during the swing.
 */
export class Flipper extends ObjDecor {
	colRad: number;
	knockbackDamage = MKDSCONST.DAMAGE_SPIN;
	private _texAnimKeys: nsbta_data_obj | null = null;
	private _mirrorMesh: boolean;
	private _cooldown: number;
	private _swingPhase = 0;
	private _hingeLocal: vec3 = [0, 0, 0];
	private _displayFrame = 0;
	private _swingDeg = 0;
	private _colRes!: nitromodel_BoundingCollisionModel;
	private _colMat: mat4;
	private _colFrame = 0;
	private _drawMat = mat4.create();

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this._staringAtCamera = false;
		this.collidable = true;
		this.colRad = 512;
		this._colMat = mat4.create();

		this._mirrorMesh = (obji.setting1 & 1) !== 0;
		this._cooldown = _pickFlipperWait();
	}


	requireRes() {
		return { mdl: [{ nsbmd: "flipper.nsbmd" }], other: ["flipper.nsbta", null, "flipper.nsbtp"] };
	}

	provideRes(r: ProvidedRes) {
		const poly = r.mdl[0].bmd.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalBounds(poly.disp);
		this._hingeLocal = [bounds.max[0], bounds.min[1], bounds.center[2]];
		const yBounds = modelPolyLocalYBounds(poly.disp);
		const world = modelWorldYExtent(yBounds.minY, yBounds.maxY, this.scale[1]);
		this._yOffset = -world.bottom - world.height / 2;

		super.provideRes(r);

		const texAnim = r.other?.[0];
		if (texAnim != null) {
			const bta = texAnim as nsbta;
			this._texAnimKeys = bta.animData.objectData[0].data.objectData[0];
		}

		this._colRes = r.mdl[0].getBoundingCollisionModel(0, 0);
		this._updateColType();
		this._setColMat();
	}

	getCollision() {
		if (!this._colRes) return { tris: [], mat: this._colMat, frame: 0 };
		return { tris: this._colRes.dat, mat: this._colMat, frame: this._colFrame };
	}

	protected texAnimFrame(_gameFrame: number): number {
		return this._displayFrame;
	}

	update(scn?: Scene) {
		const wasSwinging = this._swingPhase > 0;

		if (this._swingPhase > 0) {
			const animFrame = flipperSwingAnimFrame(this._swingPhase);
			this._displayFrame = animFrame;
			this._swingDeg = flipperSwingDeg(animFrame, this._mirrorMesh, this._texAnimKeys);

			if (++this._swingPhase >= FLIPPER_SWING_DURATION) {
				this._swingPhase = 0;
				this._cooldown = _pickFlipperWait();
			}
		} else {
			this._displayFrame = 0;
			this._swingDeg = 0;
			if (--this._cooldown <= 0) {
				this._swingPhase = 1;
			}
		}

		if (wasSwinging !== this._swingPhase > 0) {
			this._updateColType();
		}
		this._setColMat();
		this._colFrame++;

		super.update(scn);
	}

	draw(view: mat4, pMatrix: mat4) {
		if (!this._res) return;

		const texFrame = this.texAnimFrame(this._displayFrame);
		for (let i = 0; i < this._res.mdl.length; i++) {
			this._res.mdl[i].setFrame(texFrame);
		}

		this._buildDrawMat(view, this._drawMat);

		if (this._mirrorMesh) nitroRender.setMirroredFrontFace(true);
		for (let i = 0; i < this._res.mdl.length; i++) {
			this._res.mdl[i].draw(this._drawMat, pMatrix);
		}
		if (this._mirrorMesh) nitroRender.setMirroredFrontFace(false);
	}

	private _buildDrawMat(view: mat4, out: mat4) {
		mat4.translate(out, view, this._placementPos());

		const hinge = this._hingeLocal;
		const swing = (flipperRestDeg(this._mirrorMesh) + this._swingDeg) * (Math.PI / 180);
		const axis = this._swingAxis();
		mat4.translate(out, out, vec3.negate(vec3.create(), hinge));
		mat4.rotate(out, out, swing, axis);
		mat4.translate(out, out, hinge);

		if (this.angle[2] !== 0) mat4.rotateZ(out, out, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] !== 0) mat4.rotateY(out, out, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] !== 0) mat4.rotateX(out, out, this.angle[0] * (Math.PI / 180));

		const scaleVec = vec3.scale(vec3.create(), vec3.mul(vec3.create(), this.scale, this._drawScale), 16);
		if (this._mirrorMesh) scaleVec[0] *= -1;
		mat4.scale(out, out, scaleVec);
	}

	/** Local +Y after OBJI rest rotation — the flipper swing axis. */
	private _swingAxis(): vec3 {
		const rot = mat4.create();
		if (this.angle[2] !== 0) mat4.rotateZ(rot, rot, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] !== 0) mat4.rotateY(rot, rot, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] !== 0) mat4.rotateX(rot, rot, this.angle[0] * (Math.PI / 180));
		const axis = vec3.create();
		vec3.transformMat4(axis, [0, 1, 0], rot);
		return vec3.normalize(axis, axis);
	}

	private _updateColType() {
		if (!this._colRes) return;
		const colType = this._swingPhase > 0 ? MKDS_COLTYPE.KNOCKBACK_DAMAGE : MKDS_COLTYPE.WALL;
		const packed = colType << 8;
		for (let i = 0; i < this._colRes.dat.length; i++) {
			this._colRes.dat[i].CollisionType = packed;
		}
	}

	private _setColMat() {
		if (!this._colRes) return;
		const world = mat4.create();
		this._buildDrawMat(mat4.create(), world);
		mat4.scale(this._colMat, world, [this._colRes.scale, this._colRes.scale, this._colRes.scale]);
	}
}
