//
// shell.js
//--------------------
// Entity type for any item. Specific item types in `/item` folder
// Has a default collision handler, but can pass control to the specific item code.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
// /formats/kcl.js

import { nitroAudio } from "../audio/nitroAudio";
import { MKDS_COLTYPE } from "../engine/collisionTypes";
import { items_IngameRes } from "../engine/ingameRes";
import { lsc } from "../engine/largeSphereCollider";
import { courseScene } from "../engine/scenes/courseScene";
import { nitroRender } from "../render/nitroRender";
import { BananaC } from "./items/droppable/bananaC";
import { BombC } from "./items/droppable/bombC";
import { FakeBoxC } from "./items/droppable/fakeBoxC";
import { GreenShellC } from "./items/shells/greenShellC";
import { RedShellC } from "./items/shells/redShellC";
import { GreenShellGroup, RedShellGroup } from "./items/shells/shellGroup";
import { Kart } from "./kart";

//
let itemTypes: { [x: string]: typeof KartItemEntity } = {
	//physics, holdable
	$koura_g: GreenShellC,
	$koura_r: RedShellC,
	$banana: BananaC,
	$bomb: BombC,
	$f_box: FakeBoxC,

	//groups
	$koura_group_g: GreenShellGroup,
	$koura_group_r: RedShellGroup,
	//'$banana_group': BananaGroupC,

	//one use items
	//'$kinoko': MushroomC,
	//'$kinoko_group': MushroomGroupC,
	//'$kinoko_p': QueenMushroomC,
	//'$star': StarC,
	//'$thunder': ThunderC,
	//'$gesso': BlooperC,
	//'$teresa': BooC,
	//'$killer': KillerC,
	//'$koura_w': BlueShellC
};

export class Item {
	private _minimumMove: number;
	private _scene: courseScene;
	private _owner: Kart;
	private _type: keyof items_IngameRes;
	private _id: number;
	id: number;
	pos: vec3;
	vel: vec3;
	gravity: vec3;
	minBounceVel: number;
	airResist: number;
	enablePhysics: boolean;
	floorBounce: number;
	held: boolean;
	type: keyof items_IngameRes;
	owner: Kart;
	holdTime: number;
	dead: boolean;
	angle: number;
	speed: number;
	yvel: number;
	xyScale: number[];
	colRadius: number;
	holdDist: number;
	safeKart: Kart | null;
	private _safeTimeMax: number;
	safeTime: number;
	stuckTo: lsc_taget | null;
	groundTime: number;
	private _deadTimerLength: number;
	private _throwVelocity: number;
	private _throwAngle: number;
	private _working: vec3;
	deadTimer: number;
	private _subtypeInd: number;
	controller: KartItemEntity;
	holdPos!: vec3;
	sprMat: mat4 | null;
	groupItem: Item | null;
	constructor(scene: courseScene, owner: Kart, type: keyof items_IngameRes, id: number) {
		this._minimumMove = 0.01;
		this._scene = scene;
		this._owner = owner;
		this._type = type;
		this._id = id;

		this.id = this._id;

		this.pos = vec3.transformMat4([0, 0, 0], [0, -this._owner.params.colRadius + 1, 16], this._owner.mat);
		this.vel = vec3.create();
		this.gravity = [0, -0.17, 0]; //100% confirmed by me messing around with the gravity value in mkds
		this.minBounceVel = 0.5;
		this.airResist = 0.99;
		this.enablePhysics = true;
		this.floorBounce = 0.5;
		this.held = true;
		this.type = this._type;
		this.owner = this._owner;
		this.holdTime = 20;
		this.dead = false;

		this.angle = this._owner.angle;
		this.speed = 10;
		this.yvel = 0;
		this.xyScale = [1, 1];

		this.colRadius = 4;
		this.holdDist = 2;
		this.safeKart = this._owner;
		this._safeTimeMax = 4;
		this.safeTime = this._safeTimeMax; //time the object needs to not be colliding with the source to start considering collisions with it
		this.stuckTo = null;

		this.groundTime = 0;

		this._deadTimerLength = 30;
		this._throwVelocity = 7; //xz velocity for throw. angle adds a y component
		this._throwAngle = (Math.PI / 10) * 2;
		this._working = vec3.create();
		this.deadTimer = 0; //animates death. goes to 20, then deletes for real. dead objects can't run update or otherwise
		this.sprMat = null;
		this.groupItem = null;

		//a controller makes this item what it is...
		// canBeHeld: boolean
		// canBeDropped: boolean | 'func'
		// isDestructive: boolean
		// update?: (scene: CourseScene) => void
		// draw?: (mvMatrix, pMatrix) => void     // OVERRIDES NORMAL DRAW FUNCTION!
		// release?: (direction: number) => boolean   //direction is 1 for forward, -1 for back. returns if the item has more uses
		// onRest?: (normal: vec3) => void   //when the object comes to a rest (first time, or after leaving the ground for a while)
		// onDie?: (final: boolean) => void   //when the object dies
		// collide?: (item: Item | Kart)
		// collideKart?: (item: Kart)
		this._subtypeInd = this._type.indexOf("-");
		if (this._subtypeInd == -1) {
			this._subtypeInd = this._type.length;
		}

		this.controller = new itemTypes[`$${this._type.substr(0, this._subtypeInd)}`](
			this,
			this._scene,
			this._type.substr(this._subtypeInd + 1)
		);

	
	}

