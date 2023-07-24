//
// trafficCar.js
//--------------------
// Provides multiple types of traffic. 
// by RHY3756547
//
// includes:
// render stuff idk
//

import { MKDS_COLTYPE } from "../engine/collisionTypes";
import { lsc } from "../engine/largeSphereCollider";
import { courseScene } from "../engine/scenes/courseScene";
import { nkm_section_OBJI, nkm_section_POIT } from "../formats/nkm";
import { nsbtp } from "../formats/nsbtp";
import { nitromodel_BoundingCollisionModel } from "../render/nitroModel";
import { Item } from "./item";

class NPCVehicle implements lsc_taget {
	obji: nkm_section_OBJI;
	scene: Scene;
	res: ProvidedRes;
	pos: vec3;
	scale: vec3;
	vel: vec3;
	route: nkm_section_POIT[];
	routeSpeed: number;
	unknown: number;
	routePos: number;
	variant: number;
	variant2: number;
	nodes: vec3[];
	nextNode: nkm_section_POIT;
	prevPos: vec3;
	elapsedTime: number;
	curNormal: vec3;
	curFloorNormal: vec3;
	floorNormal: vec3;
	collidable: boolean;
	colMode: number;
	colRad: number;
	colFrame: number;
	colRes: nitromodel_BoundingCollisionModel;
	dirVel: number;
	prevMat: mat4;
	curMat: mat4;
	colMat: mat4;
	constructor(obji: nkm_section_OBJI, scene: Scene) {

		this.obji = obji;
		this.scene = scene;

		this.res = undefined;

		this.pos = vec3.clone(this.obji.pos);
		//this.angle = vec3.clone(obji.angle);
		this.scale = vec3.clone(this.obji.scale);
		this.vel = vec3.create();

		this.route = this.scene.paths[this.obji.routeID];
		this.routeSpeed = 0.01;
		this.unknown = (this.obji.setting1 & 0xFFFF);
		this.routePos = (this.obji.setting1 >> 16); //(obji.setting1&0xFFFF)%t.route.length;
		this.variant = (this.obji.setting2 & 0xFFFF); //sets design for this car (from nsbtp)
		this.variant2 = (this.obji.setting2 >> 16); //0 or 1. unknown purpose

		this.routePos = (this.routePos + 1) % this.route.length;


		const t = this.routePos + this.route.length;

		this.nodes = [
			this.route[(t - 2) % this.route.length].pos,
			this.route[(t - 1) % this.route.length].pos,
			this.route[this.routePos].pos,
			this.route[(this.routePos + 1) % this.route.length].pos
		];

		this.nextNode = this.route[this.routePos];
		this.prevPos = this.pos;
		this.elapsedTime = 0;

		this.curNormal = [0, 1, 0];
		this.curFloorNormal = [0, 1, 0];
		this.floorNormal = [0, 1, 0];

		//collision stuff
		this.collidable = true;
		this.colMode = 0;
		this.colRad = 512;
		this.colFrame = 0;
		this.colRes = undefined;
		this.dirVel = 0;
		this.prevMat = undefined;
		this.curMat = undefined;
		this.colMat = mat4.create();
		this.prevMat = this.curMat;
	}

	moveWith(obj: Item){ //used for collidable objects that move.
		//the most general way to move something with an object is to multiply its position by the inverse mv matrix of that object, and then the new mv matrix.
		vec3.transformMat4(obj.pos, obj.pos, mat4.invert(mat4.create(), this.prevMat))
		vec3.transformMat4(obj.pos, obj.pos, this.curMat);
	}

	requireRes() { //scene asks what resources to load
		throw new Error("Not implemented");
	}

	setMat() {
		this.prevMat = this.curMat;
		var mat = mat4.create();
		mat4.translate(mat, mat, this.pos);

		mat4.scale(mat, mat, vec3.scale([0, 0, 0], this.scale, 16));

		mat4.mul(mat, mat, mat4.invert(mat4.create(), mat4.lookAt(mat4.create(), [0, 0, 0], this.curNormal, this.curFloorNormal)));
		mat4.scale(this.colMat, mat, [this.colRes.scale, this.colRes.scale, this.colRes.scale]);
		this.colFrame++;
		this.curMat = mat;
	}

	getCollision() {
		return { tris: this.colRes.dat, mat: this.colMat, frame: this.colFrame };
	}

	provideRes(r: ProvidedRes) {
		this.res = r; //...and gives them to us. :)
		if (r.other != null) {
			if (r.other.length > 0 && r.other[0] != null) {
				const btp = <nsbtp>r.other[0];
				this.res.mdl[0].loadTexPAnim(btp);
			}
		}
		this.colRes = this.res.mdl[0].getBoundingCollisionModel(0, 0);
		for (var i = 0; i < this.colRes.dat.length; i++) {
			this.colRes.dat[i].CollisionType = MKDS_COLTYPE.KNOCKBACK_DAMAGE << 8;
		}
	}

