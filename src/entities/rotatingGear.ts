//
// rotatingGear.js
//--------------------
// Provides rotating gear objects for tick tock clock
// by RHY3756547
//
// includes:
// render stuff idk
//
import { nkm_section_OBJI } from "../formats/nkm";
import { nitromodel_collisionModel } from "../render/nitroModel";
import { Item } from "./item";

export class ObjGear implements SceneEntityObject, lsc_taget {
	_obji: nkm_section_OBJI;
	_res: ProvidedRes;
	collidable: boolean;
	colMode: number;
	colRad: number;
	pos: vec3;
	scale: vec3;
	speed: number;
	duration: number;
	rampDur: number;
	statDur: number;
	wB1: number;
	wB2: number;
	time: number;
	mode: number;
	angle: number;
	dir: boolean;
	colFrame: number;
	_colRes: nitromodel_collisionModel;
	_dirVel: number;
	_prevMat: mat4;
	_curMat: mat4;
	_colMat: mat4;
	constructor(obji: nkm_section_OBJI, scene: Scene) {
		console.log('rotatingGear')

		this._obji = obji;
		this._res = undefined;

		this.collidable = true;
		this.colMode = 0;
		this.colRad = 512;

		this.pos = vec3.clone(this._obji.pos);
		//this.angle = vec3.clone(obji.angle);
		this.scale = vec3.clone(this._obji.scale);

		this.speed = (this._obji.setting1 & 0xFFFF) / 8192;
		this.duration = this._obji.setting1 >> 16;
		this.rampDur = this._obji.setting2 & 0xFFFF;
		this.statDur = this._obji.setting2 >> 16;
		this.wB1 = this._obji.setting3 & 0xFFFF; //ONE of these flips direction, the other makes the gear use the black model. Not sure which is which, but for tick tock clock there is no need to get this right.
		this.wB2 = this._obji.setting3 >> 16;

		this.time = 0;
		this.mode = 0; //0=rampup, 1=normal, 2=rampdown, 3=stationary
		this.angle = 0;
		this.dir = (this.wB1 == 0)

		this.colFrame = 0;

		this._colRes = undefined;

		this._dirVel = 0;

		this._prevMat = undefined;
		this._curMat = undefined;
		this._colMat = mat4.create();
		this._prevMat = this._curMat;
	}

	_setMat() {
		this._prevMat = this._curMat;
		var mat = mat4.create();
		mat4.translate(mat, mat, this.pos);

		mat4.scale(mat, mat, vec3.scale([0, 0, 0], this.scale, 16));

		mat4.rotateY(mat, mat, this._obji.angle[1] * (Math.PI / 180));
		mat4.rotateX(mat, mat, this._obji.angle[0] * (Math.PI / 180));

		mat4.rotateY(mat, mat, this.angle);
		mat4.scale(this._colMat, mat, [this._colRes.scale, this._colRes.scale, this._colRes.scale]);
		this.colFrame++;
		this._curMat = mat;
	}

	update(_scene: Scene) {
		this.time++;
		switch (this.mode) {
			case 0:
				this._dirVel = this.speed * (this.time / this.rampDur) * ((this.dir) ? -1 : 1);
				if (this.time > this.rampDur) {
					this.time = 0; this.mode = 1;
				}
				break;
			case 1:
				this._dirVel = this.speed * ((this.dir) ? -1 : 1);
				if (this.time > this.duration) {
					this.time = 0; this.mode = 2;
				}
				break;
			case 2:
				this._dirVel = this.speed * (1 - this.time / this.rampDur) * ((this.dir) ? -1 : 1);
				if (this.time > this.rampDur) {
					this.time = 0; this.mode = 3; this.dir = !this.dir;
				}
				break;
			case 3:
				this._dirVel = 0;
				if (this.time > this.statDur) {
					this.time = 0; this.mode = 0;
				}
				break;
		}
		this.angle += this._dirVel;
		this._setMat();
	}

	draw(view: mat4, pMatrix: mat4) {
		var mat = mat4.translate(mat4.create(), view, this.pos);

		mat4.scale(mat, mat, vec3.scale([0, 0, 0], this.scale, 16));

		mat4.rotateY(mat, mat, this._obji.angle[1] * (Math.PI / 180));
		mat4.rotateX(mat, mat, this._obji.angle[0] * (Math.PI / 180));

		mat4.rotateY(mat, mat, this.angle);

		this._res.mdl[this.wB1].draw(mat, pMatrix);
	}

	requireRes() { //scene asks what resources to load
		switch (this._obji.ID) {
			case 0x00CB:
				return { mdl: [{ nsbmd: "gear_white.nsbmd" }, { nsbmd: "gear_black.nsbmd" }] };
			case 0x00CE:
				return { mdl: [{ nsbmd: "test_cylinder.nsbmd" }] };
			case 0x00D1:
				this.colRad = 4096;
				return { mdl: [{ nsbmd: "rotary_bridge.nsbmd" }] };
		}
	}

	_cloneKCL(kcl: nitromodel_collisionModel): nitromodel_collisionModel {
		return JSON.parse(JSON.stringify(kcl));
	}

	provideRes(r: ProvidedRes) {
		this._res = r; //...and gives them to us. :)
		this._colRes = this._cloneKCL(this._res.mdl[0].getCollisionModel(0, 0, 0));
	}

	getCollision() {
		return { tris: this._colRes.dat, mat: this._colMat, frame: this.colFrame };
	}

	moveWith(obj: Item){ //used for collidable objects that move.
		//the most general way to move something with an object is to multiply its position by the inverse mv matrix of that object, and then the new mv matrix.

		vec3.transformMat4(obj.pos, obj.pos, mat4.invert(mat4.create(), this._prevMat))
		vec3.transformMat4(obj.pos, obj.pos, this._curMat)
	}
}