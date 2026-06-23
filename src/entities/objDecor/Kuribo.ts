import { ObjDecor } from "../objDecor";

export class Kuribo extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "kuribo.nsbmd" }], other: [null, null, "kuribo.nsbtp"] };
	}
}
