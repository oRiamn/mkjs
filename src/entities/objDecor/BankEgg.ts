import { ObjDecor } from "../objDecor";

export class BankEgg extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "BankEgg1.nsbmd" }] };
	}
}
