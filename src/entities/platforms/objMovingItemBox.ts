import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { ItemBox } from "../itembox";

export class ObjMovingItemBox extends ItemBox {
	private _route: nkm_section_POIT[];
	private _routeSpeed: number;
	private _routePos: number;
	private _nextNode: nkm_section_POIT;
	private _prevPos: vec3;
	private _elapsedTime: number;
	private _routeMode: number;
	private _statDur: number;
	private _movVel: vec3;

	constructor(obji: nkm_section_OBJI, scene: Scene) {
		super(obji, scene);
		this._statDur = obji.setting1 & 0xffff;
		this._route = scene.getRoute(obji.routeID);
		this._routeSpeed = 1 / 6;
		this._routePos = 0;
		this._nextNode = this._route[this._routePos];
		this._prevPos = vec3.clone(this.pos);
		this._elapsedTime = 0;
		this._routeMode = 0;
		this._movVel = [0, 0, 0];
	}

	update(scene: Scene) {
		this._updateRoute();
		super.update(scene);
	}

	private _updateRoute() {
		if (this._routeMode == 0) {
			this._elapsedTime += this._routeSpeed;
			this._movVel = vec3.sub([0, 0, 0], this._nextNode.pos, this._prevPos);
			vec3.scale(this._movVel, this._movVel, this._routeSpeed / this._nextNode.duration);
			vec3.add(this.pos, this.pos, this._movVel);
			if (this._elapsedTime >= this._nextNode.duration) {
				this._elapsedTime = 0;
				this._prevPos = this._nextNode.pos;
				this._routePos = (this._routePos + 1) % this._route.length;
				this._nextNode = this._route[this._routePos];
				this._routeMode = 1;
			}
		} else {
			this._elapsedTime += 1;
			this._movVel = [0, 0, 0];
			if (this._elapsedTime > this._statDur) {
				this._routeMode = 0;
				this._elapsedTime = 0;
			}
		}
	}
}
