import { TileFlattener } from "../engine/2d/tileFlattener";
import { Kart } from "../entities/kart";
import { ncer } from "../formats/2d/ncer";
import { ncgr } from "../formats/2d/ncgr";
import { nclr } from "../formats/2d/nclr";
import { nitroRender } from "../render/nitroRender";

export class PlacementUI implements SceneEntity {
	transparent: boolean;
	scene: Scene;
	kart: Kart;
	zoom: number;
	pos: { x: number; y: number; };
	lastWidth: number;
	ncgr: ncgr;
	nclr: nclr;
	ncer: ncer;
	flattener: TileFlattener;
	place: number;
	animFrame: number;
	constructor(scene: Scene, kart: Kart) {
		this.scene = scene;
		this.kart = kart;
		this.transparent = false;

		this.zoom = 1;
		this.pos = {
			x: 10,
			y: 0
		}

		this.buildOrtho(nitroRender.getViewWidth(), nitroRender.getViewHeight());
		this.lastWidth = 0;
		
		var ncgrFile = this.scene.gameRes.RaceLoc.getFile("race_m_o.NCGR");
		var nclrFile = this.scene.gameRes.Race.getFile("race_m_o.NCLR");
		var ncerFile = this.scene.gameRes.Race.getFile('race_m.NCER');

		this.ncgr = new ncgr(ncgrFile);
		this.nclr = new nclr(nclrFile);
		this.ncer = new ncer(ncerFile);
		
		this.flattener = new TileFlattener(this.nclr, this.ncgr, this.ncer);
		this.place = this.kart.placement;
	}

	buildOrtho(width: number, height: number) {
		this.lastWidth = width;
		this.pos.y = height -  50;
	}

	draw() {
		if (nitroRender.flagShadow || this.animFrame < 0) return;
		var width = nitroRender.getViewWidth();
		if (width != this.lastWidth) {
			this.buildOrtho(width, nitroRender.getViewHeight());
		}
		nitroRender.pauseShadowMode();
		this.flattener.draw(this.pos.x, this.pos.y, this.zoom)
		nitroRender.unpauseShadowMode();
	}

	update() {
		let place = this.kart.placement < 8 ? this.kart.placement : 8;
		if (place != this.place) {
			this.place = place;
			this.flattener.loadTextue(this.place - 1);
		}
	}
}