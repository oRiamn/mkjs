import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

export class NsKiller extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "NsKiller1.nsbmd" }, { nsbmd: "NsKiller2.nsbmd" }, { nsbmd: "NsKiller2_s.nsbmd" }] };
	}
}
