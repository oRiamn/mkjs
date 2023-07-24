//
// cameraSpectator.js
//--------------------
// Spectates a specific kart. Requires NKM AREA and CAME to be set up correctly.
// by RHY3756547
//
// includes: main.js

import { Kart } from "../../entities/kart";
import { nkm_section_CAME, nkm_section_POIT } from "../../formats/nkm";

//
export class cameraSpectator implements Camera {
	kart: Kart;
	targetShadowPos: vec3;
	mat: mat4;
	curCamNum: number;
	curCam: nkm_section_CAME;
	route: nkm_section_POIT[];
	routePos: number;
	routeSpeed: number;
	routeProg: number;
	relPos: vec3;
	posOff: any[];
	normalFOV: number;
	zoomLevel: number;
	viewW: number;
	viewH: number;
	view: CamView;
	camAngle: number;
	camNormal: vec3;

	constructor(kart: Kart) {
		this.kart = kart;
		this.targetShadowPos = [0, 0, 0]

		this.mat = mat4.create();
		this.curCamNum = -1;
		this.curCam = null;
		this.route = [];
		this.routePos = 0;
		this.routeSpeed = 0;
		this.routeProg = 0;
		this.relPos = [0, 0, 0];
		this.posOff = [];
		this.normalFOV = 70;
		this.zoomLevel = 1;
		this.viewW = 0;
		this.viewH = 0;
		this.camAngle = 0;
		this.camNormal = [0, 1, 0];
	}

	initDashCam(_scene: Scene, came: nkm_section_CAME) {
		var mat = mat4.create();
		mat4.rotateY(mat, mat, (180 - came.pos2[0]) * (Math.PI / 180));
		mat4.rotateX(mat, mat, -came.pos2[1] * (Math.PI / 180));


		this.relPos = vec3.transformMat4([0, 0, 0], [0, 0, -came.pos2[2]], mat);
		/*var basis = kart.basis;
		relPos = vec3.sub(relPos, came.pos1, kart.pos);
		vec3.transformMat4(relPos, relPos, mat4.invert([], basis));*/
	}

	initCam1(scene: Scene, came: nkm_section_CAME) {
		var routes = scene.paths;
		this.route = routes[came.camRoute];
		this.routePos = 0;
		this.routeProg = 0;
		this.recalcRouteSpeed();

	}

	initPointCam(scene: Scene, came: nkm_section_CAME) {
		var routes = scene.paths;
		this.route = routes[came.camRoute];
		this.routePos = 0;
		this.routeProg = 0;
		this.recalcRouteSpeed();
	}

	pointCamFunc(_scene: Scene, came: nkm_section_CAME): CamView {
		//point cam
		var camPos = vec3.clone(came.pos1);

		var lookAtPos = vec3.transformMat4([0, 0, 0], [0, 4, 0], this.kart.mat);

		vec3.scale(camPos, camPos, 1 / 1024);
		vec3.scale(lookAtPos, lookAtPos, 1 / 1024);

		var mat = mat4.lookAt(mat4.create(), camPos, lookAtPos, [0, 1, 0]);
		var p = mat4.perspective(mat4.create(), (this.zoomLevel * this.normalFOV / 180) * Math.PI, this.viewW / this.viewH, 0.01, 10000.0);

		this.targetShadowPos = this.kart.pos;

		return { p: p, mv: mat, pos: null }
	}

	camFunc1(_scene: Scene, _came: nkm_section_CAME): CamView {
		var camPos = vec3.lerp([0, 0, 0],
			this.route[this.routePos].pos,
			this.route[(this.routePos + 1) % this.route.length].pos,
			this.routeProg
		);
		this.routeProg += this.routeSpeed;
		if (this.routeProg > 1) {
			this.routePos = (this.routePos + 1) % this.route.length;
			this.routeProg = 0;
			this.recalcRouteSpeed();
		}

		var lookAtPos = vec3.transformMat4([0, 0, 0], [0, 4, 0], this.kart.mat);

		vec3.scale(camPos, camPos, 1 / 1024);
		vec3.scale(lookAtPos, lookAtPos, 1 / 1024);

		var mat = mat4.lookAt(mat4.create(), camPos, lookAtPos, [0, 1, 0]);
		var p = mat4.perspective(mat4.create(), (this.zoomLevel * this.normalFOV / 180) * Math.PI, this.viewW / this.viewH, 0.01, 10000.0);

		this.targetShadowPos = this.kart.pos;

		return { p: p, mv: mat, pos: null }
	}

