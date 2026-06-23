import { ObjDecor } from "../objDecor";

export class TownMonte extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "TownMonte.nsbmd" }], other: [null, null, "TownMonte.nsbtp"] };
	}
}