	private updateHold(kart: Kart) {
		//move the object behind the kart (physical direction without drift off)
		//assuming this will only be called for something that can be held
		let dir = kart.driftOff / 4;

		//offset the kart's drift offset (on direction)
		let pos;
		if (this.holdPos != null) {
			pos = vec3.clone(this.holdPos);
		} else {
			let dist = this.colRadius + kart.params.colRadius + this.holdDist;
			pos = vec3.clone([Math.sin(dir) * dist, -kart.params.colRadius, -Math.cos(dir) * dist]);
		}

		//make relative to the kart's position
		vec3.transformMat4(pos, pos, kart.mat);

		vec3.sub(this.vel, pos, this.pos); //set the object's velocity to try move it to the hold location. (gravity is disabled)
		this.enablePhysics = true;
	}

	release(forward: number): boolean {
		//release the item, either forward or back
		this.holdTime = 0;
		if (this.canBeHeld()) {
			this.updateHold(this._owner);
			this._updateCollision(this._scene);
		}
		this.enablePhysics = true;
		let hasMore = false;
		if (this.controller.release) hasMore = this.controller.release(forward) ?? false;
		else {
			//default drop and throw. just here for template purposes
			if (forward > 0) {
				nitroAudio.playSound(218, { volume: 2 }, 0, this._owner);
				let dir = this._owner.driftOff / 4;

				//offset the kart's drift offset (on direction). add y component
				let vel = vec3.clone([
					-Math.sin(dir) * this._throwVelocity,
					Math.tan(this._throwAngle) * this._throwVelocity,
					Math.cos(dir) * this._throwVelocity,
				]);
				let z = vec3.clone([0, 0, 0]);

				//make relative to the kart's orientation
				vec3.transformMat4(vel, vel, this._owner.mat);
				vec3.transformMat4(z, z, this._owner.mat);
				vec3.sub(vel, vel, z);
				let v2 = vec3.scale([0, 0, 0], this._owner.vel, 2);
				vec3.add(vel, vel, v2);

				this.vel = vel;
			} else {
				this.vel = vec3.create();
				this.safeKart = null;
			}
		}
		this.held = false;
		return hasMore;
	}

	canBeHeld() {
		return this.controller.canBeHeld || false;
	}

	onlyHeld() {
		return this.controller.onlyHeld();
	}

	private canBeDropped() {
		if (this.controller.canBeDropped == null) return true;
		return this.controller.canBeDropped;
	}

	private isDestructive() {
		return this.controller.isDestructive || false;
	}

	private isSolid() {
		if (this.controller.isSolid == null) return true;
		return this.controller.isSolid;
	}

	finalize() {
		//kill instantly
		if (this.controller.onDie) this.controller.onDie(true);
		this.deadTimer = this._deadTimerLength;
		this._scene.items.removeItem(this);
		this.dead = true;
	}

	private _intensityMax(targ: vec3, vec: vec3) {
		if (Math.abs(vec[0]) > Math.abs(targ[0]) * 0.5) targ[0] = vec[0];
		if (Math.abs(vec[1]) > Math.abs(targ[1]) * 0.5) targ[1] = vec[1];
		if (Math.abs(vec[2]) > Math.abs(targ[2]) * 0.5) targ[2] = vec[2];
	}

