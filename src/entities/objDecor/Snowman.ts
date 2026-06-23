import { ObjDecor } from "../objDecor";

export class Snowman extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "sman_top.nsbmd" }, { nsbmd: "sman_bottom.nsbmd" }] };
	}
}
