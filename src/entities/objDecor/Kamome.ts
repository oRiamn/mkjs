import { ObjDecor } from "../objDecor";

export class Kamome extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "kamome.nsbmd" }], other: [null, null, "kamome.nsbtp"] };
	}
}