	update(scene: courseScene) {
		//simple behaviour, just follow the path! piece of cake.

		//recalculate our route speed using a target real world speed.
		var nextTime = this.elapsedTime + this.routeSpeed;
		for (var i = 0; i < ((this.elapsedTime == 0) ? 3 : 1); i++) {
			if (nextTime < 1) {
				var targSpeed = 2;
				var estimate = this._cubic3D(this.nodes, nextTime);
				var estDistance = vec3.dist(estimate, this.pos);
				this.routeSpeed *= targSpeed / estDistance; //correct
				if (this.routeSpeed > 0.2) this.routeSpeed = 0.2;
			}
		}
		if (this.routeSpeed <= 0) this.routeSpeed = 0.01;

		this.elapsedTime += this.routeSpeed;
		var i = this.elapsedTime;

		var newPos = this._cubic3D(this.nodes, i); //vec3.lerp([], t.prevPos, t.nextNode.pos, i);
		vec3.sub(this.vel, newPos, this.pos);
		this.pos = newPos;

		if (this.elapsedTime >= 1) {
			this.elapsedTime -= 1;

			this.routePos = (this.routePos + 1) % this.route.length;
			this.nextNode = this.route[this.routePos];
			this.nodes.splice(0, 1);
			this.nodes.push(this.route[(this.routePos + 1) % this.route.length].pos);
			this.routeSpeed = 0.25;
		}

		this.curNormal = vec3.sub([0, 0, 0], this.prevPos, this.pos)
		this.prevPos = vec3.clone(this.pos);
		vec3.normalize(this.curNormal, this.curNormal);
		if (isNaN(this.curNormal[0])) this.curNormal = [0, 0, 1];

		var spos = vec3.clone(this.pos);
		spos[1] += 32;
		var result = lsc.raycast(spos, [0, -100, 0], scene, 0.05, []);
		if (result != null) {
			this.floorNormal = result.normal;
		} else {
			this.floorNormal = [0, 1, 0];
		}

		var rate = 0.025;
		this.curFloorNormal[0] += (this.floorNormal[0] - this.curFloorNormal[0]) * rate;
		this.curFloorNormal[1] += (this.floorNormal[1] - this.curFloorNormal[1]) * rate;
		this.curFloorNormal[2] += (this.floorNormal[2] - this.curFloorNormal[2]) * rate;
		vec3.normalize(this.curFloorNormal, this.curFloorNormal);
		this.setMat();
	}

	draw(view: mat4, pMatrix: mat4) {
		var mat = mat4.translate(mat4.create(), view, this.pos);

		mat4.scale(mat, mat, vec3.scale([0, 0, 0], this.scale, 16));

		mat4.mul(mat, mat, mat4.invert(mat4.create(), mat4.lookAt(mat4.create(), [0, 0, 0], this.curNormal, this.curFloorNormal)));
		this.res.mdl[0].setFrame(this.variant);
		this.res.mdl[0].draw(mat, pMatrix);
	}

	//end collision stuff

	_cubic1D(y0: number, y1: number, y2: number, y3: number, i: number) {
		var a0, a1, a2, a3, i2;

		i2 = i * i;
		a0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
		a1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
		a2 = -0.5 * y0 + 0.5 * y2;
		a3 = y1;

		return (a0 * i * i2 + a1 * i2 + a2 * i + a3);
	}

	_cubic3D(points: vec3[], i: number): vec3 { //note: i is 0-1 between point 1 and 2. (0 and 3 are used to better define the curve)
		var p0 = points[0];
		var p1 = points[1];
		var p2 = points[2];
		var p3 = points[3];
		return [
			this._cubic1D(p0[0], p1[0], p2[0], p3[0], i),
			this._cubic1D(p0[1], p1[1], p2[1], p3[1], i),
			this._cubic1D(p0[2], p1[2], p2[2], p3[2], i)
		];
	}
}

export class ObjTruck extends NPCVehicle implements SceneEntityObject {
	requireRes() { //scene asks what resources to load
		return { mdl: [{ nsbmd: "car_a.nsbmd" }], other: ["car_a.nsbtp"] }; //one model, car
	}
};

export class ObjCar extends NPCVehicle implements SceneEntityObject {
	requireRes() { //scene asks what resources to load
		return { mdl: [{ nsbmd: "truck_a.nsbmd" }], other: ["truck_a.nsbtp"] }; //one model, truck
	}
};

export class ObjBus extends NPCVehicle implements SceneEntityObject {
	requireRes() { //scene asks what resources to load
		return { mdl: [{ nsbmd: "bus_a.nsbmd" }] }; //one model, bus
	}
};