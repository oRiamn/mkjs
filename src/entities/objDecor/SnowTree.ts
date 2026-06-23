import { ObjDecor } from "../objDecor";

export class SnowTree extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "Snow_Tree1.nsbmd" }] };
	}
}
