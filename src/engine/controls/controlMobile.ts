type MKJSTouch = {
	id: number;
	x: number; // (0-1),
	y: number; // (0-1),
	pressed: boolean;
	released: boolean;
	lastx: number; //(0-1),
	lasty: number; //(0-1)
};

type MKJSTouchInput = {
	touch: MKJSTouch;
	enterLeave: number;
	active: boolean;
};

import { Kart } from "../../entities/kart";

export class controlMobile implements Controls {
	local: boolean;
	item: boolean;
	kart!: Kart;

	constructor() {
		this.local = true;
		this.item = false;
	}

	setKart(k: Kart) {
		this.kart = k;
	}

	private searchForTouch(rect: [number, number, number, number]): MKJSTouchInput | null {
		//{touch: Touch, enterLeave: number} 1 is enter, leave is 2,
		const touches = window.touches;
		for (let i = 0; i < touches.length; i++) {
			let touch = touches[i];
			let inNow = touch.x > rect[0] && touch.y > rect[1] && touch.x < rect[2] && touch.y < rect[3];
			let inBefore = touch.lastx > rect[0] && touch.lasty > rect[1] && touch.lastx < rect[2] && touch.lasty < rect[3];

			let active = inNow && !touch.released;

			if (inNow == inBefore && inNow) {
				return { touch: touch, enterLeave: 0, active: active };
			} else if (inNow) {
				return { touch: touch, enterLeave: 1, active: active };
			} else if (inBefore) {
				return { touch: touch, enterLeave: 2, active: active };
			}
		}
		return null;
	}

	private step(start: number, end: number, value: number): number {
		return Math.max(0, Math.min(1, (value - start) / (end - start)));
	}

	fetchInput(): InputData {
		let targW = 1136;
		let targH = 640;
		//window.touches array is filled by the game container
		//touches [{x:number (0-1), y:number (0-1), pressed:boolean, released:boolean, lastx:number (0-1), lasty:number (0-1)}]

		//accel unless reverse button is pressed
		let search = this.searchForTouch([955 / targW, 320 / targH, (955 + 125) / targW, (320 + 125) / targH]);
		const reverse = search != null && search.active;

		let driftTouch = this.searchForTouch([780 / targW, 468 / targH, (780 + 300) / targW, (468 + 125) / targH]); //drift button on the right
		let itemTouch = this.searchForTouch([50 / targW, 468 / targH, (50 + 300) / targW, (468 + 125) / targH]); //touch the button exactly
		let dPadTouch = this.searchForTouch([0 / targW, (468 - 50) / targH, (0 + 400) / targW, (468 + 225) / targH]); //allow for some space

		let turn = 0;
		if (dPadTouch != null && dPadTouch.active) {
			turn = this.step(0 / targW, 400 / targW, dPadTouch.touch.x);
			//digitize
			turn = Math.floor(turn * 3) - 1;
		}

		let itemDir = 0;
		if (!this.item) {
			//if we touch the dpad (more exact than direction), start pressing item
			if (itemTouch != null && itemTouch.active && itemTouch.touch.pressed) {
				this.item = true;
			}
		} else {
			//if we release dpad, fire the item
			if (dPadTouch == null || !dPadTouch.active) {
				if (dPadTouch != null) {
					//set direction based on flick direction or position
					let vel = dPadTouch.touch.lasty - dPadTouch.touch.y;
					if (vel > 2 / targH) itemDir = -1; //flicked down
					if (vel < -2 / targH) itemDir = 1; //flicked up
				}
				this.item = false;
			}
		}

		return {
			accel: !reverse, //x
			decel: reverse, //z
			drift: driftTouch != null && driftTouch.active, //s
			item: this.item, //a

			//-1 to 1, intensity.
			turn: turn,
			airTurn: itemDir, //air excitebike turn, item fire direction
		};
	}
}
