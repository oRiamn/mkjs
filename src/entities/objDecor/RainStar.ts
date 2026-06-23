import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

export class RainStar extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "RainStar.nsbmd" }], other: ["RainStar.nsbta"] };
	}
}
