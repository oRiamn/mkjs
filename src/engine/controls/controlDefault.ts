//
// controlDefault.js
//--------------------
// Provides default (keyboard) controls for kart. In future there will be an AI controller and default will support gamepad.
// by RHY3756547
//
// includes: main.js
//

import { Kart } from "../../entities/kart";
export class controlDefault implements Controls {
	local: boolean;
	kart!: Kart;

	constructor() {
		this.local = true;
	}

	setKart(k: Kart) {
		this.kart = k;
	}

	fetchInput(): InputData {
		const left = window.keysArray[37] ? 1 : 0;
		const right = window.keysArray[39] ? 1 : 0;
		const up = window.keysArray[38] ? 1 : 0;
		const down = window.keysArray[40] ? 1 : 0;

		return {
			accel: !!window.keysArray[88], //x
			decel: !!window.keysArray[90], //z
			drift: !!window.keysArray[83], //s
			item: !!window.keysArray[65], //a

			//-1 to 1, intensity.
			turn: right - left,
			airTurn: up - down, //air excitebike turn, item fire direction
		};
	}
}
