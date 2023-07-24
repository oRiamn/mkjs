//
// courseScene.js
//--------------------
// Manages the ingame state of a course.
// by RHY3756547
//
// includes: narc.js
// formats/*
// engine/*
// entities/*
// gl-matrix.js
// render/*
//

import { nitroAudio, nitroAudioSound } from "../../audio/nitroAudio";
import { Kart } from "../../entities/kart";
import { objDatabase } from "../../entities/objDatabase";
import { kcl } from "../../formats/kcl";
import { narc } from "../../formats/narc";
import { nkm, nkm_section_POIT } from "../../formats/nkm";
import { nsbca } from "../../formats/nsbca";
import { nsbmd } from "../../formats/nsbmd";
import { nsbta } from "../../formats/nsbta";
import { nsbtp } from "../../formats/nsbtp";
import { nsbtx } from "../../formats/nsbtx";
import { ItemShard } from "../../particles/itemboxShard";
import { NitroEmitter } from "../../particles/nitroEmitter";
import { NitroParticle } from "../../particles/nitroParticle";
import { nitroModel } from "../../render/nitroModel";
import { nitroRender } from "../../render/nitroRender";
import { CountD3DUI } from "../../ui/countD3DUI";
import { Goal3DUI } from "../../ui/goal3DUI";
import { Start3DUI } from "../../ui/start3DUI";
import { cameraIngame } from "../cameras/cameraIngame";
import { cameraSpectator } from "../cameras/cameraSpectator";
import { controlRaceCPU } from "../controls/controlRaceCPU";
import { IngameRes } from "../ingameRes";
import { ItemController } from "../itemController";
import { MKCONST_course_obj, MKDSCONST } from "../mkdsConst";

type courseScene_char = {
	charN: number,
	kartN: number,
	controller: typeof Controls,
	raceCam: boolean,
	extraParams: any,
}

type particle = ItemShard | NitroEmitter | NitroParticle;

export class courseScene implements Scene {
	mainNarc: narc;
	texNarc: narc;
	courseObj: MKCONST_course_obj;
	chars: courseScene_char[];
	options: {};
	gameRes: IngameRes;
	music: any;
	startSetups: { maxplayers: number; toAline: number; xspacing: number; yspacing: number; liney: number; }[];
	fileBank: {
		[x: string]: any
	};

	lightMat: mat4;
	farShadMat: mat4;
	shadMat: mat4;
	mode: { id: number, mode: number; time: number; };
	musicRestartTimer: number;
	musicRestart: number;
	musicRestartType: number;
	finishers: any[];
	courseTx: nsbtx;
	course: nitroModel;
	sky: nitroModel;
	kcl: kcl;
	nkm: nkm;
	entities: any[];
	karts: Kart[];
	items: ItemController;
	particles: any[];
	colEnt: any[];
	musicPlayer: nitroAudioSound;
	frame: number;
	entsToRemove: any[];
	finishPercents: number[][];
	camera: Camera;
	paths: nkm_section_POIT[][];
	lightDir: vec3;
	typeRes: {
		mdl: nitroModel[];
		other: (nsbtx | nsbta | nsbtp | nsbmd | nsbca)[];
	}[];

	farShad: { color: CustomWebGLTexture; depth: CustomWebGLTexture; fb: WebGLFramebuffer; }; // set in sceneDrawer.drawTest...

	lastWidth: number; // set in sceneDrawer.drawWithShadow...
	lastHeight: number; // set in sceneDrawer.drawWithShadow...
	renderTarg: { color: CustomWebGLTexture; depth: CustomWebGLTexture; fb: WebGLFramebuffer; }; // set in sceneDrawer.drawWithShadow...

