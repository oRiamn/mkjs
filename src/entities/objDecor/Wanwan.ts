import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

export class Wanwan extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
	}

	requireRes() {
		return {
			mdl: [
				{ nsbmd: "wanwan.nsbmd" },
				{ nsbmd: "wanwan_chain.nsbmd" },
				{ nsbmd: "wanwan_kui.nsbmd" },
				{ nsbmd: "rock_shadow.nsbmd" },
			],
		};
	}
}
