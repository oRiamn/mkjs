import { ObjDecor } from "../objDecor";

export class Psea extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "Psea.nsbmd" }] };
	}
}
