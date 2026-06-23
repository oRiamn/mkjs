import { ObjDecor } from "../objDecor";

export class Basabasa extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "basabasa.nsbmd" }], other: [null, null, "basabasa.nsbtp"] };
	}
}
