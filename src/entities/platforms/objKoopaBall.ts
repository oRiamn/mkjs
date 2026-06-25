import { nkm_section_OBJI } from "../../formats/nkm";
import { ObjRoutePlatform } from "./objRoutePlatform";

/** MOBJ 0x00CF — rolling Koopa shell platform on Tick-Tock Clock (uses the item shell model). */
export class ObjKoopaBall extends ObjRoutePlatform {
	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "Item/it_koura_g.nsbmd" }] };
	}
}
