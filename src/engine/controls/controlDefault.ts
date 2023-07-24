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
	kart: Kart;

	constructor() {
		this.local = true;
		this.kart = null;
	}

	setKart(k: Kart) {
		this.kart = k;
	}

	fetchInput() {
		const left = (window as any).keysArray[37] ? 1 : 0;
		const right = (window as any).keysArray[39] ? 1 : 0;
		const up = (window as any).keysArray[38] ? 1 : 0;
		const down = (window as any).keysArray[40] ? 1 : 0;

		return {
			accel: !!(window as any).keysArray[88], //x
			decel: !!(window as any).keysArray[90], //z
			drift: !!(window as any).keysArray[83], //s
			item: !!(window as any).keysArray[65], //a

			//-1 to 1, intensity.
			turn: right - left,
			airTurn: up - down //air excitebike turn, item fire direction
		};
	}

}

