import { nitroAudio, nitroAudioSound } from "../../../audio/nitroAudio";
import { SoundBox } from "../../../audio/soundBox";
import { Item } from "../../item";

abstract class ShellGroup implements KartItemEntity {
	canBeHeld: boolean;
	canBeDropped: boolean;
	rotationPeriod: number;
	item: Item;
	scene: Scene;
	type: string;
	children: (Item | null)[];
	phase: number;
	spinDist: number;
	sound: nitroAudioSound | null;
	isDestructive!: boolean;
	isSolid!: boolean;

	constructor(item: Item, scene: Scene, type: string) {
		this.canBeHeld = true;
		this.canBeDropped = true;
		this.rotationPeriod = 45;
		this.item = item;
		this.scene = scene;
		this.type = type;
		this.item.colRadius = -Infinity;
		this.children = [];

		this.phase = 0;
		this.spinDist = 6;
		this.item.holdPos = [0, 0, 0];
		//create children
		this.children = Array.from({ length: 3 }).map(() => {
			const sub = this.scene.items.createItem(this.type, this.item.owner);
			sub.holdTime = 7;
			sub.groupItem = this.item;
			return sub;
		});

		SoundBox.shellGroupEquip(this.item);
		this.sound = SoundBox.shellGroupFly(this.item);
	}

	onlyHeld() {
		return true;
	}

	onDie(_final: boolean) {
		if (this.sound) {
			nitroAudio.instaKill(this.sound);
			this.sound = null;
		}
	}

	update(_scene: Scene) {
		const children = this.children.filter((child): child is Item => child != null && child.deadTimer <= 0);

		if (children.length <= 0) {
			if (!this.item.dead) {
				this.item.finalize();
			}
			return;
		}

		let slot = 0;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			const angle = (slot / children.length + this.phase / this.rotationPeriod) * Math.PI * 2;
			slot++;
			const rad = this.item.owner.params.colRadius;
			const dist = this.spinDist + rad;
			child.holdPos = [-Math.sin(angle) * dist, -this.item.owner.params.colRadius, Math.cos(angle) * dist];
		}
		this.phase++;
		this.phase %= this.rotationPeriod;
		this.children = children;
	}

	release(forward: 1 | -1): boolean {
		const toUse: Item | null | undefined = this.children.pop();
		if (toUse && toUse != null) {
			toUse.release(forward);
		}

		const hasMore = this.children.length > 0;
		if (!hasMore) {
			this.item.finalize();
		}
		return hasMore;
	}

	draw(_mvMatrix: mat4, _pMatrix: mat4) {
		//the group itself is invisible - the shells draw individually
	}
}

export class GreenShellGroup extends ShellGroup {
	constructor(item: Item, scene: Scene) {
		super(item, scene, "koura_g");
	}
}

export class RedShellGroup extends ShellGroup {
	constructor(item: Item, scene: Scene) {
		super(item, scene, "koura_r");
	}
}
