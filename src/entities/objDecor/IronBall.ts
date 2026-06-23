import { ObjDecor } from "../objDecor";

export class IronBall extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "IronBall.nsbmd" }] };
	}
}
