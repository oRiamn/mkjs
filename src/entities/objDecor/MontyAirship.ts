import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

export class MontyAirship extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "poo.nsbmd" }, { nsbmd: "cover.nsbmd" }, { nsbmd: "hole.nsbmd" }], other: [null, null, "poo.nsbtp"] };
	}
}
