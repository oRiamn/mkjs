import { TileFlattener } from "../engine/2d/tileFlattener";
import { Kart } from "../entities/kart";
import { ncer } from "../formats/2d/ncer";
import { ncgr } from "../formats/2d/ncgr";
import { nclr } from "../formats/2d/nclr";
import { nitroRender } from "../render/nitroRender";

const blank = 11;

const itemsTex: Record<string, number> = {
	banana: 23,
	bomb: 22,
	gesso: 29,
	kinoko: 13,
	kinoko_p: 30,
	koura_g: 18,
	koura_r: 16,
	star: 26,
	teresa: 21,
	thunder: 25,
	koura_w: 27,
	f_box: 20,
	killer: 28,
	koura_group: 19, // green
	koura_group_r: 17, // red
};

export class ItemUi implements SceneEntity {
	transparent: boolean;
	scene: Scene;
	kart: Kart;
	zoom: number;
	pos: { x: number; y: number; };
	lastWidth: number;
	flattenerBorder: TileFlattener;
	flattenerBackground: TileFlattener;
	place: number;
	animFrame: number;
	currentItem: string;
	flattenerItem: TileFlattener;
	constructor(scene: Scene, kart: Kart) {
		this.scene = scene;
		this.kart = kart;
		this.transparent = false;

		this.zoom = 1;
		this.pos = {
			x: 10,
			y: 0
		}
		this.animFrame = 0;

		this.buildOrtho(nitroRender.getViewWidth());
		this.lastWidth = 0;

		const ncgrFile = this.scene.gameRes.RaceLoc.getFile("race_m_o.NCGR");
		const nclrFile = this.scene.gameRes.Race.getFile("race_m_o.NCLR");
		const ncerFile = this.scene.gameRes.Race.getFile('race_m.NCER');

		const ncgrObj = new ncgr(ncgrFile);
		const nclrObj = new nclr(nclrFile);
		const ncerObj = new ncer(ncerFile);


		this.flattenerBorder = new TileFlattener(nclrObj, ncgrObj, ncerObj);
		this.flattenerBorder.pos[2] = 0.2;
		this.flattenerBorder.loadTextue(8);

		this.flattenerBackground = new TileFlattener(nclrObj, ncgrObj, ncerObj);
		this.flattenerBorder.pos[2] = 0.1;
		this.flattenerBackground.loadTextue(11);

		this.flattenerItem = new TileFlattener(nclrObj, ncgrObj, ncerObj);
		this.flattenerItem.pos[2] = 0.3;
		this.flattenerItem.loadTextue(blank);

		this.place = this.kart.placement;
		this.currentItem = '';
	}


	buildOrtho(width: number) {
		this.lastWidth = width;
		this.pos.y = 10;
		this.pos.x = 10;
	}

	draw() {
		if (nitroRender.flagShadow || this.animFrame < 0) return;
		var width = nitroRender.getViewWidth();
		if (width != this.lastWidth) {
			this.buildOrtho(width);
		}
		nitroRender.pauseShadowMode();

		this.flattenerBackground.draw(this.pos.x + 2, this.pos.y + 2, this.zoom)
		this.flattenerItem.draw(this.pos.x + 2, this.pos.y + 2, this.zoom)

		this.flattenerBorder.draw(this.pos.x, this.pos.y, this.zoom)

		nitroRender.unpauseShadowMode();
	}

	update() {
		if (this.kart.items.currentItem !== this.currentItem) {
			this.currentItem = this.kart.items.currentItem;
			const t = itemsTex[this.currentItem] ?? blank;
			this.flattenerItem.loadTextue(t);
		}
	}
}