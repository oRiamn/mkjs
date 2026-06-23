import { ObjDecor } from "../objDecor";

export class MarioTree extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "MarioTree3.nsbmd" }] };
	}
}
