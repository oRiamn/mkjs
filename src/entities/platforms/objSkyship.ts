import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjRoutePlatform } from "./objRoutePlatform";

export class ObjSkyship extends ObjRoutePlatform {
	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "skyship.nsbmd" }] };
	}
}