	private collide(obj: Item | Kart) {
		if (this.controller.collide) {
			this.controller.collide(obj);
			return;
		}

		if (obj.hasOwnProperty("type")) {
			const item = <Item>obj;
			//has a type, definitely an item
			if (item.isDestructive() || this.isDestructive()) {
				//mutual destruction. other side will deal with how they handle the collision
				this.deadTimer++;
				item.deadTimer++;
			} else if (item.isSolid() && this.isSolid()) {
				//bounce off other items that are not destructive
				//set our velocity to move away (not too intensely)
				//(only apply if our id is before, to avoid double adding the velocity)
				if (this.id < item.id) {
					let diff = vec3.sub(this._working, this.pos, item.pos);
					vec3.scale(diff, diff, 0.33);
					this._intensityMax(this.vel, diff);
					vec3.scale(diff, diff, -1);
					this._intensityMax(item.vel, diff);
					//vec3.add(this.vel, this.vel, diff);
					//vec3.sub(item.vel, item.vel, diff);
					this.enablePhysics = true;
					item.enablePhysics = true;
				}
			}
		} else {
			const kart = <Kart>obj;
			//is a kart. usually this is where objects differ
			if (this.controller.collideKart) {
				this.controller.collideKart(kart);
			}
		}
	}

	update(scene: courseScene) {
		if (this.controller.update) this.controller.update(scene);
		if (this.holdTime > 0 && this.holdTime-- > 7) {
			if (this.holdTime == 7) {
				nitroAudio.playSound(231, { volume: 2 }, 0, this._owner);
			}
			return;
		}
		if (this.pos[2] < -10000) this.finalize(); //out of bounds failsafe

		if (this.deadTimer > 0) {
			if (this.deadTimer == 1 && this.controller.onDie) this.controller.onDie(false);
			this.deadTimer++;
			this.sprMat = mat4.create();
			mat4.translate(this.sprMat, this.sprMat, [this.deadTimer / 50, Math.sin((this.deadTimer / 30) * Math.PI) * 0.5, 0]);
			mat4.rotateZ(this.sprMat, this.sprMat, (this.deadTimer / -15) * Math.PI);
			if (this.deadTimer >= 30) this.finalize();
			return;
		}

		if (this.held) {
			this.updateHold(this._owner);
		}

		let hitSafe = false;
		//search for player collisions, collisions with other items
		for (let i = 0; i < scene.karts.length; i++) {
			let ok = scene.karts[i];

			let dist = vec3.dist(vec3.add(this._working, this.pos, [0, this.colRadius / 2, 0]), ok.pos);
			if (dist < this.colRadius + ok.params.colRadius) {
				//colliding with a kart.
				//do we need to do something?
				if (ok === this.safeKart) {
					hitSafe = true;
					continue;
				}
				this.collide(ok);
			}
		}

		if (this.safeKart && !hitSafe && !this.held) {
			this.safeTime--;
			if (this.safeTime <= 0) {
				this.safeKart = null;
			}
		}

		if (this.holdTime == 0) {
			//avoid mutual item destruction on the first frame
			for (let i = 0; i < scene.items.items.length; i++) {
				let ot = scene.items.items[i];
				if (ot == this || (this.held && ot.held)) continue;
				if (this.groupItem != null && this.groupItem === ot.groupItem) continue;
				let dist = vec3.dist(this.pos, ot.pos);
				if (dist < this.colRadius + ot.colRadius && ot.holdTime <= 7 && ot.deadTimer == 0) {
					//two items are colliding.
					this.collide(ot);
				}
			}
		}

		if (this.groundTime > 0) this.groundTime++;

		if (this.stuckTo && this.stuckTo !== null) {
			if (this.stuckTo.moveWith != null) {
				this.stuckTo.moveWith(this);
			}
			this.enablePhysics = true;
			this.stuckTo = null;
		}

		if (this.enablePhysics) {
			this._updateCollision(scene);
		}
	}

