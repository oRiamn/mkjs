import { ObjDecor } from "../objDecor";

export class Pukupuku extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "pukupuku.nsbmd" }] };
	}
}
