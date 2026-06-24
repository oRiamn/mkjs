import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

/** Wooden crate (0x0067). Uses woodbox1.nsbmd on airship_course / town_course. */
export class Woodbox extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "woodbox1.nsbmd" }] };
	}
}
