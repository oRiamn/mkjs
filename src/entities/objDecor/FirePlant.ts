import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

export class FirePlant extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._staringAtCamera = false;
	}

	requireRes() {
		return {
			mdl: [{ nsbmd: "PakkunMouth.nsbmd" }, { nsbmd: "PakkunBody.nsbmd" }, { nsbmd: "FireBall.nsbmd" }],
			other: [null, "PakkunMouth.nsbca"],
		};
	}
}
