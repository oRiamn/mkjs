import { ObjDecor } from "../objDecor";

export class Pylon01 extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "pylon01.nsbmd" }] };
	}
}
