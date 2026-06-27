import { TileFlattener } from "../engine/2d/tileFlattener";
import { Kart } from "../entities/kart";
import { ncer } from "../formats/2d/ncer";
import { ncgr } from "../formats/2d/ncgr";
import { nclr } from "../formats/2d/nclr";
import { nitroRender } from "../render/nitroRender";
import { getUiScale, uiPx } from "./uiScale";

export class PlacementUI implements SceneEntity {
	transparent: boolean;
	scene: Scene;
	kart: Kart;
	zoom: number;
	pos: { x: number; y: number };
	lastViewWidth: number;
	lastViewHeight: number;
	ncgr: ncgr;
	nclr: nclr;
	ncer: ncer;
	flattener: TileFlattener;
	place: number;
	animFrame!: number;
	constructor(scene: Scene, kart: Kart) {
		this.scene = scene;
		this.kart = kart;
		this.transparent = false;

		this.zoom = 1;
		this.pos = {
			x: 10,
			y: 0,
		};

		this.lastViewWidth = 0;
		this.lastViewHeight = 0;

		const ncgrFile = this.scene.gameRes.RaceLoc.getFile("race_m_o.NCGR")!;
		const nclrFile = this.scene.gameRes.Race.getFile("race_m_o.NCLR")!;
		const ncerFile = this.scene.gameRes.Race.getFile("race_m.NCER")!;

		this.ncgr = new ncgr(ncgrFile);
		this.nclr = new nclr(nclrFile);
		this.ncer = new ncer(ncerFile);

		this.flattener = new TileFlattener(this.nclr, this.ncgr, this.ncer, true);
		this.updateLayout(nitroRender.getViewWidth(), nitroRender.getViewHeight());
		this.place = this.kart.placement;
	}

	private updateLayout(width: number, height: number) {
		this.lastViewWidth = width;
		this.lastViewHeight = height;
		const scale = getUiScale(width, height);
		this.zoom = scale;
		this.pos.x = uiPx(10, scale);
		this.pos.y = height - uiPx(50, scale);
	}

	draw() {
		if (nitroRender.flagShadow || this.animFrame < 0) return;
		const width = nitroRender.getViewWidth();
		const height = nitroRender.getViewHeight();
		if (width !== this.lastViewWidth || height !== this.lastViewHeight) {
			this.updateLayout(width, height);
		}
		nitroRender.pauseShadowMode();
		this.flattener.draw(this.pos.x, this.pos.y, this.zoom);
		nitroRender.unpauseShadowMode();
	}

	update() {
		const place = this.kart.placement < 8 ? this.kart.placement : 8;
		if (place != this.place) {
			this.place = place;
			this.flattener.loadTextue(this.place - 1);
		}
	}
}
