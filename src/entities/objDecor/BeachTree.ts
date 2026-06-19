//
// decorations.js
//--------------------
// Provides decoration objects.
// by RHY3756547
//
// includes:
// render stuff idk
//

import { nkm_section_OBJI } from "../../formats/nkm";
import { nitroAnimator, nitroAnimator_matStack } from "../../render/nitroAnimator";
import { ObjDecor } from "../objDecor";

export class BeachTree extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._forceBill = false;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "BeachTree1.nsbmd" }] };
	}
}
