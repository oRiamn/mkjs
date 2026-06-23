import { ObjDecor } from "../objDecor";

export class Pakkun extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "ob_pakkun_sf.nsbmd" }], other: [null, null, "ob_pakkun_sf.nsbtp"] };
	}
}
