import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

/** Stadium fire hazard cluster (0x01af). ROM: fireball2.nsbmd on stadium_course. */
export class Fireballs extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "fireball2.nsbmd" }] };
	}
}