	constructor(mainNarc: narc, texNarc: narc, courseObj: MKCONST_course_obj, chars: courseScene_char[], options: {}, gameRes: IngameRes) {
		this.mainNarc = mainNarc;
		this.texNarc = texNarc;
		this.courseObj = courseObj;
		this.chars = chars;
		this.options = options;
		this.gameRes = gameRes;

		this.music = this.courseObj.music;
		this.startSetups = [
			{ maxplayers: 12, toAline: 4, xspacing: 32, yspacing: 32, liney: 160 },
			{ maxplayers: 24, toAline: 4, xspacing: 32, yspacing: 32, liney: 80 },
			{ maxplayers: 36, toAline: 6, xspacing: 21, yspacing: 21, liney: 80 },
			{ maxplayers: 48, toAline: 6, xspacing: 21, yspacing: 21, liney: 54 },
			{ maxplayers: 64, toAline: 8, xspacing: 16, yspacing: 16, liney: 54 },
			{ maxplayers: 112, toAline: 8, xspacing: 16, yspacing: 16, liney: 32 },
		]


		this.fileBank = {};

		this.typeRes = [];
		this.lightMat = mat4.create();
		this.farShadMat = mat4.create();
		this.shadMat = mat4.create();

		//game mode initialization
		this.mode = { id: -1, mode: -1, time: 0 };
		this.musicRestartTimer = -1;
		this.musicRestart = 3.5 * 60;
		this.musicRestartType = 0;
		this.finishers = [];
		
		//load main course
		this.courseTx = new nsbtx(this.texNarc.getFile("/course_model.nsbtx"), false);


		var taFile = this.mainNarc.getFile("/course_model.nsbta");
		if (taFile != null) var courseTa = new nsbta(taFile); //can be null
		var tpFile = this.mainNarc.getFile("/course_model.nsbtp");
		if (tpFile != null) var courseTp = new nsbtp(tpFile); //can be null

		var courseMdl = new nsbmd(this.mainNarc.getFile("/course_model.nsbmd"));

		var course = new nitroModel(courseMdl, this.courseTx)
		if (taFile != null) course.loadTexAnim(courseTa);
		if (tpFile != null) course.loadTexPAnim(courseTp);

		//load sky
		var skyTx = new nsbtx(this.texNarc.getFile("/course_model_V.nsbtx"), false);
		var staFile = this.mainNarc.getFile("/course_model_V.nsbta");
		if (staFile != null) var skyTa = new nsbta(staFile); //can be null
		// console.log("--------- LOADING SKY ---------")
		var skyMdl = new nsbmd(this.mainNarc.getFile("/course_model_V.nsbmd"));

		var sky = new nitroModel(skyMdl, skyTx)
		if (staFile != null) sky.loadTexAnim(skyTa);

		var ckcl = new kcl(this.mainNarc.getFile("/course_collision.kcl"), false);
		var cnkm = new nkm(this.mainNarc.getFile("/course_map.nkm"));

		this.course = course;
		this.sky = sky;
		this.kcl = ckcl;
		this.nkm = cnkm;
		this.entities = []; //these should never change
		this.karts = []; //these should probably not change
		this.items = new ItemController(this); //these should change a lot!!
		this.particles = []; //not synced with server at all

		this.colEnt = [];

		this.musicPlayer = null;

		this.startCourse();

		this.frame = 0;
		this.entsToRemove = [];

		this.finishPercents = [
			[0, 66, 46, 58, 9],
			[0.5, 66, 47, 56, 10],
			[1.1, 67, 48, 57, 11]
		]
	}



	draw(gl: CustomWebGLRenderingContext, pMatrix: mat4, shadow: boolean) {
		gl.cullFace(gl.BACK);

		/*var mat = this.camera.getView(scn);
	
		var pMatrix = mat.p;
		var mvMatrix = mat.mv;*/
		var mvMatrix = mat4.create();
		nitroRender.setAlpha(1);

		if (!shadow) {
			var skyMat = mat4.scale(mat4.create(), mvMatrix, [1 / 64, 1 / 64, 1 / 64]);
			this.sky.setFrame(this.frame);
			if (!this.courseObj.skyboxShadows) nitroRender.setLightIntensities(0, 0);
			this.sky.draw(skyMat, pMatrix);
			if (!this.courseObj.skyboxShadows) nitroRender.setLightIntensities(0.3, 1);
		}

		var lvlMat = mat4.scale(mat4.create(), mvMatrix, [1 / 64, 1 / 64, 1 / 64]);//[2, 2, 2]);
		this.course.setFrame(this.frame);
		nitroRender.forceFlatNormals = true;
		nitroRender.setLightIntensities(0, 1);
		this.course.draw(lvlMat, pMatrix);
		nitroRender.setLightIntensities(0.3, 1);
		nitroRender.forceFlatNormals = false;

		var transE = [];

		mat4.scale(mvMatrix, mvMatrix, [1 / 1024, 1 / 1024, 1 / 1024])

		//"so why are these separated rhys??"
		//
		//fantastic i'm glad you asked
		//if we draw lots of the same model, not animated in a row we don't need to resend the matStack for that model
		//which saves a lot of time for the 2 extra model types per car.

		for (var i = 0; i < this.karts.length; i++) if (this.karts[i].active) this.karts[i].drawKart(mvMatrix, pMatrix, gl);
		for (var i = 0; i < this.karts.length; i++) if (this.karts[i].active) this.karts[i].drawWheels(mvMatrix, pMatrix);
		for (var i = 0; i < this.karts.length; i++) if (this.karts[i].active) this.karts[i].drawChar(mvMatrix, pMatrix);

		for (var i = 0; i < this.entities.length; i++) {
			var e = this.entities[i];
			if (e.transparent) transE.push(e);
			else e.draw(mvMatrix, pMatrix, gl);
		}

		nitroRender.setLightIntensities(0, 1);
		for (var i = 0; i < this.particles.length; i++) {
			var e = this.particles[i];
			e.draw(mvMatrix, pMatrix, gl);
		}

		this.items.draw(mvMatrix, pMatrix);
		nitroRender.setLightIntensities(0.3, 1);;
	}

