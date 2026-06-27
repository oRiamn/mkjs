import { nkm_section_OBJI } from "../../formats/nkm";
import { nsbca } from "../../formats/nsbca";
import { nitroAnimator, nitroAnimator_matStack } from "../../render/nitroAnimator";
import { Item } from "../item";

type ObjBridgeCollision = {
	dat: lsc_collision_triangle[];
	scale: number;
};

export class ObjBridge implements SceneEntityObject, lsc_taget {
	obji: nkm_section_OBJI;
	private _res: ProvidedRes;
	collidable: boolean;
	colMode: number;
	colRad: number;
	pos: vec3;
	angle: vec3;
	scale: vec3;
	largerUpAngle: number;
	upDuration: number;
	statDuration: number;
	downDuration: number;
	upAngle: number;
	unknown: number;
	colFrame: number;
	private _genCol: ObjBridgeCollision;
	private _prevMat: mat4;
	private _curMat: mat4;
	private _colMat: mat4;
	private _anim: nitroAnimator;
	private _animMat: nitroAnimator_matStack;
	private _frame: number;
	private _mode: number;
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		this.obji = obji;
		this._res = undefined!;

		this.collidable = true;
		this.colMode = 0;
		this.colRad = 512;

		this.pos = vec3.clone(this.obji.pos);
		this.angle = vec3.clone(this.obji.angle);
		this.scale = vec3.clone(this.obji.scale);

		this.largerUpAngle = this.obji.setting1 & 0xffff;
		this.upDuration = this.obji.setting1 >> 16;
		this.statDuration = this.obji.setting2 & 0xffff;
		this.downDuration = this.obji.setting2 >> 16;
		this.upAngle = this.obji.setting3 & 0xffff;
		this.unknown = this.obji.setting4 >> 16; //10001

		this.colFrame = 0;
		this._genCol = undefined!;

		this._prevMat = undefined!;
		this._curMat = undefined!;
		this._colMat = mat4.create();

		this._anim = undefined!;
		this._animMat = undefined!;

		this._frame = 0;
		this._mode = 0; //going up, stationary, going down, stationary
	}

	private _setMat() {
		this._prevMat = this._curMat;
		let mat = mat4.create();
		mat4.translate(mat, mat, this.pos);

		if (this.angle[2] != 0) mat4.rotateZ(mat, mat, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] != 0) mat4.rotateY(mat, mat, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] != 0) mat4.rotateX(mat, mat, this.angle[0] * (Math.PI / 180));

		mat4.scale(mat, mat, vec3.scale([0, 0, 0], this.scale, 16));
		mat4.scale(this._colMat, mat, [this._genCol.scale, this._genCol.scale, this._genCol.scale]);
		this.colFrame++;
		this._curMat = mat;
	}

	update(_scene: Scene) {
		let angle = 0;
		this._frame++;
		switch (this._mode) {
			case 0: {
				const p = this._frame / this.upDuration;
				angle = (0.5 - Math.cos(p * Math.PI) / 2) * this.largerUpAngle;
				if (this._frame >= this.upDuration) {
					this._mode = 1;
					this._frame = 0;
				}
				break;
			}
			case 1:
			case 3:
				angle = this._mode == 1 ? this.largerUpAngle : 0;
				if (this._frame >= this.statDuration) {
					this._mode = (this._mode + 1) % 4;
					this._frame = 0;
				}
				break;
			case 2: {
				const p = 1 - this._frame / this.downDuration;
				angle = (0.5 - Math.cos(p * Math.PI) / 2) * this.largerUpAngle;
				if (this._frame >= this.downDuration) {
					this._mode = 3;
					this._frame = 0;
				}
				break;
			}
		}

		this.angle[0] = -angle;
		this._animMat = this._anim.setFrame(0, 0, angle * 1.5);
		this._setMat();
	}

	draw(view: mat4, pMatrix: mat4) {
		let mat = mat4.create();
		mat4.mul(mat, view, this._curMat);

		this._res.mdl[0].draw(mat, pMatrix, this._animMat);
	}

	requireRes() {
		//scene asks what resources to load
		return { mdl: [{ nsbmd: "bridge.nsbmd" }], other: [null, "bridge.nsbca"] };
	}

	provideRes(r: ProvidedRes) {
		this._res = r; //...and gives them to us. :)
		let inf = this._res.mdl[0].getCollisionModel(0, 1, 7 << 8); //dash
		let inf2 = this._res.mdl[0].getCollisionModel(0, 0, 0); //regular

		const bca = <nsbca>r.other[1];
		const bmd = r.mdl[0].bmd;

		this._anim = new nitroAnimator(bmd, bca);

		this._genCol = {
			dat: JSON.parse(JSON.stringify(inf.dat.concat(inf2.dat))) as lsc_collision_triangle[],
			scale: inf.scale,
		};
	}

	getCollision() {
		return { tris: this._genCol.dat, mat: this._colMat, frame: this.colFrame };
	}

	moveWith(obj: Item) {
		//used for collidable objects that move.
		//the most general way to move something with an object is to multiply its position by the inverse mv matrix of that object, and then the new mv matrix.
		vec3.transformMat4(obj.pos, obj.pos, mat4.invert(mat4.create(), this._prevMat));
		vec3.transformMat4(obj.pos, obj.pos, this._curMat);
	}
}
