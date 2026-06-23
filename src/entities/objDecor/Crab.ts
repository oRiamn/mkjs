import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

export class Crab extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
	}

	update() {
		this.setDecorTexFrame(0);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "crab.nsbmd" }, { nsbmd: "crab_hand.nsbmd" }], other: [null, null, "crab.nsbtp"] };
	}
}
