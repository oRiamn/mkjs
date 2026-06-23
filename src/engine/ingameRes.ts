//
// ingameRes.js
//--------------------
// Provides access to general ingame resources.
// by RHY3756547

import { ncer } from "../formats/2d/ncer";
import { ncgr } from "../formats/2d/ncgr";
import { nclr } from "../formats/2d/nclr";
import { kartoffsetdata } from "../formats/kartoffsetdata";
import { kartphysicalparam } from "../formats/kartphysicalparam";
import { lz77 } from "../formats/lz77";
import { narc } from "../formats/narc";
import { ndsFS } from "../formats/ndsFS";
import { nftr } from "../formats/nftr";
import { nsbca } from "../formats/nsbca";
import { nsbmd } from "../formats/nsbmd";
import { nsbtx } from "../formats/nsbtx";
import { spa } from "../formats/spa";
import { nitroModel } from "../render/nitroModel";
import { TileFlattener } from "./2d/tileFlattener";
import { MKDSCONST } from "./mkdsConst";

export type items_IngameRes = {
	banana: nitroModel;
	bomb: nitroModel;
	gesso: nitroModel;
	kinoko: nitroModel;
	kinoko_p: nitroModel;
	koura_g: nitroModel;
	koura_r: nitroModel;
	star: nitroModel;
	teresa: nitroModel;
	thunder: nitroModel;
	koura_w: nitroModel;
	f_box: nitroModel;
	killer: nitroModel;
	blueShell: nitroModel;
	splat: nitroModel;
	fakeBox: nitroModel;
};

export type tires = {
	kart_tire_L: nitroModel;
	kart_tire_M: nitroModel;
	kart_tire_S: nitroModel;
};

export type IngameRes_character = {
	model: nitroModel;
	driveA: nsbca;
	loseA: nsbca;
	spinA: nsbca;
	winA: nsbca;
	sndOff: number;
	emblem: nsbtx;
	thumb: CustomWebGLTexture;
};

//
export class IngameRes {
	rom: ndsFS;
	kartPhys: kartphysicalparam;
	kartOff: kartoffsetdata;
	MapObj: narc;
	MainRace: narc;
	MainEffect: narc;
	Main2D: narc;
	KartModelSub: narc;
	Race: narc;
	RaceLoc: narc;
	RaceEffect: spa;
	MainFont: nftr;
	MFont: nftr;
	SFont: nftr;
	toSoundOff: number[];
	charNames: string[];
	charAbbrv: string[];
	characters: IngameRes_character[];
	karts: nitroModel[];
	letters: string[];
	items!: items_IngameRes;
	tireRes!: tires;
	Main2DLoc: narc;
	playerThumb!: TileFlattener;
	constructor(rom: ndsFS) {
		this.rom = rom;
		this.kartPhys = new kartphysicalparam(this.rom.getFile("/data/KartModelMenu/kartphysicalparam.bin")!);
		this.kartOff = new kartoffsetdata(this.rom.getFile("/data/KartModelMenu/kartoffsetdata.bin")!);
		this.MapObj = new narc(lz77.decompress(this.rom.getFile("/data/Main/MapObj.carc")!)); //contains generic map obj, look in here when mapobj res is missing fthis.rom course. (itembox etc)
		this.MainRace = new narc(lz77.decompress(this.rom.getFile("/data/MainRace.carc")!)); //contains item models.
		this.MainEffect = new narc(lz77.decompress(this.rom.getFile("/data/MainEffect.carc")!)); //contains particles.
		this.Main2D = new narc(lz77.decompress(this.rom.getFile("/data/Main2D.carc")!));
		this.Main2DLoc = new narc(lz77.decompress(this.rom.getFile(`/data/Main2D_${MKDSCONST.CURRENTLANG}.carc`)!));

		this.KartModelSub = new narc(lz77.decompress(this.rom.getFile("/data/KartModelSub.carc")!)); //contains characters + animations

		this.Race = new narc(lz77.decompress(this.rom.getFile("/data/Scene/Race.carc")!)); //contains lakitu, count, various graphics
		this.RaceLoc = new narc(lz77.decompress(this.rom.getFile(`/data/Scene/Race_${MKDSCONST.CURRENTLANG}.carc`)!)); //contains lakitu lap signs, START, YOU WIN etc. some of these will be replaced by hi res graphics by default.
		this.RaceEffect = new spa(this.MainEffect.getFile("RaceEffect.spa")!);

		this.MainFont = new nftr(this.Main2D.getFile("marioFont.NFTR")!);
		this.MFont = new nftr(this.Main2D.getFile("LC_Font_m.NFTR")!);
		this.SFont = new nftr(this.Main2D.getFile("LC_Font_s.NFTR")!);

		//testFont(this.MainFont, 0);
		//testFont(this.MFont, 16*4);
		//testFont(this.SFont, 32*4);

		/*
		var test = new GraphicTester(this.rom);
		listRecursive(this.rom);
		*/

		//debugger;

		//order
		//donkey, toad, bowser?, luigi, mario, peach, wario, yoshi, daisy, waluigi, dry bones (karon), robo, heyho
		this.toSoundOff = [4, 0, 1, 2, 5, 6, 7, 3, 10, 8, 9, 11, 12];

		this.charNames = [
			"mario",
			"donkey",
			"kinopio",
			"koopa",
			"peach",
			"wario",
			"yoshi",
			"luigi",
			"karon",
			"daisy",
			"waluigi",
			"robo",
			"heyho",
		];

		this.charAbbrv = ["MR", "DK", "KO", "KP", "PC", "WR", "YS", "LG", "KA", "DS", "WL", "RB", "HH"];

		this.characters = [];
		this.karts = [];
		this.letters = ["a", "b", "c"];

		this._loadItems();
		this._loadTires();
		this._loadPlayerThumb();
	}

