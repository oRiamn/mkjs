import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjRoutePlatform } from "./objRoutePlatform";

/** MOBJ 0x00D2 — item roulette platform (model dram.nsbmd on pinball_course / donkey_course). */
export class ObjRoulette extends ObjRoutePlatform {
	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		if (obji.setting3 > 0) {
			this.statDur = obji.setting3;
		}
	}

	requireRes() {
		return { mdl: [{ nsbmd: "dram.nsbmd" }] };
	}
}
