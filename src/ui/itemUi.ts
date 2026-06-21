import { TileFlattener } from "../engine/2d/tileFlattener";
import { Kart } from "../entities/kart";
import { ncer } from "../formats/2d/ncer";
import { ncgr } from "../formats/2d/ncgr";
import { nclr } from "../formats/2d/nclr";
import { nitroRender } from "../render/nitroRender";
import { getUiScale, uiPx } from "./uiScale";

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
	koura_group_g: 19, // green
	koura_group_r: 17, // red
};

export class ItemUi implements SceneEntity {
	transparent: boolean;
	scene: Scene;
	kart: Kart;
	zoom: number;
	pos: { x: number; y: number };
	lastViewWidth: number;
	lastViewHeight: number;
	flattenerBorder: TileFlattener;
	flattenerBackground: TileFlattener;
	place: number;
	animFrame: number;
	currentItem: string | null;
	flattenerItem: TileFlattener;
	constructor(scene: Scene, kart: Kart) {
		this.scene = scene;
		this.kart = kart;
		this.transparent = false;

		this.zoom = 1;
		this.pos = {
			x: 10,
			y: 0,
		};
		this.animFrame = 0;

		this.lastViewWidth = 0;
		this.lastViewHeight = 0;

		const ncgrFile = this.scene.gameRes.RaceLoc.getFile("race_m_o.NCGR")!;
		const nclrFile = this.scene.gameRes.Race.getFile("race_m_o.NCLR")!;
		const ncerFile = this.scene.gameRes.Race.getFile("race_m.NCER")!;

		const ncgrObj = new ncgr(ncgrFile);
		const nclrObj = new nclr(nclrFile);
		const ncerObj = new ncer(ncerFile);

		this.flattenerBorder = new TileFlattener(nclrObj, ncgrObj, ncerObj, true);
		this.flattenerBorder.pos[2] = 0.2;

		this.flattenerBackground = new TileFlattener(nclrObj, ncgrObj, ncerObj, true);
		this.flattenerBackground.pos[2] = 0.1;

		this.flattenerItem = new TileFlattener(nclrObj, ncgrObj, ncerObj, true);
		this.flattenerItem.pos[2] = 0.3;

		this.updateLayout(nitroRender.getViewWidth(), nitroRender.getViewHeight());
		this.flattenerBorder.loadTextue(8);
		this.flattenerBackground.loadTextue(12);
		this.flattenerItem.loadTextue(blank);

		this.place = this.kart.placement;
		this.currentItem = "";
	}

	private updateLayout(width: number, height: number) {
		this.lastViewWidth = width;
		this.lastViewHeight = height;
		const scale = getUiScale(width, height);
		this.zoom = scale;
		this.pos.x = uiPx(10, scale);
		this.pos.y = uiPx(10, scale);
	}

	draw() {
		if (nitroRender.flagShadow || this.animFrame < 0) return;
		const width = nitroRender.getViewWidth();
		const height = nitroRender.getViewHeight();
		if (width !== this.lastViewWidth || height !== this.lastViewHeight) {
			this.updateLayout(width, height);
		}
		nitroRender.pauseShadowMode();
		this.flattenerBackground.draw(this.pos.x, this.pos.y, this.zoom);
		this.flattenerBorder.draw(this.pos.x, this.pos.y, this.zoom);
		if (this.currentItem) {
			const inset = uiPx(3, this.zoom);
			this.flattenerItem.draw(this.pos.x + inset, this.pos.y + inset, this.zoom);
		}

		nitroRender.unpauseShadowMode();
	}

	update() {
		if (this.kart.items.currentItem !== this.currentItem) {
			this.currentItem = this.kart.items.currentItem;
			const t = itemsTex[this.currentItem ?? ""] ?? blank;
			this.flattenerItem.loadTextue(t);
		}
	}
}
