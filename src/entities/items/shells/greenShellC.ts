import { nitroAudioSound, nitroAudio } from "../../../audio/nitroAudio";
import { MKDS_COLTYPE } from "../../../engine/collisionTypes";
import { MKDSCONST } from "../../../engine/mkdsConst";
import { Item } from "../../item";

import { Kart } from "../../kart";

export class GreenShellC  implements KartItemEntity {
	isSolid: boolean;
    item: Item;
    minimumMove: number;
    canBeHeld: boolean;
    canBeDropped: boolean;
    isDestructive: boolean;
    angle: number;
    speed: number;
    sound: nitroAudioSound;
    soundCooldown: number;
    gravity: vec3;
	constructor(item: Item, _scene: Scene, _type: string) {
		this.item = item;
		this.minimumMove = 0.17;
		this.canBeHeld = true;
		this.canBeDropped = true;
		this.isDestructive = true;
		this.angle = 0;
		this.speed = 6; //base speed + kart speed
		this.sound = null;
		this.soundCooldown = 0;
		this.item.colRadius = 3;
		this.gravity = [0, -0.17, 0]; //100% confirmed by me messing around with the gravity value in mkds
	}


	release(forward: number) {
		this.sound = nitroAudio.playSound(215, { volume: 1.5 }, 0, this.item);
		this.speed = 6;
		this.angle = this.item.owner.physicalDir;
		if (forward < 0) {
			this.angle += Math.PI;
			this.angle %= Math.PI * 2;
		} else {
			this.speed += this.item.owner.speed;
		}
	}

	onDie(final: boolean) {
		if (!final) {
			nitroAudio.playSound(214, { volume: 2 }, 0, this.item);
		}
		if (this.sound) {
			nitroAudio.instaKill(this.sound);
			this.sound = null;
		}
	}

	collideKart(kart: Kart ) {
		this.item.deadTimer = 1;
		kart.damage(MKDSCONST.DAMAGE_FLIP);
	}

	update(_scene: Scene) {
		this.item.vel = [Math.sin(this.angle) * this.speed, this.item.vel[1], -Math.cos(this.angle) * this.speed]
		vec3.add(this.item.vel, this.item.vel, this.gravity);
		if (this.soundCooldown > 0) this.soundCooldown--;
	}

	colResponse(pos: vec3, pvel: vec3, dat: lscraycast , ignoreList: any[]) {
		var plane = dat.plane;
		var colType = (plane.CollisionType >> 8) & 31;
		vec3.add(pos, pos, vec3.scale(vec3.create(), pvel, dat.t));

		var n = dat.normal;
		vec3.normalize(n, n);
		var gravS = Math.sqrt(vec3.dot(this.gravity, this.gravity));
		var angle = Math.acos(vec3.dot(vec3.scale(vec3.create(), this.gravity, -1 / gravS), n));
		var adjustPos = true

		if (MKDS_COLTYPE.GROUP_WALL.indexOf(colType) != -1) { //wall
			//shell reflection code - slide y vel across plane, bounce on xz
			if (this.soundCooldown <= 0) {
				nitroAudio.playSound(213, { volume: 2.5 }, 0, this.item);
				this.soundCooldown = 30;
			}
			vec3.add(this.item.vel, vec3.scale(vec3.create(), n, -2 * (vec3.dot(this.item.vel, n) / vec3.dot(n, n))), this.item.vel);
			this.item.vel[1] = 0;

			var v = this.item.vel;
			this.angle = Math.atan2(v[0], -v[2]);
		} else if (colType == MKDS_COLTYPE.OOB || colType == MKDS_COLTYPE.FALL) {
			if (this.item.deadTimer == 0) this.item.deadTimer++;
		} else if (MKDS_COLTYPE.GROUP_ROAD.indexOf(colType) != -1) {
			//sliding plane
			var proj = vec3.dot(this.item.vel, n);
			vec3.sub(this.item.vel, this.item.vel, vec3.scale(vec3.create(), n, proj));
			this.item.stuckTo = dat.object;
		} else {
			adjustPos = false;
			ignoreList.push(plane);
		}

		var rVelMag = Math.sqrt(vec3.dot(this.item.vel, this.item.vel));
		vec3.scale(this.item.vel, this.item.vel, this.speed / rVelMag); //force speed to shell speed for green shells.

		if (adjustPos) { //move back from plane slightly
			vec3.add(pos, pos, vec3.scale(vec3.create(), n, this.minimumMove));
		}

	}
}