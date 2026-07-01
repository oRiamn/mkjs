//
// cameraFollowObject.ts
//--------------------
// Debug camera that follows any scene object with a `pos` field.
//

import { courseScene } from "../scenes/courseScene";
import { nitroRender } from "../../render/nitroRender";

export type CameraFollowTarget = {
	pos: vec3;
	angle?: vec3;
	colRad?: number;
};

function cameraOffsets(target: CameraFollowTarget): { cam: vec3; lookAt: vec3 } {
	const r = target.colRad != null && target.colRad > 0 ? target.colRad : 256;
	return {
		cam: [0, r / 4, -r / 3],
		lookAt: [0, r / 8, 0],
	};
}

export class cameraFollowObject implements Camera {
	target: CameraFollowTarget;
	targetShadowPos: vec3;
	view!: CamView;
	private _camOffset: vec3;
	private _lookAtOffset: vec3;
	private _camAngle: number;
	private _prevPos: vec3;

	constructor(target: CameraFollowTarget) {
		this.target = target;
		this.targetShadowPos = vec3.clone(target.pos);
		const offsets = cameraOffsets(target);
		this._camOffset = offsets.cam;
		this._lookAtOffset = offsets.lookAt;
		this._camAngle = target.angle != null ? target.angle[1] * (Math.PI / 180) : 0;
		this._prevPos = vec3.clone(target.pos);
	}

	getView(_scene: Scene, width?: number, height?: number): CamView {
		const pos = this.target.pos;
		const targetAngle = this._resolveAngle(pos);
		this._camAngle += this._dirDiff(targetAngle, this._camAngle) * 0.075;
		this._prevPos = vec3.clone(pos);

		const forward = [Math.sin(this._camAngle), 0, -Math.cos(this._camAngle)] as vec3;
		const up: vec3 = [0, 1, 0];
		const side = vec3.cross([0, 0, 0], forward, up);

		const camPos = vec3.add(
			[0, 0, 0],
			vec3.scale([0, 0, 0], up, this._camOffset[1]),
			vec3.add(
				[0, 0, 0],
				vec3.scale([0, 0, 0], side, this._camOffset[0]),
				vec3.scale([0, 0, 0], forward, this._camOffset[2])
			)
		);
		const lookAtPos = vec3.scale([0, 0, 0], up, this._lookAtOffset[1]);

		vec3.scale(camPos, camPos, 1 / 1024);
		vec3.scale(lookAtPos, lookAtPos, 1 / 1024);

		const mat = mat4.lookAt(mat4.create(), camPos, lookAtPos, up);
		mat4.translate(mat, mat, vec3.scale([0, 0, 0], pos, -1 / 1024));

		const aspect = width != null && height != null && height > 0 ? width / height : gl.viewportWidth / gl.viewportHeight;
		const p = mat4.perspective(mat4.create(), (70 / 180) * Math.PI, aspect, 0.01, 10000.0);

		this.targetShadowPos = vec3.clone(pos);

		this.view = {
			p,
			mv: mat,
			pos: vec3.scale(
				[0, 0, 0],
				vec3.transformMat4([0, 0, 0], [0, 0, 0], mat4.invert(mat4.create(), mat)),
				1024
			),
		};

		return this.view;
	}

	private _resolveAngle(pos: vec3): number {
		const dx = pos[0] - this._prevPos[0];
		const dz = pos[2] - this._prevPos[2];
		if (dx * dx + dz * dz > 1) {
			return Math.atan2(dx, -dz);
		}
		if (this.target.angle != null) {
			return this.target.angle[1] * (Math.PI / 180);
		}
		return this._camAngle;
	}

	private _fixDir(dir: number) {
		return ((dir % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
	}

	private _dirDiff(dir1: number, dir2: number) {
		const d = this._fixDir(dir1 - dir2);
		return d > Math.PI ? -2 * Math.PI + d : d;
	}
}

function getActiveCourseScene(): courseScene | null {
	return courseScene.active;
}

/** Lock the ingame camera onto a scene object (e.g. an IronBall instance). */
export function focusCameraOn(obj: CameraFollowTarget): boolean {
	const scene = getActiveCourseScene();
	if (scene == null) {
		console.warn("focusCameraOn: no active course scene (is the race running?)");
		return false;
	}

	const cam = new cameraFollowObject(obj);
	cam.getView(scene, nitroRender.getViewWidth(), nitroRender.getViewHeight());
	scene.camera = cam;
	console.log("focusCameraOn: following object at", obj.pos.slice());
	return true;
}
