import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

export class Kanoke extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "kanoke_64.nsbmd" }, { nsbmd: "basabasa.nsbmd" }], other: [null, "kanoke_64.nsbca"] };
	}
}