	sndUpdate(view: mat4) {
		var mulmat = mat4.create();
		mat4.scale(mulmat, mulmat, [1 / 1024, 1 / 1024, 1 / 1024]);
		var view = mat4.mul(mat4.create(), view, mulmat)

		for (var i = 0; i < this.karts.length; i++) {
			var e = this.karts[i];
			if (e.sndUpdate != null) e.sndUpdate(view);
		}

		for (var i = 0; i < this.entities.length; i++) {
			var k = this.entities[i];
			if (k.sndUpdate != null) k.sndUpdate(view);
		}
	}

	update() {
		var shadres = 0.25;
		var targ = vec3.transformMat4([0, 0, 0], this.camera.targetShadowPos, this.lightMat);
		vec3.scale(targ, targ, 1 / 1024);
		mat4.mul(this.shadMat, mat4.ortho(mat4.create(), targ[0] - shadres, targ[0] + shadres, targ[1] - shadres, targ[1] + shadres, -targ[2] - 2.5, -targ[2] + 2.5), this.lightMat);

		var places = [];
		for (var i = 0; i < this.karts.length; i++) { places.push(this.karts[i]); }
		places.sort(function (a, b) { return b.getPosition() - a.getPosition() });
		for (var i = 0; i < places.length; i++) { places[i].placement = i + 1; }; // place info

		for (var i = 0; i < this.karts.length; i++) {
			var k = this.karts[i];
			if (k.active) k.update(this);
		}

		var entC = this.entities.slice(0);
		for (var i = 0; i < entC.length; i++) {
			var ent = entC[i];
			ent.update(this);
		}

		var prtC = this.particles.slice(0);
		for (var i = 0; i < prtC.length; i++) {
			var ent = prtC[i];
			ent.update(this);
		}

		this.items.update(this);

		if (this.musicRestartTimer > -1) {
			this.musicRestartTimer++;
			if (this.musicRestartTimer > this.musicRestart) {
				this.musicPlayer = nitroAudio.playSound(
					this.music,
					{
						volume: 2,
						bpmMultiplier: (this.musicRestartType == 0) ? 1.25 : 1
					},
					null,
					null
				);
				this.musicRestartTimer = -1;
			}
		}

		for (var i = 0; i < this.entsToRemove.length; i++) {
			this.entities.splice(this.entities.indexOf(this.entsToRemove[i]), 1);
		}
		this.entsToRemove = [];
		var mat = this.camera.getView(this, nitroRender.getViewWidth(), nitroRender.getViewHeight());

		nitroAudio.updateListener(mat.pos, mat.mv);
		this.frame++;
	}

	removeParticle(obj: particle) {
		this.particles.splice(this.particles.indexOf(obj), 1);
	}

	removeEntity(obj: SceneEntity) {
		this.entsToRemove.push(obj);
	}

	compilePaths() {
		var path = this.nkm.sections["PATH"].entries;
		var pts = this.nkm.sections["POIT"].entries;

		var paths = [];
		var ind = 0;
		for (var i = 0; i < path.length; i++) {
			var p = [];
			for (var j = 0; j < path[i].numPts; j++) {
				p.push(pts[ind++]);
			}
			paths.push(p);
		}
		this.paths = paths;
	}

	getLightCenter() {
		var average = vec3.create();
		var objs = this.nkm.sections["OBJI"].entries;
		for (var i = 0; i < objs.length; i++) {
			vec3.add(average, average, objs[i].pos);
		}
		vec3.scale(average, average, (1 / objs.length) / -1024);
		return average;
	}

