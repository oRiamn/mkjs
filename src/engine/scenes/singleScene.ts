//
// singleScene.js
//--------------------
// Drives the course scene when not connected to a server. Simulates responses expected from a server.
// by RHY3756547
//

import { Kart } from "../../entities/kart";
import { lz77 } from "../../formats/lz77";
import { narc } from "../../formats/narc";
import { ItemUi } from "../../ui/itemUi";
import { LapCountUI } from "../../ui/lapCountUI";
import { PlacementUI } from "../../ui/placementUI";
import { controlRaceCPU } from "../controls/controlRaceCPU";
import { IngameRes } from "../ingameRes";
import { MKCONST_course_obj, MKDSCONST } from "../mkdsConst";
import { courseScene } from "./courseScene";
import { sceneDrawer } from "./sceneDrawer";

export class singleScene {
	res: IngameRes;
	mode: {
		id: number;
		mode: number;
		time: number;
		frameDiv: number;
	};
	activeScene!: courseScene;
	myKart!: Kart;
	mchar: number;
	mkart: number;
	advanceTimes: number[];
	raceStarted: boolean;
	constructor(course: string, wsInstance: WebSocket, res: IngameRes, autostart = true) {
		this.res = res; //gameRes

		this.mode = undefined!;
		this.mchar = Math.floor(Math.random() * 12);
		this.mkart = Math.floor(Math.random() * 0x24);
		this.advanceTimes = [3, 4, -1, -1];
		this.raceStarted = autostart;
		this.begin(course, autostart);
	}

	startRace() {
		if (this.raceStarted) return;
		this.raceStarted = true;
		this.mode = {
			id: 0,
			time: 0,
			frameDiv: 0,
			mode: 0,
		};
		this.activeScene.updateMode({
			...this.mode,
		});
	}

	update() {
		if (this.activeScene != null) {
			this.activeScene.update();
			//simulate what a server would do
			this.updateServer();
		}
	}

	private updateServer() {
		if (!this.raceStarted) return;
		let m = this.mode;
		m.frameDiv++;
		if (m.frameDiv == 60) {
			m.frameDiv -= 60;
			m.time++;
			let timeAd = this.advanceTimes[m.id];
			if (timeAd != -1 && m.time >= timeAd) {
				m.id++;
				m.time = 0;
			}
		}
		this.activeScene.updateMode({
			...this.mode,
		});
	}

	render() {
		if (this.activeScene != null) {
			sceneDrawer.getInstance().drawTest(gl, this.activeScene, 0, 0, gl.viewportWidth, gl.viewportHeight);
		}
	}

	private begin(courseId: string, autostart: boolean) {
		if (courseId.substr(0, 5) == "mkds/") {
			let cnum = Number(courseId.substr(5));
			let course = MKDSCONST.COURSES[cnum];
			let cDir = MKDSCONST.COURSEDIR + course.name;
			let mainNarc = new narc(lz77.decompress(gameROM.getFile(`${cDir}.carc`)!));
			let texNarc = new narc(lz77.decompress(gameROM.getFile(`${cDir}Tex.carc`)!));
			this.setUpCourse(mainNarc, texNarc, course, autostart);
		} else throw "custom tracks are not implemented yet!";
	}

	private setUpCourse(mainNarc: narc, texNarc: narc, course: MKCONST_course_obj, autostart: boolean) {
		let chars = [];
		chars.push({
			charN: this.mchar,
			kartN: this.mkart,
			controller: MKDSCONST.USER_CONTROLLER,
			raceCam: true,
			extraParams: [
				{ k: "name", v: "single" },
				{ k: "active", v: true },
			],
		});

		for (let i = 0; i < 7; i++) {
			let tchar = Math.floor(Math.random() * 12);
			let tkart = Math.floor(Math.random() * 0x24);

			chars.push({
				charN: tchar,
				kartN: tkart,
				controller: controlRaceCPU,
				raceCam: false,
				extraParams: [
					{ k: "name", v: "no" },
					{ k: "active", v: true },
				],
			});
		}

		this.activeScene = new courseScene(mainNarc, texNarc, course, chars, {}, this.res);

		this.myKart = this.activeScene.karts[0];
		this.myKart.local = true;

		this.mode = {
			id: autostart ? 0 : -1,
			time: 0,
			frameDiv: 0,
			mode: autostart ? 0 : -1,
		};

		if (autostart) {
			this.activeScene.updateMode({
				...this.mode,
			});
		}
		this.activeScene.entities.push(
			new PlacementUI(this.activeScene, this.myKart),
			new LapCountUI(this.activeScene, this.myKart),
			new ItemUi(this.activeScene, this.myKart)
		);
	}
}
