import { ObjDecor } from "../objDecor";

export class Sanbo extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "sanbo_h.nsbmd" }, { nsbmd: "sanbo_b.nsbmd" }] };
	}
}
