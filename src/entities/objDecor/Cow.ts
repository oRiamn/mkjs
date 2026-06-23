import { nkm_section_OBJI } from "../../formats/nkm";
import { getRandomInt } from "../../utils/getRandomInt";
import { ObjDecor } from "../objDecor";

export class Cow extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this.setDecorTexFrame(getRandomInt(0, 1)); // cow orientation determinate by his frame
	}

	requireRes() {
		return { mdl: [{ nsbmd: "cow.nsbmd" }], other: [null, null, "cow.nsbtp"] };
	}
}
