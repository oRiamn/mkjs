import { ObjDecor } from "../objDecor";

export class Chandelier extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "chandelier.nsbmd" }], other: [null, "chandelier.nsbca"] };
	}
}
