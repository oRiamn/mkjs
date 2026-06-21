import { Kart } from "../../entities/kart";
import { getZoneById, MOBILE_REF_HEIGHT, MOBILE_REF_WIDTH } from "../../ui/mobileControlLayout";

type MKJSTouch = {
	id: number;
	x: number;
	y: number;
	pressed: boolean;
	released: boolean;
	lastx: number;
	lasty: number;
};

type MKJSTouchInput = {
	touch: MKJSTouch;
	enterLeave: number;
	active: boolean;
};

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
		const accelZone = getZoneById("accel").rect;
		const driftZone = getZoneById("drift").rect;
		const itemZone = getZoneById("item").rect;
		const steerZone = getZoneById("steer").rect;

		let search = this.searchForTouch(accelZone);
		const reverse = search != null && search.active;

		let driftTouch = this.searchForTouch(driftZone);
		let itemTouch = this.searchForTouch(itemZone);
		let dPadTouch = this.searchForTouch(steerZone);

		let turn = 0;
		if (dPadTouch != null && dPadTouch.active) {
			turn = this.step(0 / MOBILE_REF_WIDTH, 400 / MOBILE_REF_WIDTH, dPadTouch.touch.x);
			turn = Math.floor(turn * 3) - 1;
		}

		let itemDir = 0;
		if (!this.item) {
			if (itemTouch != null && itemTouch.active && itemTouch.touch.pressed) {
				this.item = true;
			}
		} else {
			if (dPadTouch == null || !dPadTouch.active) {
				if (dPadTouch != null) {
					let vel = dPadTouch.touch.lasty - dPadTouch.touch.y;
					if (vel > 2 / MOBILE_REF_HEIGHT) itemDir = -1;
					if (vel < -2 / MOBILE_REF_HEIGHT) itemDir = 1;
				}
				this.item = false;
			}
		}

		return {
			accel: !reverse,
			decel: reverse,
			drift: driftTouch != null && driftTouch.active,
			item: this.item,
			turn: turn,
			airTurn: itemDir,
		};
	}
}
