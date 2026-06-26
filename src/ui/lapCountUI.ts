import { TileFlattener } from "../engine/2d/tileFlattener";
import { MKDSCONST } from "../engine/mkdsConst";
import { Kart } from "../entities/kart";
import { ncer } from "../formats/2d/ncer";
import { ncgr } from "../formats/2d/ncgr";
import { nclr } from "../formats/2d/nclr";
import { nitroRender } from "../render/nitroRender";
import { getUiScale, uiPx } from "./uiScale";
export class LapCountUI implements SceneEntity {
	transparent: boolean;
	scene: Scene;
	kart: Kart;
	zoom: number;
	uiScale: number;
	pos: { x: number; y: number };
	lastViewWidth: number;
	lastViewHeight: number;
	flattenerCurrentLap: TileFlattener;
	flattenerLapLabel: TileFlattener;
	lap: number;
	animFrame: number;
	flattenerLapNumber: TileFlattener;
	constructor(scene: Scene, kart: Kart) {
		this.scene = scene;
		this.kart = kart;
		this.transparent = false;
		this.animFrame = 0;

		this.zoom = 1;
		this.uiScale = 1;
		this.pos = {
			x: 10,
			y: 10,
		};

		this.lastViewWidth = 0;
		this.lastViewHeight = 0;

		const ncgrFile = this.scene.gameRes.RaceLoc.getFile("race_m_o.NCGR")!;
		const nclrFile = this.scene.gameRes.Race.getFile("race_m_o.NCLR")!;
		const ncerFile = this.scene.gameRes.Race.getFile("race_m.NCER")!;

		const thencgr = new ncgr(ncgrFile);
		const thenclr = new nclr(nclrFile);
		const thencer = new ncer(ncerFile);

		this.flattenerCurrentLap = new TileFlattener(thenclr, thencgr, thencer, true);
		this.flattenerCurrentLap.pos[2] = 0.1;
		this.flattenerLapLabel = new TileFlattener(thenclr, thencgr, thencer, true);
		this.flattenerLapLabel.pos[2] = 0.2;
		this.flattenerLapNumber = new TileFlattener(thenclr, thencgr, thencer, true);
		this.flattenerLapNumber.pos[2] = 0.3;

		this.lap = 1;

		this.updateLayout(nitroRender.getViewWidth(), nitroRender.getViewHeight());

		this.flattenerLapLabel.loadTextue(32);
		this.flattenerCurrentLap.loadTextue(32 + this.lap);
		this.flattenerLapNumber.loadTextue(MKDSCONST.MAX_LAP === 3 ? 38 : 39);
	}

	private updateLayout(width: number, height: number) {
		this.lastViewWidth = width;
		this.lastViewHeight = height;
		this.uiScale = getUiScale(width, height);
		this.zoom = Math.round(this.uiScale);
		this.pos.x = width - uiPx(30, this.uiScale);
		this.pos.y = uiPx(10, this.uiScale);
	}

	draw() {
		if (nitroRender.flagShadow || this.animFrame < 0) return;
		const width = nitroRender.getViewWidth();
		const height = nitroRender.getViewHeight();
		if (width !== this.lastViewWidth || height !== this.lastViewHeight) {
			this.updateLayout(width, height);
		}
		nitroRender.pauseShadowMode();

		this.flattenerCurrentLap.draw(this.pos.x - uiPx(26, this.uiScale), this.pos.y, this.zoom);
		this.flattenerLapNumber.draw(this.pos.x - uiPx(15, this.uiScale), this.pos.y, this.zoom);
		this.flattenerLapLabel.draw(this.pos.x - uiPx(90, this.uiScale), this.pos.y, this.zoom);

		nitroRender.unpauseShadowMode();
	}

	update() {
		let currentlap = this.kart.lapNumber < MKDSCONST.MAX_LAP ? this.kart.lapNumber : MKDSCONST.MAX_LAP;
		if (currentlap != this.lap) {
			this.lap = currentlap;
			this.flattenerCurrentLap.loadTextue(32 + this.lap);
		}
	}
}
