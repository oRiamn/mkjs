//
// cameraIntro.js
//--------------------
// Runs the intro camera for a scene.
// by RHY3756547
//
// includes: main.js

import { Kart } from "../../entities/kart";
import { nkm_section_CAME, nkm_section_POIT } from "../../formats/nkm";

//
export class cameraIntro implements Camera {
	kart: Kart;
	targetShadowPos: vec3;
	mat: mat4;
	curCamNum: number;
	curCam: nkm_section_CAME;
	route: nkm_section_POIT[];
	routePos: number;
	routeSpeed: number;
	routeProg: number;
	duration: number;
	pointInterp: number;
	normalFOV: number;
	zoomLevel: number;
	viewW: number;
	viewH: number;
	view: CamView;

	constructor(kart: Kart) {
		this.kart = kart;
		this.targetShadowPos = [0, 0, 0]
		this.mat = mat4.create();
		this.curCamNum = -1;
		this.curCam = null;
		this.route = null;
		this.routePos = 0;
		this.routeSpeed = 0;
		this.routeProg = 0;
		this.duration = 0;
		this.pointInterp = 0;
		this.normalFOV = 70;
		this.zoomLevel = 1;
		this.viewW = 0;
		this.viewH = 0;
	}

	camFunc(_scene: Scene, _came: nkm_section_CAME) {
		var camPos = vec3.lerp([0, 0, 0], this.route[this.routePos].pos, this.route[(this.routePos + 1) % this.route.length].pos, this.routeProg);
		this.routeProg += this.routeSpeed;
		if (this.routeProg > 1) {
			this.routePos = (this.routePos + 1) % this.route.length;
			this.routeProg = 0;
			this.recalcRouteSpeed();
		}

		this.pointInterp += (this.curCam.pointSpeed / 100) / 60;
		if (this.pointInterp > 1) this.pointInterp = 1;

		var lookAtPos = vec3.lerp([0, 0, 0], this.curCam.pos2, this.curCam.pos3, this.pointInterp)

		vec3.scale(camPos, camPos, 1 / 1024);
		vec3.scale(lookAtPos, lookAtPos, 1 / 1024);

		var mat = mat4.lookAt(mat4.create(), camPos, lookAtPos, [0, 1, 0]);
		var p = mat4.perspective(mat4.create(), (this.zoomLevel * this.normalFOV / 180) * Math.PI, this.viewW / this.viewH, 0.01, 10000.0);

		this.targetShadowPos = lookAtPos;

		return { p: p, mv: mat, pos: vec3.scale([0, 0, 0], vec3.transformMat4([0, 0, 0], [0, 0, 0], mat4.invert(mat4.create(), mat)), 1024) }
	}

	initCam(scene: Scene, came: nkm_section_CAME) {
		var routes = scene.paths;
		this.route = routes[came.camRoute];
		this.routePos = 0;
		this.routeProg = 0;
		this.duration = came.duration;
		this.recalcRouteSpeed();

	}


	getView(scene: Scene, width: number, height: number) {
		if (this.curCam == null) {
			this.restartCam(scene);
		}
		this.viewW = width;
		this.viewH = height;

		if (this.zoomLevel < this.curCam.zoomMark1) this.zoomLevel += this.curCam.zoomSpeedM1;
		else if (this.zoomLevel > this.curCam.zoomMark2) this.zoomLevel += this.curCam.zoomSpeedM2;
		else this.zoomLevel += this.curCam.zoomSpeed;

		if (this.zoomLevel > this.curCam.zoomEnd) this.zoomLevel = this.curCam.zoomEnd;

		if (this.duration-- < 0) {
			var cams = scene.nkm.sections["CAME"].entries;
			if (this.curCam.nextCam != -1) {
				this.curCamNum = this.curCam.nextCam;
				this.curCam = cams[this.curCamNum];
				this.zoomLevel = this.curCam.zoomStart;

				this.initCam(scene, this.curCam)
			} else {
				this.restartCam(scene);
			}
		}


		this.view = this.camFunc(scene, this.curCam);
		return this.view;
	}

	restartCam(scene: Scene) {
		var cams = scene.nkm.sections["CAME"].entries;
		for (var i = 0; i < cams.length; i++) {
			if (cams[i].firstCam == 2) {
				this.curCamNum = i;
				this.curCam = cams[this.curCamNum];
				this.zoomLevel = this.curCam.zoomStart;

				this.initCam(scene, this.curCam)
			}
		}
	}

	recalcRouteSpeed() {
		this.routeSpeed = (this.curCam.routeSpeed / 100) / 60;
		//(curCam.routeSpeed/20)/vec3.dist(route[routePos].pos, route[(routePos+1)%route.length].pos);
	}

}