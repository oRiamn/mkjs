import { nkm_section_OBJI } from "../../formats/nkm";
import { getRandomInt } from "../../utils/getRandomInt";
import { ObjDecor } from "../objDecor";

export class TownMonte extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this.setDecorTexFrame(getRandomInt(0, 3));
	}

	requireRes() {
		return { mdl: [{ nsbmd: "TownMonte.nsbmd" }], other: [null, null, "TownMonte.nsbtp"] };
	}
}
