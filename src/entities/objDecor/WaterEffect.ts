import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

/** Hyudoro ghost-house water surface effect (0x000f). ROM: water_efct.nsbmd (+ nsbca). */
export class WaterEffect extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
	}

	requireRes() {
		return { mdl: [{ nsbmd: "water_efct.nsbmd" }], other: [null, "water_efct.nsbca"] };
	}
}
