//
// decorations.js
//--------------------
// Provides decoration objects.
// by RHY3756547
//
// includes:
// render stuff idk
//

import { mat4 } from "gl-matrix";
import { nkm_section_OBJI } from "../../formats/nkm";
import { nitroAnimator, nitroAnimator_matStack } from "../../render/nitroAnimator";
import { ObjDecor } from "../objDecor";
import { nitroRender } from "../../render/nitroRender";

export class BeachTree extends ObjDecor {
	collidable: boolean;
	_res: ProvidedRes;
	_forceBill: boolean;
	_obji: nkm_section_OBJI;
	_mat: mat4;
	_anim: nitroAnimator;
	_animFrame: number;
	_animMat: nitroAnimator_matStack;
	pos: vec3;
	angle: vec3;
	scale: vec3;
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._forceBill = false;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "BeachTree1.nsbmd" }] };
	}

}