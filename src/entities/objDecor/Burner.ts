import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { ObjDecor } from "../objDecor";

/** UV scroll rate for mkd_ef_burner.nsbta (game runs at 60 fps). */
const BURNER_TEX_FPS = 20;
const BURNER_TEX_TICKS_PER_FRAME = 60 / BURNER_TEX_FPS;
/** World units per frame along PATH/POIT (@ 60 fps). */
const BURNER_ROUTE_SPEED = 1;

/** Burner flame (0x01a4). Follows the linked PATH/POIT route per instance. */
export class Burner extends ObjDecor {
	private _route: nkm_section_POIT[];
	private _loopPath: boolean;
	private _segFrom = 0;
	private _segTo = 1;
	private _segT = 0;
	private _dir = 1;

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this._staringAtCamera = true;
		this._route = obji.routeID !== 65535 ? scene.getRoute(obji.routeID) : []
		const pathMeta = scene.nkm.sections.PATH.entries[obji.routeID];
		this._loopPath = pathMeta != null && pathMeta.loop !== 0;

		if (this._route.length > 0) {
			vec3.copy(this.pos, this._route[0].pos);
		}
		if (this._route.length < 2) {
			this._segTo = 0;
		}
	}

	protected texAnimFrame(gameFrame: number): number {
		return Math.floor(gameFrame / BURNER_TEX_TICKS_PER_FRAME);
	}

	update(scn?: Scene) {
		if (this._route.length >= 2) {
			this._stepRoute();
		}
		super.update(scn);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "mkd_ef_burner.nsbmd" }], other: ["mkd_ef_burner.nsbta", null] };
	}

	private _stepRoute() {
		const from = this._route[this._segFrom].pos;
		const to = this._route[this._segTo].pos;
		const dist = vec3.distance(from, to);
		const step = dist > 0 ? BURNER_ROUTE_SPEED / dist : 1;

		this._segT += step;
		if (this._segT >= 1) {
			this._segT = 0;
			vec3.copy(this.pos, to);
			this._segFrom = this._segTo;
			this._advanceSegment();
		} else {
			this.pos[0] = from[0] + (to[0] - from[0]) * this._segT;
			this.pos[1] = from[1] + (to[1] - from[1]) * this._segT;
			this.pos[2] = from[2] + (to[2] - from[2]) * this._segT;
		}
	}

	private _advanceSegment() {
		if (this._loopPath) {
			this._segTo = (this._segTo + 1) % this._route.length;
			return;
		}
		let next = this._segTo + this._dir;
		if (next >= this._route.length) {
			this._dir = -1;
			next = this._segTo - 1;
		} else if (next < 0) {
			this._dir = 1;
			next = this._segTo + 1;
		}
		this._segTo = next;
	}
}
