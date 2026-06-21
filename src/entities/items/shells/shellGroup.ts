import { nitroAudioSound, nitroAudio } from "../../../audio/nitroAudio";
import { Item } from "../../item";


class ShellGroup implements KartItemEntity {
	canBeHeld: boolean;
	canBeDropped: boolean;
	rotationPeriod: number;
	item: Item;
	scene: Scene;
	type: string;
	children: (Item | null)[];
	itemCount: number;
	phase: number;
	spinDist: number;
	remaining: number;
	sound: nitroAudioSound | null;
	isDestructive!: boolean;
	isSolid!: boolean;
	constructor(item: Item, scene: Scene, type: string, itemType: string) {
		this.canBeHeld = true;
		this.canBeDropped = true;
		this.rotationPeriod = 45;
		this.item = item;
		this.scene = scene;
		this.type = type;
		this.item.colRadius = -Infinity;
		this.children = [];
		this.itemCount = 3;

		if (this.type.length > 0) {
			let typeParse = this.type.split("-");
			if (typeParse.length == 1) {
				itemType = this.type;
			} else if (typeParse.length == 2 && !isNaN(+typeParse[1])) {
				itemType = typeParse[0];
				this.itemCount = +typeParse[1];
			}
		}

		this.phase = 0;
		this.spinDist = 6;

		this.remaining = this.itemCount;
		this.item.holdPos = [0, 0, 0];
		//create children
		for (let i = 0; i < this.itemCount; i++) {
			let sub = this.scene.items.createItem(itemType, this.item.owner);
			sub.holdTime = 7;
			this.children.push(sub);
		}
		nitroAudio.playSound(231, { volume: 2 }, 0, this.item);
		this.sound = nitroAudio.playSound(227, { volume: 1.5 }, 0, this.item);
	}

	onDie(_final: boolean) {
		if (this.sound) {
			nitroAudio.instaKill(this.sound);
			this.sound = null;
		}
	}

	update(_scene: Scene) {
		for (let i = 0; i < this.children.length; i++) {
			let child = this.children[i];
			if (child == null) continue;
			if (child.deadTimer > 0) {
				this.children[i] = null;
				this.remaining--;
				continue;
			}
			let angle = (i / this.itemCount + this.phase / this.rotationPeriod) * Math.PI * 2;
			let rad = this.item.owner.params.colRadius;
			let dist = this.spinDist + rad;
			child.holdPos = [-Math.sin(angle) * dist, -this.item.owner.params.colRadius, Math.cos(angle) * dist];
		}
		this.phase++;
		this.phase %= this.rotationPeriod;
	}

	release(forward: 1 | -1) {
		//forward the release to our last child
		let toUse: Item | null = null;

		for (let i = 0; i < this.children.length; i++) {
			let child = this.children[i];
			if (child == null) continue;
			if (child.deadTimer > 0) {
				this.children[i] = null;
				this.remaining--;
				continue;
			}
			toUse = child;
			this.children[i] = null;
			this.remaining--;
			break;
		}

		if (toUse != null) {
			toUse.release(forward);
		}
		if (this.remaining == 0) {
			this.item.finalize();
		}
	}

	draw(_mvMatrix: mat4, _pMatrix: mat4) {
		//the group itself is invisible - the shells draw individually
	}
}

export class GreenShellGroup extends ShellGroup {
	constructor(item: Item, scene: Scene, type: string) {
		super(item, scene, type, "koura_g")
	}
}

export class RedShellGroup extends ShellGroup {
	constructor(item: Item, scene: Scene, type: string) {
		super(item, scene, type, "koura_r")
	}
}
