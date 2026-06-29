//
// decorations.js
//--------------------
// Provides decoration objects.
// by RHY3756547
//
// includes:
// render stuff idk
//

import { nkm_section_OBJI } from "../formats/nkm";
import { nsbca } from "../formats/nsbca";
import { nsbta } from "../formats/nsbta";
import { nsbtp } from "../formats/nsbtp";
import { nitroAnimator, nitroAnimator_matStack } from "../render/nitroAnimator";
import { nitroRender } from "../render/nitroRender";
export abstract class ObjDecor implements SceneEntityObject {
	static instanceIndex: number = 0;
	collidable!: boolean;
	private _res!: ProvidedRes;
	protected _staringAtCamera = true;
	private _obji: nkm_section_OBJI;
	private _mat: mat4;
	private _anim: nitroAnimator | null;
	private _animFrame: number;
	private _animMat: nitroAnimator_matStack | null;
	private _decorTexFrame: number | null = null;
	protected _yOffset = 0;
	protected _drawScale: vec3 = [1, 1, 1];
	pos: vec3;
	angle: vec3;
	scale: vec3;
	public intanceId: number;
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		this.intanceId = ++ObjDecor.instanceIndex;
		this._obji = obji;

		this._mat = mat4.create();
		this._anim = null;
		this._animFrame = 0;
		this._animMat = null;

		this.pos = vec3.clone(this._obji.pos);
		this.angle = vec3.clone(this._obji.angle);
		this.scale = vec3.clone(this._obji.scale);
	}

	protected _placementPos(): vec3 {
		return [this.pos[0], this.pos[1] + this._yOffset, this.pos[2]];
	}

	draw(view: mat4, pMatrix: mat4) {
		if (this._staringAtCamera) {
			nitroRender.setShadBias(0.001);
		}
		mat4.translate(this._mat, view, this._placementPos());

		if (this.angle[2] != 0) mat4.rotateZ(this._mat, this._mat, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] != 0) mat4.rotateY(this._mat, this._mat, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] != 0) mat4.rotateX(this._mat, this._mat, this.angle[0] * (Math.PI / 180));

		mat4.scale(this._mat, this._mat, vec3.scale([0, 0, 0], vec3.mul(vec3.create(), this.scale, this._drawScale), 16));
		const animMat = this._animMat ?? undefined;
		for (let i = 0; i < this._res.mdl.length; i++) {
			if (this._decorTexFrame != null) {
				this._res.mdl[i].setFrame(this._decorTexFrame);
			}
			this._res.mdl[i].draw(this._mat, pMatrix, i === 0 ? animMat : undefined);
		}
		if (this._staringAtCamera) {
			nitroRender.resetShadOff();
		}
	}

	protected texAnimFrame(gameFrame: number): number {
		return gameFrame;
	}

	update(_scn?: Scene) {
		const texFrame = this.texAnimFrame(this._animFrame);
		for (let i = 0; i < this._res.mdl.length; i++) {
			this._res.mdl[i].setFrame(texFrame);
		}
		if (this._anim != null) {
			this._animMat = this._anim.setFrame(0, 0, this._animFrame);
		}
		this._animFrame++;
	}

	protected setDecorTexFrame(frame: number) {
		this._decorTexFrame = frame;
	}

	abstract requireRes(): { mdl: { nsbmd: string; nsbtx?: string }[]; other?: (string | null)[] };

	provideRes(r: ProvidedRes) {
		this._res = r; //...and gives them to us. :)

		if (this._staringAtCamera) {
			this.angle[1] = 0;
			for (let i = 0; i < r.mdl.length; i++) {
				const bmd = r.mdl[i].bmd;
				bmd.hasBillboards = true;
				const models = bmd.modelData.objectData;
				for (let j = 0; j < models.length; j++) {
					const objs = models[j].objects.objectData;
					for (let k = 0; k < objs.length; k++) {
						objs[k].billboardMode = 2;
					}
				}
			}
		}

		if (r.other != null) {
			if (r.other.length > 0 && r.other[0] != null) {
				const bta = <nsbta>r.other[0];
				this._res.mdl[0].loadTexAnim(bta);
			}
			if (r.other.length > 1 && r.other[1] != null) {
				const bca = <nsbca>r.other[1];
				this._anim = new nitroAnimator(r.mdl[0].bmd, bca);
			}
			if (r.other.length > 2 && r.other[2] != null) {
				const btp = <nsbtp>r.other[2];
				this._res.mdl[0].loadTexPAnim(btp);
			}
		}
	}
}
