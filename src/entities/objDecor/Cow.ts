import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

export class Cow extends ObjDecor {
	private _variant: number;

	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._variant = Math.round(Math.random()); // cow orientation determinate by his frame
	}

	requireRes() {
		return { mdl: [{ nsbmd: "cow.nsbmd" }], other: [null, null, "cow.nsbtp"] };
	}

	update() {
		this.setDecorTexFrame(this._variant);
	}
}
