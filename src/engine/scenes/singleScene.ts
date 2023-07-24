//
// singleScene.js
//--------------------
// Drives the course scene when not connected to a server. Simulates responses expected from a server.
// by RHY3756547
//

import { Kart } from "../../entities/kart";
import { lz77 } from "../../formats/lz77";
import { narc } from "../../formats/narc";
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
		id: number,
		mode: number;
		time: number;
		frameDiv: number
	};
	activeScene: courseScene;
	myKart: Kart;
	mchar: number;
	mkart: number;
	advanceTimes: number[];
	constructor(course: string, wsInstance: WebSocket, res: IngameRes) {
		this.res = res; //gameRes

		this.mode = undefined;
		this.activeScene = null;
		this.myKart = null;

		this.mchar = Math.floor(Math.random() * 12);
		this.mkart = Math.floor(Math.random() * 0x24);
		this.advanceTimes = [3, 4, -1, -1]
		this.begin(course);
	}

	update() {
		if (this.activeScene != null) {
			this.activeScene.update();
			//simulate what a server would do
			this.updateServer();
		}
	}

	updateServer() {
		var m = this.mode;
		m.frameDiv++;
		if (m.frameDiv == 60) {
			m.frameDiv -= 60;
			m.time++;
			var timeAd = this.advanceTimes[m.id];
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
			sceneDrawer.getInstance().drawTest(gl, this.activeScene, 0, 0, gl.viewportWidth, gl.viewportHeight)
		}
	}

	begin(courseId: string) {
		if (courseId.substr(0, 5) == "mkds/") {
			var cnum = Number(courseId.substr(5));
			var course = MKDSCONST.COURSES[cnum];
			var cDir = MKDSCONST.COURSEDIR + course.name;
			var mainNarc = new narc(lz77.decompress(gameROM.getFile(cDir + ".carc")));
			var texNarc = new narc(lz77.decompress(gameROM.getFile(cDir + "Tex.carc")));
			this.setUpCourse(mainNarc, texNarc, course)
		} else throw "custom tracks are not implemented yet!"
	}


	setUpCourse(mainNarc: narc, texNarc: narc, course: MKCONST_course_obj) {
		var chars = [];
		chars.push({
			charN: this.mchar,
			kartN: this.mkart,
			controller: MKDSCONST.USER_CONTROLLER,
			raceCam: true,
			extraParams: [
				{ k: "name", v: "single" },
				{ k: "active", v: true }
			]
		});

		for (var i = 0; i < 7; i++) {
			var tchar = Math.floor(Math.random() * 12);
			var tkart = Math.floor(Math.random() * 0x24);

			chars.push({ charN: tchar, kartN: tkart, controller: controlRaceCPU, raceCam: false, extraParams: [{ k: "name", v: "no" }, { k: "active", v: true }] });
		}

		this.activeScene = new courseScene(mainNarc, texNarc, course, chars, {}, this.res);

		this.myKart = this.activeScene.karts[0];
		this.myKart.local = true

		this.mode = {
			id: 0,
			time: 0,
			frameDiv: 0,
			mode: 0
		}

		this.activeScene.updateMode({
			...this.mode,
		});
		this.activeScene.entities.push(
			new PlacementUI(this.activeScene, this.myKart),
			new LapCountUI(this.activeScene, this.myKart),
		);

	}
}