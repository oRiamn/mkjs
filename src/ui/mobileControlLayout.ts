export const MOBILE_REF_WIDTH = 1136;
export const MOBILE_REF_HEIGHT = 640;

export type MobileControlId = "steer" | "item" | "drift" | "accel";

export type MobileControlZone = {
	id: MobileControlId;
	label: string;
	rect: [number, number, number, number];
};

/** Left column: item stacked above steer (zones must not overlap). */
const STEER_LEFT = 0 / MOBILE_REF_WIDTH;
const STEER_RIGHT = 400 / MOBILE_REF_WIDTH;
const STEER_TOP = 488 / MOBILE_REF_HEIGHT;
const STEER_BOTTOM = 640 / MOBILE_REF_HEIGHT;

const ITEM_LEFT = 50 / MOBILE_REF_WIDTH;
const ITEM_RIGHT = (50 + 300) / MOBILE_REF_WIDTH;
const ITEM_TOP = 390 / MOBILE_REF_HEIGHT;
const ITEM_BOTTOM = 478 / MOBILE_REF_HEIGHT;

export const MOBILE_CONTROL_ZONES: MobileControlZone[] = [
	{ id: "item", label: "Item", rect: [ITEM_LEFT, ITEM_TOP, ITEM_RIGHT, ITEM_BOTTOM] },
	{ id: "steer", label: "← →", rect: [STEER_LEFT, STEER_TOP, STEER_RIGHT, STEER_BOTTOM] },
	{
		id: "drift",
		label: "Drift",
		rect: [780 / MOBILE_REF_WIDTH, 468 / MOBILE_REF_HEIGHT, (780 + 300) / MOBILE_REF_WIDTH, (468 + 125) / MOBILE_REF_HEIGHT],
	},
	{
		id: "accel",
		label: "A",
		rect: [955 / MOBILE_REF_WIDTH, 320 / MOBILE_REF_HEIGHT, (955 + 125) / MOBILE_REF_WIDTH, (320 + 125) / MOBILE_REF_HEIGHT],
	},
];

type TouchLike = { x: number; y: number; released: boolean; lastx: number; lasty: number; pressed: boolean };

type TouchHit = { touch: TouchLike; active: boolean };

function searchForTouch(touches: TouchLike[], rect: [number, number, number, number]): TouchHit | null {
	for (let i = 0; i < touches.length; i++) {
		const touch = touches[i];
		const inNow = touch.x > rect[0] && touch.y > rect[1] && touch.x < rect[2] && touch.y < rect[3];
		const inBefore = touch.lastx > rect[0] && touch.lasty > rect[1] && touch.lastx < rect[2] && touch.lasty < rect[3];
		const active = inNow && !touch.released;

		if ((inNow && inBefore) || inNow || inBefore) {
			return { touch, active };
		}
	}
	return null;
}

function step(start: number, end: number, value: number): number {
	return Math.max(0, Math.min(1, (value - start) / (end - start)));
}

export type MobileControlVisualState = {
	steer: -1 | 0 | 1;
	item: boolean;
	drift: boolean;
	accel: boolean;
	reverse: boolean;
};

export function getMobileControlVisualState(touches: TouchLike[]): MobileControlVisualState {
	const accelZone = MOBILE_CONTROL_ZONES.find((z) => z.id === "accel")!.rect;
	const driftZone = MOBILE_CONTROL_ZONES.find((z) => z.id === "drift")!.rect;
	const itemZone = MOBILE_CONTROL_ZONES.find((z) => z.id === "item")!.rect;
	const steerZone = MOBILE_CONTROL_ZONES.find((z) => z.id === "steer")!.rect;

	const accelTouch = searchForTouch(touches, accelZone);
	const driftTouch = searchForTouch(touches, driftZone);
	const itemTouch = searchForTouch(touches, itemZone);
	const steerTouch = searchForTouch(touches, steerZone);

	let steer: -1 | 0 | 1 = 0;
	if (steerTouch != null && steerTouch.active) {
		const turn = step(0 / MOBILE_REF_WIDTH, 400 / MOBILE_REF_WIDTH, steerTouch.touch.x);
		steer = (Math.floor(turn * 3) - 1) as -1 | 0 | 1;
	}

	return {
		steer,
		item: itemTouch != null && itemTouch.active,
		drift: driftTouch != null && driftTouch.active,
		accel: accelTouch != null && accelTouch.active,
		reverse: accelTouch != null && accelTouch.active,
	};
}

export function getZoneById(id: MobileControlId): MobileControlZone {
	return MOBILE_CONTROL_ZONES.find((z) => z.id === id)!;
}
