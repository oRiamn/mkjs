//
// controlNetwork.js
//--------------------
// Provides default (keyboard) controls for kart. In future there will be an AI controller and default will support gamepad.
// by RHY3756547
//
// includes: main.js
//

import { Kart } from "../../entities/kart";

export class controlNetwork implements Controls {
	kart: Kart;
	local: boolean;
	turn: number;
	airTurn: number;
	binput: number;

	constructor() {
		this.kart = null;

		this.local = false;
		this.turn = 0;
		this.airTurn = 0;
		this.binput = 0;
	}

	setKart(k: Kart) {
		this.kart = k;
	}
	fetchInput() {
		//local controllers generally just return input and handle items - the network controller restores kart data from the stream sent from the server. Obviously this data needs to be verified by the server...
		return {
			accel: !!(this.binput & 1), //x
			decel: !!(this.binput & 2), //z
			drift: !!(this.binput & 4), //s
			item: false,//keysArray[65], //a

			//-1 to 1, intensity.
			turn: this.turn,//(keysArray[37]?-1:0)+(keysArray[39]?1:0),
			airTurn: this.airTurn//(keysArray[40]?-1:0)+(keysArray[38]?1:0) //air excitebike turn, doesn't really have much function
		};
	}
}