	startCourse() {
		this.lightMat = mat4.create();

		mat4.rotateX(this.lightMat, this.lightMat, Math.PI * (this.courseObj.lightHeight || (61 / 180)));
		mat4.rotateY(this.lightMat, this.lightMat, Math.PI * (this.courseObj.lightAngle || (21 / 180)));
		this.lightDir = [0, 0, 1];
		vec3.transformMat3(this.lightDir, this.lightDir, mat3.invert(mat3.create(), mat3.fromMat4(mat3.create(), this.lightMat)));

		this.farShadMat = mat4.create();
		mat4.translate(this.farShadMat, this.lightMat, this.getLightCenter());

		mat4.mul(this.farShadMat, mat4.ortho(mat4.create(), -5, 5, -5, 5, -5, 5), this.farShadMat);

		this.compilePaths();

		//chars format: {charN: int, kartN: int, controller: function, raceCam: bool, controlOptions: object}

		var startSet = null;
		for (var i = 0; i < this.startSetups.length; i++) {
			if (this.chars.length < this.startSetups[i].maxplayers) {
				startSet = this.startSetups[i];
				break;
			}
		}

		var startpos = this.nkm.sections["KTPS"].entries[0];



		for (var i = 0; i < this.chars.length; i++) {
			var c = this.chars[i];
			const control = c.controller
			var kart = new Kart(
				vec3.add([0, 0, 0], startpos.pos, this.startPosition(startSet.toAline, startSet.xspacing, startSet.yspacing, startSet.liney, startpos.angle[1], i)),
				(180 - startpos.angle[1]) * (Math.PI / 180),
				0,
				c.kartN,
				c.charN,
				new control(this.nkm),
				this
			);
			this.karts.push(kart);
			var spectator = false; //(prompt("Type y for spectator cam")=="y")
			if (c.raceCam) {
				if (spectator) {
					this.camera = new cameraSpectator(kart);
				} else {
					this.camera = new cameraIngame(kart);
				}

				//this.camera = new cameraIntro(kart)
			}

			const chardiv = document.createElement('div');
			chardiv.setAttribute('charname', kart.profile.name)
			chardiv.appendChild(kart.profile.emblem)
			chardiv.appendChild(kart.profile.thumb)
			document.body.appendChild(chardiv)

		}

		var obj = this.nkm.sections["OBJI"].entries;
		for (var i = 0; i < obj.length; i++) {
			var o = obj[i];
			var func = objDatabase.idToType[o.ID];
			if (func != null) {
				var ent = new func(o, this);

				if (this.typeRes[o.ID] == null) {
					this.loadRes(ent.requireRes(), o.ID)
				}

				ent.provideRes(this.typeRes[o.ID]);
				this.entities.push(ent);
				if (ent.collidable) this.colEnt.push(ent);
			}
		}
	}

	loadOrGet(res: string): other {
		var ext = res.split(".").pop();
		if (this.fileBank["$" + ext] == null) this.fileBank["$" + ext] = {};
		var item = this.fileBank["$" + ext]["$" + res];
		if (item != null) return item;

		if (['nsbmd', 'nsbtx', 'nsbca', 'nsbta', 'nsbtp'].includes(ext)) {
			var test = this.mainNarc.getFile(res);
			if (test == null) test = this.gameRes.MapObj.getFile(res.split("/").pop())
			if (test == null) throw "COULD NOT FIND RESOURCE " + res + "!";

			let item;
			switch (ext) {
				case 'nsbmd':
					item = new nsbmd(test);
					break;

				case 'nsbtx':
					item = new nsbtx(test, false);
					break;

				case 'nsbca':
					item = new nsbca(test);
					break;
				case 'nsbta':
					item = new nsbta(test);
					break;
				case 'nsbtp':
					item = new nsbtp(test);
					break;
			}
			this.fileBank["$" + ext]["$" + res] = item;
			return item;
		}
	}

	lapAdvance(kart: Kart) {

		//if the kart is us, play some sounds and show lakitu
		var winPercent = this.finishers.length / this.karts.length;
		if (kart.local) {
			console.log(`lap ${kart.lapNumber}`);
			if (kart.lapNumber === MKDSCONST.MAX_LAP) {
				//last lap
				this.musicRestartTimer = 0;
				nitroAudio.instaKill(this.musicPlayer);
				this.musicPlayer = nitroAudio.playSound(62, { volume: 2 }, null, null);
			}
			else if (kart.lapNumber === MKDSCONST.MAX_LAP + 1) {
				var finishTuple: number[] = [];
				for (var i = 0; i < this.finishPercents.length; i++) {
					finishTuple = this.finishPercents[i];
					if (this.finishPercents[i][0] >= winPercent) break;
				}

				kart.controller = new controlRaceCPU(this.nkm);
				kart.controller.setKart(kart);

				kart.anim.setAnim(winPercent > 0.5 ? kart.charRes.loseA : kart.charRes.winA);
				kart.animMode = "raceEnd";

				this.camera = new cameraSpectator(kart);
				nitroAudio.playSound(finishTuple[1], { volume: 2 }, 0, null);
				nitroAudio.playSound(finishTuple[2], { volume: 2 }, null, null);
				nitroAudio.instaKill(this.musicPlayer);
				kart.playCharacterSound(finishTuple[4], 2);
				this.musicRestartTimer = 0;
				this.musicRestart = 7.5 * 60;
				this.musicRestartType = 1;
				this.music = finishTuple[3];
				this.entities.push(new Goal3DUI(this));
			}
			else if (kart.lapNumber <= MKDSCONST.MAX_LAP) {
				nitroAudio.playSound(65, { volume: 2 }, 0, null);
			}
		}

		if (kart.lapNumber === MKDSCONST.MAX_LAP + 1) {
			this.finishers.push(kart);
		}
	}