	dashCamFunc(_scene: Scene, came: nkm_section_CAME): CamView {
		var basis = this.kart.basis;
		var camPos = vec3.transformMat4([0, 0, 0], this.relPos, basis);
		var lookAtPos = vec3.transformMat4([0, 0, 0], [0, 0, 0], basis);

		vec3.scale(camPos, camPos, 1 / 1024);
		vec3.scale(lookAtPos, lookAtPos, 1 / 1024);

		var mat = mat4.lookAt(mat4.create(), camPos, lookAtPos, [0, 1, 0]);

		var off = mat4.create();
		mat4.translate(off, off, [-came.pos3[0] / 1024, came.pos3[1] / 1024, -came.pos3[2] / 1024]);
		mat4.mul(mat, off, mat);

		var kpos = vec3.clone(this.kart.pos);
		if (this.kart.drifting && !this.kart.driftLanded && this.kart.ylock > 0) kpos[1] -= this.kart.ylock;
		mat4.translate(mat, mat, vec3.scale([0, 0, 0], kpos, -1 / 1024));

		var p = mat4.perspective(mat4.create(), (this.zoomLevel * this.normalFOV / 180) * Math.PI, this.viewW / this.viewH, 0.01, 10000.0);

		this.targetShadowPos = this.kart.pos;

		return { p: p, mv: mat, pos: null }
	}


	getView(scene: Scene, width: number, height: number) {
		this.viewW = width;
		this.viewH = height;

		var cams = scene.nkm.sections["CAME"].entries;
		var tArea = this.getNearestArea(scene.nkm.sections["AREA"].entries, this.kart.pos)
		if (tArea.came != this.curCamNum) {
			//restart camera.
			this.curCamNum = tArea.came;
			this.curCam = cams[this.curCamNum] as nkm_section_CAME;
			this.zoomLevel = this.curCam.zoomStart;

			switch (this.curCam.camType) {
				case 0:
				case 2:
					this.initPointCam(scene, this.curCam);
					break;
				case 1:
					this.initCam1(scene, this.curCam);
					break;
				case 5:
					this.initDashCam(scene, this.curCam);
					break;
				default:
					break;
			}
		}

		if (this.zoomLevel < this.curCam.zoomMark1) {
			this.zoomLevel += this.curCam.zoomSpeedM1;
		} else if (this.zoomLevel > this.curCam.zoomMark2) {
			this.zoomLevel += this.curCam.zoomSpeedM2;
		} else {
			this.zoomLevel += this.curCam.zoomSpeed;
		}

		if (this.zoomLevel > this.curCam.zoomEnd) {
			this.zoomLevel = this.curCam.zoomEnd;
		}

		switch (this.curCam.camType) {
			case 0:
			case 2:
				this.view = this.pointCamFunc(scene, this.curCam);
				break;
			case 1:
				this.view = this.camFunc1(scene, this.curCam);
				break;
			case 5:
				this.view = this.dashCamFunc(scene, this.curCam);
				break;
			default:
				break;
		}

		this.view.pos = vec3.scale(
			[0, 0, 0],
			vec3.transformMat4(
				[0, 0, 0],
				[0, 0, 0],
				mat4.invert(mat4.create(), this.view.mv)
			),
			1024)
		return this.view;
	}

	recalcRouteSpeed() {
		this.routeSpeed = (this.curCam.routeSpeed / 100) / 60;
		//(curCam.routeSpeed/20)/vec3.dist(route[routePos].pos, route[(routePos+1)%route.length].pos);
	}

	getNearestArea(areas: string | any[], pos: vec3) {
		var smallestDist = Infinity;
		var closestArea = null;
		for (var i = 0; i < areas.length; i++) {
			var a = areas[i];
			var sub = vec3.sub([0, 0, 0], a.pos, pos);
			vec3.divide(sub, sub, a.dimensions);
			var dist = Math.sqrt(sub[0] * sub[0] + sub[1] * sub[1] + sub[2] * sub[2]);
			if (dist < smallestDist && a.came != 255) {
				smallestDist = dist;
				closestArea = a;
			}
		}
		return closestArea;
	}

	buildBasis(): number[] {
		//order y, x, z
		var basis = this.gramShmidt(
			this.camNormal,
			[Math.cos(this.camAngle), 0, Math.sin(this.camAngle)],
			[Math.sin(this.camAngle), 0, -Math.cos(this.camAngle)]
		);
		var temp = basis[0];
		basis[0] = basis[1];
		basis[1] = temp; //todo: cleanup
		return [
			basis[0][0], basis[0][1], basis[0][2], 0,
			basis[1][0], basis[1][1], basis[1][2], 0,
			basis[2][0], basis[2][1], basis[2][2], 0,
			0, 0, 0, 1
		]
	}

	gramShmidt(v1: vec3, v2: vec3, v3: vec3): [vec3, vec3, vec3] {
		var u1 = v1;
		var u2 = vec3.sub([0, 0, 0], v2, this.project(u1, v2));
		var u3 = vec3.sub([0, 0, 0], vec3.sub([0, 0, 0], v3, this.project(u1, v3)), this.project(u2, v3));
		return [
			vec3.normalize(u1, u1),
			vec3.normalize(u2, u2),
			vec3.normalize(u3, u3)
		]
	}

	project(u: vec3, v: vec3): vec3 {
		return vec3.scale([0, 0, 0], u, (vec3.dot(u, v) / vec3.dot(u, u)))
	}

	fixDir(dir: number): number {
		return this.posMod(dir, Math.PI * 2);
	}

	dirDiff(dir1: number, dir2: number): number {
		var d = this.fixDir(dir1 - dir2);
		return (d > Math.PI) ? (-2 * Math.PI + d) : d;
	}

	posMod(i: number, n: number): number {
		return (i % n + n) % n;
	}
}