	private _updateCollision(scene: courseScene) {
		if (!this.held) {
			vec3.add(this.vel, this.vel, this.gravity);
			vec3.scale(this.vel, this.vel, this.airResist);
		}

		//by default, items use raycast collision against the world (rather than ellipse)
		//this speeds things up considerably

		let steps = 0;
		let remainingT = 1;
		let velSeg = vec3.clone(this.vel);
		let posSeg = vec3.clone(this.pos);
		let ignoreList: lsc_collision_triangle[] = [];
		while (steps++ < 10 && remainingT > 0.01) {
			let result = lsc.raycast(posSeg, velSeg, scene, 0.05, ignoreList);
			if (result != null) {
				if (this.controller.colResponse && !this.held) this.controller.colResponse(posSeg, velSeg, result, ignoreList);
				else this._colResponse(posSeg, velSeg, result, ignoreList);
				remainingT -= result.t;
				if (remainingT > 0.01) {
					velSeg = vec3.scale(velSeg, this.vel, remainingT);
				}
			} else {
				vec3.add(posSeg, posSeg, velSeg);
				remainingT = 0;
			}
		}
		this.pos = posSeg;
	}

	draw(mvMatrix: mat4, pMatrix: mat4) {
		if (this.holdTime > 7) return;
		if (this.deadTimer > 0) nitroRender.setColMult([1, 1, 1, 1 - this.deadTimer / this._deadTimerLength]); //fade out
		if (this.controller.draw) {
			this.controller.draw(mvMatrix, pMatrix);
		} else {
			let mat = mat4.translate(mat4.create(), mvMatrix, vec3.add(vec3.create(), this.pos, [0, this.colRadius * this.xyScale[1], 0]));

			this._spritify(mat);
			let scale = 6 * this.colRadius * (1 - this.holdTime / 7);
			mat4.scale(mat, mat, [scale, scale, scale]);

			let mdl = this._scene.gameRes.items[this._type]; // mdl == nitromodel
			//apply our custom mat (in sprite space), if it exists
			//used for destruction animation, scaling
			if (this.sprMat) {
				// sometime baseMat is undefined
				let oldMat = mdl.baseMat;
				mdl.setBaseMat(this.sprMat);
				mdl.draw(mat, pMatrix);
				mdl.setBaseMat(oldMat);
			} else {
				mdl.draw(mat, pMatrix);
			}
		}
		if (this.deadTimer > 0) nitroRender.setColMult([1, 1, 1, 1]);
	}

	private _spritify(mat: mat4) {
		let scale = Math.sqrt(mat[0] * mat[0] + mat[1] * mat[1] + mat[2] * mat[2]);

		mat[0] = scale;
		mat[1] = 0;
		mat[2] = 0;
		mat[4] = 0;
		mat[5] = scale;
		mat[6] = 0;
		mat[8] = 0;
		mat[9] = 0;
		mat[10] = scale;
	}

	private _colResponse(pos: vec3, pvel: vec3, dat: lscraycast, ignoreList: lsc_collision_triangle[]) {
		let plane = dat.plane;
		const collisionType = plane.CollisionType ?? 0;
		let colType = (collisionType >> 8) & 31;
		vec3.add(pos, pos, vec3.scale(vec3.create(), pvel, dat.t));

		let n = dat.normal;
		vec3.normalize(n, n);
		let adjustPos = true;

		if (MKDS_COLTYPE.GROUP_WALL.indexOf(colType) != -1) {
			//wall
			//normally, item collision with a wall cause a perfect reflection of the velocity.
			let proj = vec3.dot(this.vel, n) * 2;
			vec3.sub(this.vel, this.vel, vec3.scale(vec3.create(), n, proj));
			this.safeKart = null;
		} else if (colType == MKDS_COLTYPE.OOB || colType == MKDS_COLTYPE.FALL) {
			if (this.deadTimer == 0) this.deadTimer++;
		} else if (MKDS_COLTYPE.GROUP_ROAD.indexOf(colType) != -1) {
			//sliding plane
			let bounce = this.held ? 0 : this.floorBounce;
			let proj = vec3.dot(this.vel, n) * (1 + bounce);
			vec3.sub(this.vel, this.vel, vec3.scale(vec3.create(), n, proj));

			if (!this.held && (this.floorBounce == 0 || Math.abs(proj) < this.minBounceVel)) {
				this.vel[0] = 0;
				this.vel[1] = 0;
				this.vel[2] = 0;
				this.enablePhysics = false;
				if (this.groundTime == 0) {
					this.groundTime = 1;
					if (this.controller.onRest) {
						this.controller.onRest(n);
					}
				}
			}
			this.stuckTo = dat.object;
		} else {
			adjustPos = false;
			ignoreList.push(plane);
		}

		if (adjustPos) {
			//move back from plane slightly
			vec3.add(pos, pos, vec3.scale(vec3.create(), n, this._minimumMove));
		}
	}
}