	private testFont(font: nftr, off: number, name: string) {
		let all = Object.keys(font.charMap).join("");
		let split = document.createElement("h3");
		split.innerText = name;
		document.body.appendChild(split);

		for (let i = 0; i < 4; i++) {
			let sliceF = Math.floor((all.length * i) / 4);
			let sliceT = Math.floor((all.length * (i + 1)) / 4);

			let canvas = font.drawToCanvas(
				all.substring(sliceF, sliceT),
				[
					[0, 0, 0, 0],
					[255, 0, 0, 255],
					[255, 255, 255, 255],
					[32, 0, 0, 255],
					[64, 0, 0, 255],
					[96, 0, 0, 255],
					[128, 0, 0, 255],
				],
				1
			);
			document.body.appendChild(canvas);
			//canvas.style.position = "absolute";
			//canvas.style.left = 0;
			//canvas.style.top = `${off}px`;

			//off += 16;
		}
	}

	private listRecursive(resource: narc, path: string) {
		path = path || "";
		let files = resource.list();
		for (let i = 0; i < files.length; i++) {
			let file = files[i];
			// console.log(path + file);
			if (file.toLowerCase().endsWith(".carc")) {
				this.listRecursive(new narc(lz77.decompress(resource.getFile(file)!)), path + file);
			}
			if (file.toLowerCase().endsWith(".nftr")) {
				// if (file == "/selectFont.NFTR") debugger;
				this.testFont(new nftr(resource.getFile(file)!), 0, path + file);
			}
		}
	}

	private _loadItems() {
		//loads physical representations of items

		const itemModelNames = [
			"banana",
			"bomb",
			"gesso",
			"kinoko",
			"kinoko_p",
			"koura_g",
			"koura_r",
			"star",
			"teresa",
			"thunder",
			"koura_w",
			"f_box",
			"killer",
		] as const;
		let t = {} as Pick<items_IngameRes, (typeof itemModelNames)[number]>;

		for (const n of itemModelNames) {
			t[n] = new nitroModel(new nsbmd(this.MainRace.getFile(`/Item/it_${n}.nsbmd`)!), null);
		}

		const blueShell = new nitroModel(new nsbmd(this.MainRace.getFile("/Item/koura_w.nsbmd")!), null);
		const splat = new nitroModel(new nsbmd(this.MainRace.getFile("/Item/geso_sumi.nsbmd")!), null);
		const fakeBox = new nitroModel(new nsbmd(this.MainRace.getFile("/MapObj/box.nsbmd")!), null);
		this.items = {
			banana: t.banana,
			bomb: t.bomb,
			gesso: t.gesso,
			kinoko: t.kinoko,
			kinoko_p: t.kinoko_p,
			koura_g: t.koura_g,
			koura_r: t.koura_r,
			star: t.star,
			teresa: t.teresa,
			thunder: t.thunder,
			koura_w: t.koura_w,
			f_box: t.f_box,
			killer: t.killer,
			blueShell,
			splat,
			fakeBox,
		};
	}

