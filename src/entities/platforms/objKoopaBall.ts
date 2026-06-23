import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjRoutePlatform } from "./objRoutePlatform";

export class ObjKoopaBall extends ObjRoutePlatform {
	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "koopaBall.nsbmd" }] };
	}
}
