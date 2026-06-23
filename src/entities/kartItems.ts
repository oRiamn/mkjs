//item state for a kart. not an entity, just supplemental to one.

import { nitroAudio, nitroAudioSound } from "../audio/nitroAudio";
import { Item } from "./item";
import { Kart } from "./kart";

export class KartItems {
	static items = [
		"koura_g",
		"koura_r",
		"banana",
		"f_box",
		"bomb",
		"koura_group_g",
		"koura_group_r",
		// 'koura_group-bomb-7' bug (too many bomb)
	];
	kart: Kart;
	scene: Scene;
	heldItem: Item | null;
	currentItem: string | null;
	empty: boolean;
	cycleTime: number;
	totalTime: number;
	private _maxItemTime: number;
	private _minItemTime: number;
	private _carouselSfx: nitroAudioSound | null;
	private _lastItemState: boolean;
	private _specialItems: string[];
	private _itemButtonHoldFrames: number;
	private _itemJustEquipped: boolean;
	private _itemReleaseDebounce: number;
	private static readonly ITEM_PRESS_DEBOUNCE = 12;
	private static readonly ITEM_RELEASE_DEBOUNCE = 12;

	constructor(kart: Kart, scene: Scene) {
		this.kart = kart;
		this.scene = scene;

		this.heldItem = null; //held item, or item that is bound to us. (bound items have hold type 'func', eg. triple shell)
		this.currentItem = null; //string name for item
		this.empty = true;
		this.cycleTime = 0;
		this.totalTime = 230;

		this._maxItemTime = 230;
		this._minItemTime = 80;
		this._carouselSfx = null;
		this._lastItemState = false;
		this._specialItems = ["star"];
		this._itemButtonHoldFrames = 0;
		this._itemJustEquipped = false;
		this._itemReleaseDebounce = 0;

		// var holdAppearDelay = 15;
		// var hurtExplodeDelay = 105; //turn right slightly, huge double backflip, small bounces.
		// var hurtFlipDelay = 80; //turn right slightly, bounce twice, forward flip
		// var hurtSpinDelay = 40; //counter clockwise spin
	}

	static randomItem(): string {
		const i = Math.floor(Math.random() * KartItems.items.length);
		return KartItems.items[i];
	}

	update(input: InputData) {
		let pressed = input.item && !this._lastItemState;
		const released = this._lastItemState && !input.item;
		if (pressed) {
			this._itemButtonHoldFrames = 0;
		} else if (input.item) {
			this._itemButtonHoldFrames++;
		}
		if (this._itemReleaseDebounce > 0) this._itemReleaseDebounce--;
		if (!this.empty) {
			if (this.currentItem == null) {
				//carousel
				this.cycleTime++;
				if (this.cycleTime >= this.totalTime) {
					if (this._carouselSfx != null) {
						nitroAudio.kill(this._carouselSfx);
					}
					//decide on an item
					const item = KartItems.randomItem();

					if (this.kart.local) {
						console.log(item);
					}

					this._sfx(this._specialItems.indexOf(item) == -1 ? 63 : 64);
					this.currentItem = item;
				} else {
					//if item button is pressed, we speed up the carousel
					if (pressed && this.heldItem == null) {
						this.totalTime = Math.max(this._minItemTime, this.totalTime - 20);
					}
				}
			} else if (this.heldItem == null) {
				if (pressed) {
					//fire?
					this.heldItem = this._createItem();
					console.log(`${this.currentItem} drop`);
					this.currentItem = null;
					this.empty = true;

					if (this.heldItem.canBeHeld()) {
						this._itemJustEquipped = true;
					} else {
						this._release(input);
					}
					pressed = false;
				}
			}
		}

		//todo: if held item has been destroyed, stop holding it.

		if (this.heldItem != null) {
			if (this.heldItem.dead) {
				this.heldItem = null;
				this._itemJustEquipped = false;
			} else if (released && this.heldItem.canBeHeld()) {
				if (this._itemReleaseDebounce <= 0) {
					const shortPress = this._itemButtonHoldFrames < KartItems.ITEM_PRESS_DEBOUNCE;
					const onlyHeldShortEquip = shortPress && this._itemJustEquipped && this.heldItem.onlyHeld();
					if (shortPress && !onlyHeldShortEquip) {
						this._release(input);
						this._itemReleaseDebounce = KartItems.ITEM_RELEASE_DEBOUNCE;
					}
				}
				this._itemJustEquipped = false;
			}
		}
		this._lastItemState = input.item;
	}

	getItem(_specific: string | null): boolean {
		if (!this.empty) {
			return false;
		} else {
			//begin carousel
			this.cycleTime = 0;
			this.totalTime = this._maxItemTime;
			// if (specific) {
			// 	this.specificItem = specific;
			// }
			this.empty = false;
			this._carouselSfx = this._sfx(62);
			return true;
		}
	}

	private _sfx(id: number): nitroAudioSound | null {
		if (this.kart.local) {
			return nitroAudio.playSound(id, { volume: 2 }, 0, null);
		}
		return null;
	}

	private _createItem(): Item {
		let item = this.scene.items.createItem(this.currentItem!, this.kart);
		return item;
	}

	private _release(input: InputData): void {
		if (this.heldItem != null) {
			const hasMore = this.heldItem.release(input.airTurn);
			if (!hasMore || this.heldItem.dead) {
				this.heldItem = null;
			}
		}
		this.kart.playCharacterSound(7);
	}
}
