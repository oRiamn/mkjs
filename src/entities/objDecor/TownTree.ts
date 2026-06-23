import { ObjDecor } from "../objDecor";

export class TownTree extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "TownTree1.nsbmd" }] };
	}
}
