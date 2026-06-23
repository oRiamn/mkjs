import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

export class MoveTree extends ObjDecor {
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "move_tree.nsbmd" }], other: [null, "move_tree.nsbca"] };
	}
}
