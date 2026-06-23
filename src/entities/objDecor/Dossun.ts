import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

export class Dossun extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "dossun.nsbmd" }, { nsbmd: "dossun_shadow.nsbmd" }] };
	}
}
