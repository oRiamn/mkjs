import { TileFlattener } from "../engine/2d/tileFlattener";
import { MKDSCONST } from "../engine/mkdsConst";
import { Kart } from "../entities/kart";
import { ncer } from "../formats/2d/ncer";
import { ncgr } from "../formats/2d/ncgr";
import { nclr } from "../formats/2d/nclr";
import { nitroRender } from "../render/nitroRender";

export class LapCountUI implements SceneEntity {
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
	flattener2: TileFlattener;
	lap: number;
	assets: { padding: number, texture: CustomWebGLTexture }[];
	animFrame: number;
	constructor(scene: Scene, kart: Kart) {
		this.scene = scene;
		this.kart = kart;
		this.transparent = false;

		this.zoom = 1.3;
		this.pos = {
			x: 10,
			y: 10
		}

		this.buildOrtho(nitroRender.getViewWidth(), nitroRender.getViewHeight());
		this.lastWidth = 0;

		var ncgrFile = this.scene.gameRes.RaceLoc.getFile("race_m_o.NCGR");
		var nclrFile = this.scene.gameRes.Race.getFile("race_m_o.NCLR");
		var ncerFile = this.scene.gameRes.Race.getFile('race_m.NCER')

		this.ncgr = new ncgr(ncgrFile);
		this.nclr = new nclr(nclrFile);
		this.ncer = new ncer(ncerFile);

		this.flattener = new TileFlattener(this.nclr, this.ncgr, this.ncer);
		this.flattener.pos[2] = 0.1
		this.flattener2 = new TileFlattener(this.nclr, this.ncgr, this.ncer);
		this.flattener2.pos[2] = 0.2
		this.lap = 0;

		this.assets = [];
		if (MKDSCONST.MAX_LAP === 3) {
			this.assets.push({ padding: 10, texture: this.flattener2.loadTextue(38) }); // lapnumber /3
		} else {
			this.assets.push({ padding: 10, texture: this.flattener2.loadTextue(39) }); // lapnumber /5
		}
		this.assets.push({ padding: 85, texture: this.flattener2.loadTextue(32) }); // lap label
	}

	buildOrtho(width: number, _height: number) {
		this.lastWidth = width;
		this.pos.x = width - 30;
	}

	draw() {
		if (nitroRender.flagShadow || this.animFrame < 0) return;
		var width = nitroRender.getViewWidth();
		if (width != this.lastWidth) {
			this.buildOrtho(width, nitroRender.getViewHeight());
		}
		nitroRender.pauseShadowMode();

		this.flattener.draw(this.pos.x - 20, this.pos.y, 1);
		for (let i = 0; i < this.assets.length; i++) {
			this.flattener2.drawTexture(
				this.assets[i].texture,
				this.assets[i].texture.width,
				this.assets[i].texture.height,
				this.pos.x - this.assets[i].padding,
				this.pos.y
			);
		}

		nitroRender.unpauseShadowMode();
	}

	update() {
		let currentlap = this.kart.lapNumber < MKDSCONST.MAX_LAP ? this.kart.lapNumber : MKDSCONST.MAX_LAP;
		if (currentlap != this.lap) {
			this.lap = currentlap;
			this.flattener.loadTextue(32 + this.lap);
		}
	}
}