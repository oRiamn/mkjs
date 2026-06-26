import { nkm_section_OBJI } from "../../formats/nkm";
import { nitroModel } from "../../render/nitroModel";
import { nitroRender } from "../../render/nitroRender";
import { getRandomInt } from "../../utils/getRandomInt";
import { ObjDecor } from "../objDecor";

/** Sway cycle speed (@ 60 fps). */
const TOWN_MONTE_SWAY_SPEED = 0.14;
/** Screen-space horizontal hop (world units). */
const TOWN_MONTE_SWAY_AMP = 2.2;
/** Small vertical bounce at each side (world units). */
const TOWN_MONTE_HOP_AMP = 1.4;
/** Roll lean toward the sway direction (degrees). */
const TOWN_MONTE_LEAN_AMP = 9;
/** Width/depth stretch and height squash at sway extremes. */
const TOWN_MONTE_STRETCH = 0.07;
/** Landing squash at the centre of the left-right cycle. */
const TOWN_MONTE_BOUNCE_SQUASH = 0.1;
/** Brief dip when landing at centre (world units). */
const TOWN_MONTE_BOUNCE_DIP = 1;

/** Town Monty Mole (0x0157). Billboard decor with texture variants (nsbtp). */
export class TownMonte extends ObjDecor {
	private _mdl: nitroModel[] = [];
	private _drawMat = mat4.create();
	private _frame = 0;
	private _phase: number;
	private _texFrame: number;
	private _swayX = 0;
	private _leanZ = 0;

	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		super(obji, _scene);
		this._texFrame = getRandomInt(0, 3);
		this.setDecorTexFrame(this._texFrame);
		this._phase = ((obji.pos[0] + obji.pos[2]) * 0.31) % (Math.PI * 2);
	}

	requireRes() {
		return { mdl: [{ nsbmd: "TownMonte.nsbmd" }], other: [null, null, "TownMonte.nsbtp"] };
	}

	provideRes(r: ProvidedRes) {
		super.provideRes(r);
		this._mdl = r.mdl;
	}

	update(_scn?: Scene) {
		const t = this._frame * TOWN_MONTE_SWAY_SPEED + this._phase;
		const sway = Math.sin(t);
		const stretch = Math.abs(sway);
		const bounce = Math.abs(Math.cos(t));

		this._swayX = sway * TOWN_MONTE_SWAY_AMP;
		this._leanZ = sway * TOWN_MONTE_LEAN_AMP;
		this._yOffset = stretch * TOWN_MONTE_HOP_AMP - bounce * TOWN_MONTE_BOUNCE_DIP;
		this._drawScale = [
			1 + stretch * TOWN_MONTE_STRETCH + bounce * TOWN_MONTE_BOUNCE_SQUASH,
			1 - stretch * TOWN_MONTE_STRETCH - bounce * TOWN_MONTE_BOUNCE_SQUASH,
			1 + stretch * TOWN_MONTE_STRETCH + bounce * TOWN_MONTE_BOUNCE_SQUASH,
		];

		this._frame++;
		super.update(_scn);
	}

	draw(view: mat4, pMatrix: mat4) {
		nitroRender.setShadBias(0.001);

		const p = this._placementPos();
		const bm = nitroRender.yBillboardMat;
		const drawPos: vec3 = [p[0] + bm[0] * this._swayX, p[1] + bm[1] * this._swayX, p[2] + bm[2] * this._swayX];

		mat4.translate(this._drawMat, view, drawPos);
		if (this._leanZ !== 0) {
			mat4.rotateZ(this._drawMat, this._drawMat, this._leanZ * (Math.PI / 180));
		}
		mat4.scale(this._drawMat, this._drawMat, vec3.scale(vec3.create(), vec3.mul(vec3.create(), this.scale, this._drawScale), 16));

		for (let i = 0; i < this._mdl.length; i++) {
			this._mdl[i].setFrame(this._texFrame);
			this._mdl[i].draw(this._drawMat, pMatrix);
		}

		nitroRender.resetShadOff();
	}
}