	private _loadTires() {
		let path = "/data/KartModelMenu/kart/tire/";

		let tires: { [x: string]: nitroModel } = {
			kart_tire_L: undefined!,
			kart_tire_M: undefined!,
			kart_tire_S: undefined!,
		};

		for (const tirename in tires) {
			const bmd = new nsbmd(this.rom.getFile(`${path + tirename}.nsbmd`)!);
			const btx = new nsbtx(this.rom.getFile(`${path + tirename}.nsbtx`)!, false);
			tires[tirename] = new nitroModel(bmd, btx);
		}
		this.tireRes = {
			kart_tire_L: tires.kart_tire_L,
			kart_tire_M: tires.kart_tire_M,
			kart_tire_S: tires.kart_tire_S,
		};
	}

	private _loadPlayerThumb() {
		let ncgrFile = this.Main2DLoc.getFile("player_character_L.nce.ncgr")!;
		let nclrFile = this.Main2DLoc.getFile("player_character_L_o.NCLR")!;
		let ncerFile = this.Main2DLoc.getFile("player_character_L.nce.ncer")!;

		const ncgrF = new ncgr(ncgrFile);
		const nclrF = new nclr(nclrFile);
		const ncerF = new ncer(ncerFile);

		this.playerThumb = new TileFlattener(nclrF, ncgrF, ncerF);
	}

	getChar(ind: number) {
		if (this.characters[ind] != null) {
			return this.characters[ind];
		}

		const emblembtxFile = this.rom.getFile(`/data/KartModelMenu/emblem/${this.charAbbrv[ind]}_emblem.nsbtx`)!;
		const thumb = this.playerThumb.toTexture(true, ind);

		let base = `/character/${this.charNames[ind]}/P_${this.charAbbrv[ind]}`;
		const bmd = new nsbmd(this.KartModelSub.getFile(`${base}.nsbmd`)!);
		const btx = new nsbtx(this.KartModelSub.getFile(`${base}.nsbtx`)!, false);
		const texMap = { tex: { 1: 2 }, pal: { 1: 2 } };
		let obj = {
			model: new nitroModel(bmd, btx, texMap),
			driveA: new nsbca(this.KartModelSub.getFile(`${base}_drive.nsbca`)!),
			loseA: new nsbca(this.KartModelSub.getFile(`${base}_lose.nsbca`)!),
			spinA: new nsbca(this.KartModelSub.getFile(`${base}_spin.nsbca`)!),
			winA: new nsbca(this.KartModelSub.getFile(`${base}_win.nsbca`)!),
			sndOff: this.toSoundOff[ind] * 14,
			emblem: new nsbtx(emblembtxFile, false),
			thumb,
		};
		this.characters[ind] = obj;
		return this.characters[ind];
	}

	getKart(ind: number) {
		//returns a nitroModel, but also includes a property "shadVol" containing the kart's shadow volume.
		if (this.karts[ind] != null) {
			return this.karts[ind];
		}

		let c = Math.floor(ind / 3);
		let t = ind % 3;
		if (t == 0) {
			c = 0; //only mario has standard kart
		}

		let name = `${this.charAbbrv[c]}_${this.letters[t]}`;
		let path = `/data/KartModelMenu/kart/${this.charNames[c]}/kart_${name}`;

		let model = new nitroModel(new nsbmd(this.rom.getFile(`${path}.nsbmd`)!), new nsbtx(this.rom.getFile(`${path}.nsbtx`)!, false));
		model.shadVol = new nitroModel(new nsbmd(this.rom.getFile(`/data/KartModelMenu/kart/shadow/sh_${name}.nsbmd`)!), null);
		//todo, assign special pallete for A karts

		this.karts[ind] = model;
		return this.karts[ind];
	}
}
