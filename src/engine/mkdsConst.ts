//
// mkdsConst.js
//--------------------
// Provides various game constants.
// by RHY3756547
//

import { controlRaceCPU } from "./controls/controlRaceCPU";
import { getPlayerControls } from "./controls/getPlayerControls";

export type MKCONST_course_obj = {
    name: string;
    music: number;
    lightHeight?: number;
    lightAngle?: number;
    skyboxShadows?: boolean;
    battle?: boolean;
}


const DAMAGE_SPIN = 0;
const DAMAGE_FLIP = 1;
const DAMAGE_EXPLODE = 2;

const COURSEDIR = "/data/Course/";

const COURSES: MKCONST_course_obj[] = [ //in order of course id, nitro through retro
	{ name: "cross_course", music: 74 },
	{ name: "bank_course", music: 16 },
	{ name: "beach_course", music: 15 },
	{ name: "mansion_course", music: 21, lightHeight: 20 / 180, lightAngle: 160 / 180 },

	{ name: "desert_course", music: 38, lightHeight: 40 / 180 },
	{ name: "town_course", music: 17 },
	{ name: "pinball_course", music: 19 },
	{ name: "ridge_course", music: 36 },

	{ name: "snow_course", music: 37 },
	{ name: "clock_course", music: 39 },
	{ name: "mario_course", music: 74 },
	{ name: "airship_course", music: 18, lightHeight: 40 / 180, lightAngle: 140 / 180 },

	{ name: "stadium_course", music: 19 },
	{ name: "garden_course", music: 20 },
	{ name: "koopa_course", music: 40 },
	{ name: "rainbow_course", music: 41 },


	{ name: "old_mario_sfc", music: 22 },
	{ name: "old_momo_64", music: 30 },
	{ name: "old_peach_agb", music: 26 },
	{ name: "old_luigi_gc", music: 33 },

	{ name: "old_donut_sfc", music: 24 },
	{ name: "old_frappe_64", music: 31 },
	{ name: "old_koopa_agb", music: 27 },
	{ name: "old_baby_gc", music: 34 },

	{ name: "old_noko_sfc", music: 23 },
	{ name: "old_choco_64", music: 29 },
	{ name: "old_luigi_agb", music: 26 },
	{ name: "old_kinoko_gc", music: 35 },

	{ name: "old_choco_sfc", music: 25 },
	{ name: "old_hyudoro_64", music: 32 },
	{ name: "old_sky_agb", music: 28, skyboxShadows: true },
	{ name: "old_yoshi_gc", music: 33, lightHeight: 30 / 180, lightAngle: 111 / 180 },

	{ name: "mini_stage1", music: 43, battle: true },
	{ name: "mini_stage2", music: 43, battle: true, lightHeight: 20 / 180, lightAngle: 160 / 180 },
	{ name: "mini_stage3", music: 43, battle: true },
	{ name: "mini_stage4", music: 43, battle: true },
	{ name: "mini_block_64", music: 43, battle: true },
	{ name: "mini_dokan_gc", music: 43, battle: true }

]

let CURRENTCOURSE = parseInt(localStorage.getItem("CURRENTCOURSE"))
if (Number.isInteger(CURRENTCOURSE) && CURRENTCOURSE >= 0 && CURRENTCOURSE <= COURSES.length) {
	CURRENTCOURSE = CURRENTCOURSE;
} else {
	CURRENTCOURSE = Math.floor(Math.random() * COURSES.length);
}

const CURRENTLANG = localStorage.getItem("CURRENTLANG") || 'us';

let MAX_LAP = parseInt(localStorage.getItem("CURRENTLAPTYPE"))
MAX_LAP = [3, 5].includes(MAX_LAP) ? MAX_LAP : 3;

const CONTROLTYPE = (localStorage.getItem("CONTROLTYPE") || 'cpu').toUpperCase();
let USER_CONTROLLER;
switch (CONTROLTYPE) {
	case 'MAN':
		USER_CONTROLLER=getPlayerControls();
		break;
	case 'CPU':
	default:
		USER_CONTROLLER=controlRaceCPU
		break;
}


export const MKDSCONST = {
	DAMAGE_SPIN,
	DAMAGE_FLIP,
	DAMAGE_EXPLODE,
	COURSEDIR,
	COURSES,
	CURRENTCOURSE,
	CURRENTLANG,
	MAX_LAP,
	CONTROLTYPE,
	USER_CONTROLLER
}