import { ObjDecor } from "../objDecor";

export class Bubble extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "mkd_ef_bubble.nsbmd" }] };
	}
}