	startPosition(toAline: number, xspacing: number, yspacing: number, liney: number, angle: number, i: number) {
		var horizN = i % toAline;
		var vertN = Math.floor(i / toAline);
		var staggered = (vertN % 2); //second line moves 1/2 x spacing to the right
		var relPos: vec3 = [(horizN - (toAline / 2) - 0.25) * xspacing + staggered * 0.5, 8, -(horizN * yspacing + vertN * liney)];
		var mat = mat4.rotateY(mat4.create(), mat4.create(), angle * (Math.PI / 180));
		vec3.transformMat4(relPos, relPos, mat);
		return relPos;
	}

	loadRes(res: { mdl: { nsbmd: string; nsbtx?: string }[]; other?: string[] }, id: number) {
		var models = [];

		for (var i = 0; i < res.mdl.length; i++) {
			var inf = res.mdl[i];
			var bmd = <nsbmd>this.loadOrGet("/MapObj/" + inf.nsbmd);
			var btx = (inf.nsbtx == null) ? null : <nsbtx>this.loadOrGet("/MapObj/" + inf.nsbtx);

			var mdl = new nitroModel(bmd, btx);

			models.push(mdl);
		}

		var other = [];
		if (res.other != null) {
			for (var i = 0; i < res.other.length; i++) {
				other.push(this.loadOrGet("/MapObj/" + res.other[i]));
			}
		}

		this.typeRes[id] = { mdl: models, other: other };
	}

	updateMode(mode: { id: number, mode: number; time: number; }) {
		//// console.log(mode)
		// updates the game mode...

		// {
		//   id = (0:pregame, 1:countdown, 2:race, 3:postgame)
		//   time = (elapsed time in seconds)
		//   frameDiv = (0-60)
		//  }
		var lastid = this.mode.id;
		if (lastid != mode.id) {
			// // console.log(this.mode.id)
			//mode switch
			switch (mode.id) {
				case 0:
					//race init. fade scene in and play init music.
					nitroAudio.playSound((this.courseObj.battle) ? 12 : 11, { volume: 2 }, null, null); //7:race (gp), 11:race2 (vs), 12:battle
					break;
				case 1:
					//spawn lakitu and countdown animation. allow pre-acceleration.
					//generally happens at least 2 seconds after init
					this.entities.push(new CountD3DUI(this));
					break;
				case 2:
					//enable all racers and start this.music
					for (var i = 0; i < this.karts.length; i++) {
						this.karts[i].preboost = false;
					}
					nitroAudio.playSound(40, { volume: 2, bpmMultiplier: 16 }, 0, null);
					this.entities.push(new Start3DUI(this));
					break;

			}
		}

		if (this.mode.time != mode.time) {
			switch (mode.id) {
				case 0:
					break;
				case 1:
					if (mode.time > 0) {
						//beeps for countdown
						nitroAudio.playSound(39, { bpmMultiplier: 16 }, 0, null);
					}
					break;
				case 2:
					//show ui and play this.music at certain time after go

					if (mode.time == 1) {
						this.musicPlayer = nitroAudio.playSound(this.music, { volume: 2 }, null, null);
					}
					//
					break;
			}
		}

		//win sting: 46
		//ok sting: 47
		//lose sting: 48
		//battle lose sting: 49
		//battle win sting: 50
		//ok sting??: 51
		//mission mode win sting: 52
		//mission mode win2 sting: 53
		//mission mode superwin sting: 54
		//boss win sting: 55
		//ok this.music: 56
		//lose this.music: 57
		//win this.music: 58
		//racelose : 61
		//ok this.music: 58
		//good time trials this.music: 59
		//ok time trials: 60

		//final lap: 62

		//full results win: 63
		//results draw: 64
		//full results lose: 65
		//gp results cutscene this.music: 66
		//gp results win this.music: 67
		//??? : 68
		//credits: 69-70
		// star: 73

		this.mode = mode;
	}
}
