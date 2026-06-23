import { nkm_section_OBJI } from "../../formats/nkm";
import { nsbtp } from "../../formats/nsbtp";
import { ObjRoutePlatform } from "./objRoutePlatform";

export class ObjRouteBasabasa extends ObjRoutePlatform {
	private _animFrame = 0;

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
	}

	update(scene: Scene) {
		super.update(scene);
		this._animFrame++;
		this._res.mdl[0].setFrame(this._animFrame);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "basabasa.nsbmd" }], other: [null, null, "basabasa.nsbtp"] };
	}

	provideRes(r: ProvidedRes) {
		super.provideRes(r);
		if (r.other != null && r.other.length > 2 && r.other[2] != null) {
			this._res.mdl[0].loadTexPAnim(<nsbtp>r.other[2]);
		}
	}
}
