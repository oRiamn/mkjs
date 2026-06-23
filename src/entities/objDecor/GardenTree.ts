import { ObjDecor } from "../objDecor";

export class GardenTree extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "GardenTree1.nsbmd" }] };
	}
}
