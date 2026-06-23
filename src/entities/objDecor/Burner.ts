import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

export class Burner extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "mkd_ef_burner.nsbmd" }], other: ["mkd_ef_burner.nsbta", null] };
	}
}
