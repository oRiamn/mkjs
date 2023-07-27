//
// kart.js
//--------------------
// Entity type for karts.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
// /formats/kcl.js
//
import { nitroAudio } from "../audio/nitroAudio";
import { NitroEmitter } from "../particles/nitroEmitter";
import { nitroAnimator, nitroAnimator_matStack } from "../render/nitroAnimator";
import { KartItems } from "./kartItems";
import { nkm, nkm_section_CPOI, nkm_section_KTPJ, nkm_section_KTPS, nkm_section_MEPO } from "../formats/nkm";
import { kcl_plane } from "../formats/kcl";
import { MKDSCONST } from "../engine/mkdsConst";
import { MKDS_COLTYPE } from "../engine/collisionTypes";
import { IngameRes_character } from "../engine/ingameRes";
import { courseScene } from "../engine/scenes/courseScene";
import { lsc } from "../engine/largeSphereCollider";
type kart_sound = {
	hit?: number;
	land?: number; //sounds that can be simultaneous
	kart?: any;
	drift?: any;
	lastTerrain?: number;
	lastBE?: number;
	drive?: any;
	boost?: any;
	powerslide?: any;
	boostSoundTrig?: boolean; //true if a new boost sound can be played
	transpose?: number;
	lastPos?: vec3
	pos?: vec3;
	refDistance?: number;
	rolloffFactor?: number;
};


type kart_checkpoint = nkm_section_CPOI | nkm_section_MEPO & { respawn: 1 }

export class Kart {
	pos: vec3;
	angle: number;
	speed: number;
	controller: Controls;
	_scene: courseScene;
	_kartN: number;
	_charN: number;
	_minimumMove: number;
	_MAXSPEED: number;
	_BOOSTTIME: number;
	_kartSoundBase: number;
	_COLBOUNCE_TIME: number;
	_COLBOUNCE_STRENGTH: number;
	_params: any;
	_offsets: any;
	wheelClass: number;
	local: any;
	active: boolean;
	preboost: boolean;
	items: KartItems;
	soundProps: kart_sound;
	vel: vec3;
	weight: any;
	params: any;
	drifting: boolean;
	driftMode: number;
	driftLanded: boolean;
	driftPSTick: number;
	driftPSMode: number;
	kartTargetNormal: vec3;
	kartNormal: vec3;
	airTime: number;
	driftOff: number;
	physicalDir: number;
	mat: mat4;
	basis: mat4;
	ylock: number;
	cannon: number;
	gravity: vec3;
	damageTime: number;
	damageType: number;
	trackAttach: null;
	boostMT: number;
	boostNorm: number;
	kartColVel: vec3;
	kartColTimer: number;
	kartWallTimer: number;
	charSoundTimer: number;
	placement: number;
	lastPlacement: number;
	_charRes: IngameRes_character;
	_kartRes: any;
	_kartPolys: any[];
	_kObj: any;
	_tireRes: any;
	anim: nitroAnimator;
	charRes: IngameRes_character;
	animMode: string;
	driveAnimF: number;
	animFrame: number;
	animMat: nitroAnimator_matStack;
	lastInput: InputData;
	lapNumber: number;
	passedKTP2: boolean;
	checkPointNumber: number;
	OOB: number;
	wheelParticles: NitroEmitter[];
	_nkm: nkm;
	_startLine: nkm_section_KTPS;
	_passLine: nkm_section_KTPS;
	_respawns: nkm_section_KTPJ[];
	_checkpoints: kart_checkpoint[];

	_futureChecks: number[];
	_hitGroundAnim: number[];
	_charGroundAnim: number[];
	_lastCollided: number;
	_lastBE: number;
	_lastColSounds: kart_sound;
	_ylvel: number;
	_wheelTurn: number;
	_onGround: any;
	_kartAnim: number;
	_groundAnim: number;
	_stuckTo: lsc_taget;
	_updateMat: boolean;
	_drawMat: {
		kart: mat4;
		wheels: mat4[];
		character: mat4;
	};
	_soundMode: number;
	_sounds: kart_sound;
	lWheelParticle: null;
	specialControlHandler: boolean;

	damageMat: mat4;
	physBasis: {
		mat: mat4;
		inv: mat4;
		normal: any;
		time: number;
		loop: boolean;
	};
	profile: {
		name: string;
		emblem: HTMLCanvasElement;
		thumb: HTMLCanvasElement;
	};

	constructor(pos: vec3, angle: number, speed: number, kartN: number, charN: number, controller: Controls, scene: courseScene) {

		this.pos = pos;
		this.angle = angle;
		this.speed = speed;
		this.controller = controller;
		this._scene = scene;

		this._kartN = kartN;
		this._charN = charN;


		this._minimumMove = 0.05;
		this._MAXSPEED = 24;
		this._BOOSTTIME = 90;

		this._kartSoundBase = 170;

		this._COLBOUNCE_TIME = 20;
		this._COLBOUNCE_STRENGTH = 4;

		this._params = this._scene.gameRes.kartPhys.karts[this._kartN];
		this._offsets = this._scene.gameRes.kartOff.karts[this._kartN];
		this.wheelClass = (this._offsets.name[10] == "L") ? 2 : ((this._offsets.name[10] == "M") ? 1 : 0);

		this.local = this.controller.local;
		this.active = true;
		this.preboost = true;

		//supplimentary controllers
		this.items = new KartItems(this, this._scene);

		this.soundProps = {};

		this.vel = vec3.create();
		this.weight = this._params.weight;
		this.params = this._params;



		this.drifting = false;
		this.driftMode = 0; //1 left, 2 right, 0 undecided
		this.driftLanded = false; //if we haven't landed then apply a constant turn.

		//powerslide info: to advance to the next mode you need to hold the same button for 10 or more frames. Mode 0 starts facing drift direction, 1 is other way, 2 is returning (mini spark), 3 is other way, 4 is returning (turbo spark)
		this.driftPSTick = 0;
		this.driftPSMode = 0;

		this.kartTargetNormal = [0, 1, 0];
		this.kartNormal = [0, 1, 0];
		this.airTime = 0;


		this.driftOff = 0;
		this.physicalDir = this.angle;
		this.mat = mat4.create();
		this.basis = mat4.create();
		this.ylock = 0;

		this.cannon = null;

		this.gravity = [0, -0.17, 0]; //100% confirmed by me messing around with the gravity value in mkds. for sticky surface and loop should modify to face plane until in air

		//functions for external objects to trigger
		this.damageTime = 0;
		this.damageType = -1;

		this.trackAttach = null; //a normal for the kart to attach to (loop)
		this.boostMT = 0;
		this.boostNorm = 0;

		this.kartColVel = vec3.create();
		this.kartColTimer = 0;
		this.kartWallTimer = 0;
		this.charSoundTimer = 0;

		this.placement = 0; // place info

		this.lastPlacement = 0;

		this._charRes = this._scene.gameRes.getChar(this._charN);
		this._kartRes = this._scene.gameRes.getKart(this._kartN);
		this._kartPolys = [];
		
		this.profile = {
			name: this._scene.gameRes.charNames[this._charN],
			emblem: this._charRes.emblem.readTexWithPal(0, 0),
			thumb: this._scene.gameRes.playerThumb.toCanvas(true, this._charN),
		}

		this._kObj = this._kartRes.bmd.modelData.objectData[0];

		for (var i = 0; i < this._kObj.polys.objectData.length; i++) {
			if (this._kObj.materials.names[this._kObj.polys.objectData[i].mat] != "kart_tire") {
				this._kartPolys.push(i)
			}
		}

		this._tireRes = this._scene.gameRes.tireRes;

		this.anim = new nitroAnimator(this._charRes.model.bmd, this._charRes.driveA);
		this.charRes = this._charRes;
		this.animMode = "drive";
		this.driveAnimF = 14; //29 frames in total, 14 is mid
		this.animFrame = 0; //only used for non drive anim
		this.animMat = null;

		this.lastInput = null;

		//race statistics
		this.lapNumber = 1;
		this.passedKTP2 = false;
		this.checkPointNumber = 0;
		this.OOB = 0;

		this.wheelParticles = [
			new NitroEmitter(this._scene, this, -1, [1, 1.5, -1]),
			new NitroEmitter(this._scene, this, -1, [-1, 1.5, -1])
		];

		this._scene.particles.push(this.wheelParticles[0]);
		this._scene.particles.push(this.wheelParticles[1]);

		this._nkm = this._scene.nkm;
		this._startLine = this._nkm.sections["KTPS"].entries[0];
		this._passLine = this._nkm.sections["KTP2"].entries[0] || this._startLine;
		this._respawns = this._nkm.sections["KTPJ"].entries;
		this._checkpoints = this._nkm.sections["CPOI"].entries;

		if (this._checkpoints.length <= 0) { // mini_stages games
			this._checkpoints = this._nkm.sections["MEPO"].entries.map(
				e => ({ ...e, respawn: 1 })
			);
		}

		this._futureChecks = [1];

		this._hitGroundAnim = [ //length 13, on y axis
			1.070,
			1.130,
			1.170,
			1.190,
			1.2,
			1.190,
			1.170,
			1.130,
			1.070,
			1,
			0.950,
			0.920,
			0.950,
		]

		this._charGroundAnim = [ //length 13, on y axis
			1,
			1,
			1,
			1,
			1,
			1.080,
			1.140,
			1.180,
			1.140,
			1.060,
			0.970,
			0.960,
			0.980,
		]

		this._lastCollided = -1;
		this._lastBE = -1;
		this._lastColSounds = {};
		this._ylvel = 0;
		this._wheelTurn = 0;
		this._onGround;

		this._kartAnim = 0;
		this._groundAnim = -1;
		this._stuckTo = null;

		this._updateMat = true;

		this._drawMat = {
			kart: mat4.create(),
			wheels: [mat4.create(), mat4.create(), mat4.create(), mat4.create()],
			character: mat4.create()
		}

		this.controller.setKart(this);

		this._soundMode = -1;
		this._sounds = { //sounds that can be simultaneous
			kart: null,
			drift: null,
			lastTerrain: -1,
			lastBE: -1,
			drive: null,
			boost: null,
			powerslide: null,
			boostSoundTrig: true, //true if a new boost sound can be played
			transpose: 0
		}
		this._updateKartSound(0, {
			turn: 0,
			accel: false,
			decel: false,
			drift: false,
			item: false,
			airTurn: 0
		});

		this.lWheelParticle = null;
	}

	_recalcMat(view: mat4) {
		var mat = mat4.mul(mat4.create(), view, this.mat);
		var xscale = 1 + Math.cos((this._kartAnim / 4) * Math.PI) * 0.015;
		var yscale = 1 + Math.cos(((this._kartAnim + 4) / 4) * Math.PI) * 0.015;

		if (this._groundAnim != -1) yscale *= this._hitGroundAnim[this._groundAnim];

		mat4.translate(mat, mat, [0, -this._params.colRadius, 0]); //main part
		var kmat = mat4.scale(this._drawMat.kart, mat, [16 * xscale, 16 * yscale, 16]);

		//wheels
		for (var i = 0; i < 4; i++) {
			var scale = 16 * ((i < 2) ? this._offsets.frontTireSize : 1);
			var wmat = mat4.translate(this._drawMat.wheels[i], mat, [0, 0, 0]);

			if (this._groundAnim != -1) mat4.scale(wmat, wmat, [1, this._hitGroundAnim[this._groundAnim], 1]);

			mat4.translate(wmat, wmat, this._offsets.wheels[i]);
			mat4.scale(wmat, wmat, [scale, scale, scale]);
			if (i < 2) mat4.rotateY(wmat, wmat, ((this.driveAnimF - 14) / 14) * Math.PI / 6);
			mat4.rotateX(wmat, wmat, this._wheelTurn);

			if (i > 1) {
				this.wheelParticles[i - 2].offset = vec3.scale(this.wheelParticles[i - 2].offset, vec3.add(this.wheelParticles[i - 2].offset, this._offsets.wheels[i], [this.wheelClass * (i - 2.5) * -2, (-this._params.colRadius) - this.wheelClass * 2, 0]), 1 / 16);
			}
		}

		var scale = 16;
		var pos = vec3.clone(this._offsets.chars[this._charN]);

		if (this._groundAnim != -1) pos[1] *= this._charGroundAnim[this._groundAnim];

		var cmat = mat4.translate(this._drawMat.character, mat, vec3.scale([0, 0, 0], pos, 16))
		mat4.scale(cmat, cmat, [scale, scale, scale]);

		if (this.animMode == "drive") this.animMat = this.anim.setFrame(0, 0, this.driveAnimF);
		else this.animMat = this.anim.setFrame(0, 0, this.animFrame++);

		this._updateMat = false;
	}

	drawChar(view: mat4, pMatrix: mat4) {
		this._charRes.model.draw(this._drawMat.character, pMatrix, this.animMat);
	}

	drawKart(view: mat4, pMatrix: mat4, gl: CustomWebGLRenderingContext) {
		if (this._updateMat) this._recalcMat(view);
		//if we're in simple shadows mode, draw the kart's stencil shadow.

		if (false) {
			//gl.enable(gl.CULL_FACE); //culling is fun!
			gl.clear(gl.STENCIL_BUFFER_BIT);
			//gl.cullFace(gl.FRONT);
			gl.colorMask(false, false, false, false);
			gl.depthMask(false);

			gl.enable(gl.STENCIL_TEST);
			gl.stencilMask(0xFF);
			gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
			gl.stencilOp(gl.KEEP, gl.INCR, gl.KEEP);

			this._kartRes.shadVol.draw(this._drawMat.kart, pMatrix, simpleMatStack);

			gl.colorMask(true, true, true, true)
			//gl.cullFace(gl.BACK);
			gl.stencilFunc(gl.LESS, 0, 0xFF);
			gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

			this._kartRes.shadVol.draw(this._drawMat.kart, pMatrix, simpleMatStack);
			gl.disable(gl.STENCIL_TEST);
			//gl.disable(gl.CULL_FACE);
			gl.depthMask(true);

		}

		for (var i = 0; i < this._kartPolys.length; i++) {
			this._kartRes.drawPoly(this._drawMat.kart, pMatrix, 0, this._kartPolys[i], simpleMatStack);
		}
	}

	drawWheels(view: mat4, pMatrix: mat4) {
		if (this._updateMat) this._recalcMat(view);
		var wheelMod = this._tireRes[this._offsets.name];
		for (var i = 0; i < 4; i++) {
			wheelMod.draw(this._drawMat.wheels[i], pMatrix, simpleMatStack);
		}
	}

	draw(view: mat4, pMatrix: mat4) {
		this.drawWheels(view, pMatrix);
		this.drawKart(view, pMatrix, gl);
		this.drawChar(view, pMatrix);
	}

	update(scene: courseScene) {
		if (this.placement != this.lastPlacement) {
			if (this.placement < this.lastPlacement) {
				if (this.charSoundTimer == 0) {
					this.playCharacterSound(5);
					this.charSoundTimer = 60;
				}
			}
			this.lastPlacement = this.placement;
		}

		var lastPos = vec3.clone(this.pos);
		this._updateMat = true;

		if (this._groundAnim != -1) {
			if (++this._groundAnim >= this._hitGroundAnim.length) this._groundAnim = -1;
		}

		this._onGround = (this.airTime < 5);

		this._kartAnim = (this._kartAnim + 1) % 8;
		var input = this.controller.fetchInput();
		this.lastInput = input;
		this.items.update(input);

		if (input.turn > 0.3) {
			if (this.driveAnimF > 0) this.driveAnimF--;
		} else if (input.turn < -0.3) {
			if (this.driveAnimF < 28) this.driveAnimF++;
		} else {
			if (this.driveAnimF > 14) this.driveAnimF--;
			else if (this.driveAnimF < 14) this.driveAnimF++;
		}

		//update sounds
		var newSoundMode = this._soundMode;
		if (input.accel) {
			if (this._soundMode == 0 || this._soundMode == 6) newSoundMode = 2;
			if (this._soundMode == 4) newSoundMode = 3;
		} else {
			if (this._soundMode != 0) {
				if (this._soundMode == 2 || this._soundMode == 3) newSoundMode = 4;
				if (newSoundMode == 4 && this.speed < 0.5) newSoundMode = 0;
			}
		}

		if (this.boostMT + this.boostNorm > 0) {
			if (this.boostNorm == this._BOOSTTIME || this.boostMT == this._params.miniTurbo) {
				if (this._sounds.boostSoundTrig) {
					if (this._sounds.boost != null) nitroAudio.instaKill(this._sounds.boost);
					this._sounds.boost = nitroAudio.playSound(160, {}, 0, this);
					this._sounds.boost.gainN.gain.value = parseFloat("2");
					this._sounds.boostSoundTrig = false;
				}
			} else {
				this._sounds.boostSoundTrig = true;
			}
		} else if (this._sounds.boost != null) {
			nitroAudio.kill(this._sounds.boost);
			this._sounds.boost = null;
		}

		var isMoving = this._onGround && this.speed > 0.5;
		if (isMoving) {
			if (this._lastCollided != this._sounds.lastTerrain || this._lastBE != this._sounds.lastBE || this._sounds.drive == null) {
				if (this._sounds.drive != null) nitroAudio.kill(this._sounds.drive);
				if (this._lastColSounds.drive != null) {
					this._sounds.drive = nitroAudio.playSound(this._lastColSounds.drive, {}, 0, this);
					this._sounds.drive.gainN.gain.value = parseFloat("2");
				}
			}

			if (this.drifting && this.driftLanded) {
				if (this._lastCollided != this._sounds.lastTerrain || this._lastBE != this._sounds.lastBE || this._sounds.drift == null) {
					if (this._sounds.drift != null) nitroAudio.kill(this._sounds.drift);
					if (this._lastColSounds.drift != null) {
						this._sounds.drift = nitroAudio.playSound(this._lastColSounds.drift, {}, 0, this);
					}
				}
			} else if (this._sounds.drift != null) { nitroAudio.kill(this._sounds.drift); this._sounds.drift = null; }

			this._sounds.lastTerrain = this._lastCollided;
			this._sounds.lastBE = this._lastBE;
		} else {
			if (this._sounds.drift != null) { nitroAudio.kill(this._sounds.drift); this._sounds.drift = null; }
			if (this._sounds.drive != null) { nitroAudio.kill(this._sounds.drive); this._sounds.drive = null; }

		}
		this.wheelParticles[0].pause = !isMoving;
		this.wheelParticles[1].pause = !isMoving;

		//end sound update

		if (this.preboost) {

		} else if (this.cannon != null) { //when cannon is active, we fly forward at max move speed until we get to the cannon point.
			var c = scene.nkm.sections["KTPC"].entries[this.cannon];

			if (c.id1 != -1 && c.id2 != -1) {
				var c2 = scene.nkm.sections["KTPC"].entries[c.id2];
				c = c2;

				var mat = mat4.create();
				mat4.rotateY(mat, mat, c.angle[1] * (Math.PI / 180));
				mat4.rotateX(mat, mat, c.angle[0] * (-Math.PI / 180));

				this.pos = vec3.clone(c2.pos);
				vec3.add(this.pos, this.pos, vec3.transformMat4([0, 0, 0], [0, 16, 32], mat));
				this.airTime = 4;

				this.physicalDir = (180 - c2.angle[1]) * (Math.PI / 180);
				this.angle = this.physicalDir;
				this.cannon = null;
			} else {
				var mat = mat4.create();
				mat4.rotateY(mat, mat, c.angle[1] * (Math.PI / 180));
				if (true) {
					//vertical angle from position? airship fortress is impossible otherwise
					//var c2 = scene.nkm.sections["KTPC"].entries[c.id2];
					var diff = vec3.sub([0, 0, 0], c.pos, this.pos);
					var dAdj = Math.sqrt(diff[0] * diff[0] + diff[2] * diff[2]);
					var dHyp = Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1] + diff[2] * diff[2]);
					mat4.rotateX(mat, mat, ((diff[1] > 0) ? -1 : 1) * Math.acos(dAdj / dHyp));
				} else {
					mat4.rotateX(mat, mat, c.angle[0] * (-Math.PI / 180));
				}

				var forward: vec3 = [0, 0, 1];
				var up: vec3 = [0, 1, 0];

				this.vel = vec3.scale([0, 0, 0], vec3.transformMat4(forward, forward, mat), this._MAXSPEED);
				this.speed = Math.min(this.speed + 1, this._MAXSPEED);
				vec3.add(this.pos, this.pos, this.vel);
				this.physicalDir = (180 - c.angle[1]) * (Math.PI / 180);
				this.angle = this.physicalDir;
				this.kartTargetNormal = vec3.transformMat4(up, up, mat);
				this.airTime = 0;

				var planeConst = -vec3.dot(c.pos, forward);
				var cannonDist = vec3.dot(this.pos, forward) + planeConst;
				if (cannonDist > 0) {
					this.cannon = null; //leaving cannon state
					this.speed = this._params.topSpeed;
					this.vel = vec3.scale([0, 0, 0], vec3.transformMat4(forward, forward, mat), this.speed);
				}
			}
		} else { //default kart mode
			if (this.OOB > 0) {
				this.playCharacterSound(0);
				var current = this._checkpoints[this.checkPointNumber];
				var respawn;
				if (current == null)
					respawn = this._respawns[(Math.random() * this._respawns.length) | 0]; //todo: deterministic
				else
					respawn = this._respawns[current.respawn];
				this.physicalDir = (180 - respawn.angle[1]) * (Math.PI / 180);
				this.angle = this.physicalDir;
				this.speed = 0;
				this.vel = vec3.create();
				this.pos = vec3.clone(respawn.pos);
				vec3.add(this.pos, this.pos, [0, 16, 0]);
				if (this.controller.setRouteID != null) this.controller.setRouteID(respawn.id1);
				this.OOB = 0;
			}
			var groundEffect = 0;
			if (this._lastCollided != -1) {
				groundEffect = MKDS_COLTYPE.PHYS_MAP[this._lastCollided];
				if (groundEffect == null) groundEffect = 0;
			}

			var effect = this._params.colParam[groundEffect];
			var top = this._params.topSpeed * effect.topSpeedMul; //if you let go of accel, drift ends anyway, so always accel in drift.

			var boosting = (this.boostNorm + this.boostMT) > 0;
			if (this.specialControlHandler) {
				this._damagedControls();
			} else {
				if (boosting) {
					var top2
					if (this.boostNorm > 0) {
						top2 = this._params.topSpeed * 1.3;
						this.boostNorm--;
					} else {
						top2 = this._params.topSpeed * ((effect.topSpeedMul >= 1) ? 1.3 : effect.topSpeedMul);
					}

					if (this.boostMT > 0) {
						this.boostMT--;
					}

					if (this.speed <= top2) {
						this.speed += 1;
						if (this.speed > top2) this.speed = top2;
					} else {
						this.speed *= 0.95;
					}
				}

				//kart controls
				if (this.drifting) {
					if ((this._onGround) && !(input.accel && input.drift && (this.speed > 2 || !this.driftLanded))) {
						//end drift, execute miniturbo
						this._endDrift();
						if (this.driftPSMode == 3) {
							this.boostMT = this._params.miniTurbo;
						}
						this.driftPSMode = 0;
						this.driftPSTick = 0;
					}

					if (this.driftMode == 0) {
						if (input.turn > 0.30) {
							this.driftMode = 2;
						} else if (input.turn < -0.30) {
							this.driftMode = 1;
						}
					} else {
						if (this.driftLanded) {
							var change = (((this.driftMode - 1.5) * Math.PI / 1.5) - this.driftOff) * 0.05;
							this.driftOff += change;
							this.physicalDir -= change;
						}

						//if we're above the initial y position, add a constant turn with a period of 180 frames.
						if (!this.driftLanded && this.ylock >= 0) {
							this.physicalDir += (Math.PI * 2 / 180) * (this.driftMode * 2 - 3);
						}
					}

					if (this._onGround) {
						if (!this.driftLanded) {
							if (this.driftMode == 0) {
								this._endDrift();
							}
							else {
								this.driftPSMode = 0;
								this.driftPSTick = 0;
								this.driftLanded = true;
								if (this.drifting) this._setWheelParticles(20, 1); //20 = smoke, 1 = drift priority
							}
						}
						if (this.drifting) {

							if (!boosting) {
								if (this.speed <= top) {
									this.speed += (this.speed / top > this._params.driftAccelSwitch) ? this._params.driftAccel2 : this._params.driftAccel1;
									if (this.speed > top) this.speed = top;
								} else {
									this.speed *= 0.95;
								}
							}

							var turn = ((this.driftMode == 1) ? (input.turn - 1) : (input.turn + 1)) / 2;

							this.physicalDir += this._params.driftTurnRate * turn + ((this.driftMode == 1) ? -1 : 1) * (50 / 32768) * Math.PI; //what is this mystery number i hear you ask? well my friend, this is the turn rate for outward drift.

							//miniturbo code
							if (input.turn != 0) {
								var inward = (
									(input.turn > 0) == (this.driftMode - 1 > 0)
								); //if we're turning 

								switch (this.driftPSMode) {
									case 0: //dpad away from direction for 10 frames 
										if (!inward) this.driftPSTick++;
										else if (this.driftPSTick > 9) {
											this.driftPSMode++;
											this.driftPSTick = 1;

											//play blue spark sound, flare
											this._setWheelParticles(126, 2); //126 = blue flare, 2 = flare priority
											var blue = nitroAudio.playSound(210, {}, 0, this);
											blue.gainN.gain.value = parseFloat("2");

										} else this.driftPSTick = 0;
										break;
									case 1: //dpad toward direction for 10 frames 
										if (inward) this.driftPSTick++;
										else if (this.driftPSTick > 9) {
											this.driftPSMode++;
											this.driftPSTick = 1;

										} else this.driftPSTick = 0;
										break;
									case 2: //dpad away from direction for 10 frames 
										if (!inward) this.driftPSTick++;
										else if (this.driftPSTick > 9) {
											this.driftPSMode++;
											this.driftPSTick = 1;
											//play red sparks sound, full MT!
											this._setWheelParticles(22, 2); //22 = red flare, 2 = flare priority
											this._setWheelParticles(17, 1); //17 = red mt, 1 = drift priority ... 18 is sparks that come out - but their mode is not working yet (spark mode)
											this._sounds.powerslide = nitroAudio.playSound(209, {}, 0, this);
											this._sounds.powerslide.gainN.gain.value = parseFloat("2");
										} else this.driftPSTick = 0;
										break;
									case 3: //turbo charged
										break;
								}
							}
						}
					}
				}

				if (!this.drifting) {
					if (this._onGround) {
						var effect = this._params.colParam[groundEffect];
						if (!boosting) {
							if (input.accel) {
								if (this.speed <= top) {
									this.speed += (this.speed / top > this._params.accelSwitch) ? this._params.accel2 : this._params.accel1;
									if (this.speed > top) this.speed = top;
								} else {
									this.speed *= 0.95;
								}
							} else {
								this.speed *= this._params.decel;
							}
						}

						if ((input.accel && this.speed >= 0) || (this.speed > 0.1)) {
							this.physicalDir += this._params.turnRate * input.turn;
						} else if (this.speed < -0.1) {
							this.physicalDir -= this._params.turnRate * input.turn;
						}

						if (input.drift) {
							this._ylvel = 1.25;
							this.vel[1] += 1.25;
							this.airTime = 4;
							this.drifting = true;
							this.driftLanded = false;
							this.driftMode = 0;
							this.ylock = 0;
							this._onGround = false;

							var boing = nitroAudio.playSound(207, { transpose: -4 }, 0, this);
							boing.gainN.gain.value = parseFloat("2");
						}
					} else {
						if (input.drift) {
							this._ylvel = 0;
							this.drifting = true;
							this.driftLanded = false;
							this.driftMode = 0;
							this.ylock = -0.001;
						}
					}
				}
			}

			this.physicalDir = this._fixDir(this.physicalDir);

			if (this.driftOff != 0 && (!this.drifting || !this.driftLanded)) {
				if (this.driftOff > 0) {
					this.physicalDir += this._params.driftOffRestore;
					this.driftOff -= this._params.driftOffRestore;
					if (this.driftOff < 0) this.driftOff = 0;
				} else {
					this.physicalDir -= this._params.driftOffRestore;
					this.driftOff += this._params.driftOffRestore;
					if (this.driftOff > 0) this.driftOff = 0;
				}
			}

			this._checkKartCollision(scene);

			if (!this._onGround) {
				this.kartTargetNormal = [0, 1, 0];
				if (this.physBasis != null) vec3.transformMat4(this.kartTargetNormal, this.kartTargetNormal, this.physBasis.mat);
				vec3.add(this.vel, this.vel, this.gravity)
				if (this.ylock >= 0) {
					this._ylvel += this.gravity[1];
					this.ylock += this._ylvel;
				}

				/*
				if (k.kartColTimer == COLBOUNCE_TIME) {
					vec3.add(k.vel, k.vel, k.kartColVel);
				}
				*/
			} else {
				this.angle += this._dirDiff(this.physicalDir, this.angle) * effect.handling;
				this.angle += this._dirDiff(this.physicalDir, this.angle) * effect.handling; //applying this twice appears to be identical to the original
				this.angle = this._fixDir(this.angle);

				//reduce our forward speed by how much of our velocity is not going forwards
				var factor = Math.sin(this.physicalDir) * Math.sin(this.angle) + Math.cos(this.physicalDir) * Math.cos(this.angle);
				this.speed *= 1 - ((1 - factor) * (1 - this.params.decel));
				//var reducedSpeed = k.vel[0]*Math.sin(k.angle) + k.vel[2]*(-Math.cos(k.angle));
				//reducedSpeed = ((reducedSpeed < 0) ? -1 : 1) * Math.sqrt(Math.abs(reducedSpeed));
				this.vel[1] += this.gravity[1];
				this.vel = [Math.sin(this.angle) * this.speed, this.vel[1], -Math.cos(this.angle) * this.speed]
				//k.speed = reducedSpeed;

				/*
				if (k.kartColTimer > 0) {
					vec3.add(k.vel, k.vel, vec3.scale([], k.kartColVel, k.kartColTimer / 10))
				}
				*/
			}

			if (this.kartColTimer > 0) this.kartColTimer--;
			if (this.kartWallTimer > 0) this.kartWallTimer--;
			if (this.charSoundTimer > 0) this.charSoundTimer--;

			this._wheelTurn += this.speed / 16;
			this._wheelTurn = this._fixDir(this._wheelTurn);
			this.airTime++;
			//end kart controls

			//move kart on moving platforms (no collision, will be corrected by next step)
			if (this._stuckTo != null) {
				if (this._stuckTo.moveWith != null) {
					this._stuckTo.moveWith(this);
				}
				this._stuckTo = null;
			}

			//move kart. 

			var steps = 0;
			var remainingT = 1;
			var baseVel = this.vel;
			if (this.physBasis != null) {
				if (this.physBasis.time-- < 0) this.exitBasis();
				else {
					baseVel = vec3.transformMat4([0, 0, 0], baseVel, this.physBasis.mat);
					this.vel[1] = -1;
				}
			}
			var velSeg = vec3.clone(baseVel);
			if (this.kartColTimer > 0) {
				vec3.add(velSeg, velSeg, vec3.scale([0, 0, 0], this.kartColVel, this.kartColTimer / this._COLBOUNCE_TIME));
			}
			var posSeg = vec3.clone(this.pos);
			var ignoreList: kcl_plane[] = [];
			while (steps++ < 10 && remainingT > 0.01) {
				var result = lsc.sweepEllipse(posSeg, velSeg, scene, [this._params.colRadius, this._params.colRadius, this._params.colRadius], ignoreList);
				if (result != null) {
					this._colResponse(posSeg, velSeg, result, ignoreList)
					remainingT -= result.t;
					if (remainingT > 0.01) {
						if (this.physBasis != null) {
							baseVel = vec3.transformMat4([0, 0, 0], this.vel, this.physBasis.mat);
						}
						velSeg = vec3.scale(vec3.create(), baseVel, remainingT);
					}
				} else {
					vec3.add(posSeg, posSeg, velSeg);
					remainingT = 0;
				}
			}
			this.pos = posSeg;
		}

		//interpolate visual normal roughly to target
		var rate = this._onGround ? 0.15 : 0.025;
		this.kartNormal[0] += (this.kartTargetNormal[0] - this.kartNormal[0]) * rate;
		this.kartNormal[1] += (this.kartTargetNormal[1] - this.kartNormal[1]) * rate;
		this.kartNormal[2] += (this.kartTargetNormal[2] - this.kartNormal[2]) * rate;
		vec3.normalize(this.kartNormal, this.kartNormal);

		this.basis = this._buildBasis();

		var mat = mat4.create();
		mat4.translate(mat, mat, this.pos);
		this.mat = mat4.mul(mat, mat, this.basis);
		if (this.damageMat != null) mat4.mul(mat, mat, this.damageMat);

		this._updateKartSound(newSoundMode, input);
		this._positionChanged(lastPos, this.pos);
	}

	_endDrift() {
		this.drifting = false;
		this._clearWheelParticles();
		if (this._sounds.powerslide != null) {
			nitroAudio.instaKill(this._sounds.powerslide);
			this._sounds.powerslide = null;
		}
	}

	damage(damageType: number) {
		if (this.damageType >= damageType) {
			return; //we are already damaged
		}
		//TODO: check invuln state
		this.specialControlHandler = true;
		this.playCharacterSound((damageType == 0) ? 1 : 0);
		this.damageType = damageType;
		this.ylock = 0;

		this.anim.setAnim(this.charRes.spinA);
		this.animMode = "spin";

		if (this.drifting) {
			this._endDrift();
		}
		this.boostMT = 0;
		this.boostNorm = 0;

		switch (damageType) {
			case 0:
				this.damageTime = 40;
				break;
			case 1:
				this.damageTime = 80;
				this.vel[1] += 3;
				this._ylvel = 3;
				this.airTime = 4;
				break;
			case 2:
				this.damageTime = 105;
				this.vel[1] += 8;
				this._ylvel = 8;
				this.airTime = 4;
				break;
		}
	}

	_damagedControls() {
		if (--this.damageTime == 0) {
			this.anim.setAnim(this.charRes.driveA);
			this.animMode = "drive";
			this.specialControlHandler = false;
			this.damageType = -1;
			this.damageMat = null;
		}
		vec3.scale(this.vel, this.vel, 0.98);
		this.speed *= 0.98;

		var total = 40;
		switch (this.damageType) {
			case 1:
				total = 80;
				break;
			case 2:
				total = 105;
				break;
		}
		var anim = 1 - (this.damageTime / total);

		this.damageMat = mat4.create();
		var flip = ((this.damageType % 2) == 1) ? 1 : -1;
		var animOff = Math.min(1, anim * 1.75);
		mat4.rotateX(this.damageMat, this.damageMat, Math.PI * 2 * animOff * this.damageType * flip);
		if (this.damageType == 0) mat4.rotateY(this.damageMat, this.damageMat, Math.PI * -2 * anim);
		else mat4.rotateY(this.damageMat, this.damageMat, Math.PI / 12 * Math.sin(animOff * Math.PI));
	}

	_triggerCannon(id: number) {
		if (this.cannon != null) return;
		this.cannon = id;
		var c = this._scene.nkm.sections["KTPC"].entries[this.cannon];
		if (c.id1 != -1 && c.id2 != -1) {
			nitroAudio.playSound(345, { volume: 2.5 }, 0, this);
		} else {
			nitroAudio.playSound(347, { volume: 2.5 }, 0, this);
			if (this.local) {
				if (c.id2 == 0) {
					nitroAudio.playSound(380, { volume: 2 }, 0, null); //airship fortress
				} else {
					nitroAudio.playSound(456, { volume: 2 }, 0, null); //waluigi
				}
			}
		}
	}

	playCharacterSound(sound: number, volume?: number) {
		//0 - hit
		//1 - hit spin
		//2 - hit ?? hit grnd
		//3 - hit banana? race start?
		//4 - hit spin?
		//5 - good pass?
		//6 - good OK!
		//7 - use item
		//8 - hit someone?
		//9 = win
		//10 = alright
		//11 = bad
		//12 = good record
		//13 = bad record
		if (volume == null) {
			volume = 1;
		}
		nitroAudio.playSound(sound + this._charRes.sndOff, { volume: 2 * volume }, 2, this);
	}

	_clearWheelParticles(prio?: number) {
		for (var i = 0; i < 2; i++) {
			if (prio == null) {
				//clear all specials
				this.wheelParticles[i].clearEmitter(1); //drift mode
				//k.wheelParticles[i].clearEmitter(2); //drift flare (blue mt, red big flash)
			} else {
				this.wheelParticles[i].clearEmitter(0);
			}
		}
	}

	_setWheelParticles(id: number, prio: number) {
		for (var i = 0; i < 2; i++) {
			this.wheelParticles[i].setEmitter(id, prio);
		}
	}

	_genFutureChecks() {
		//all future points that 
		var chosen: number[] = []
		var current = this._checkpoints[this.checkPointNumber] as nkm_section_CPOI;
		var expectedSection = current.nextSection;
		this._futureChecks = [];
		for (var i = this.checkPointNumber + 1; i < this._checkpoints.length; i++) {
			var check = this._checkpoints[i] as nkm_section_CPOI;
			if (expectedSection != -1 && check.currentSection != expectedSection) {
				continue;
			}


			if (!chosen.includes(check.currentSection)) {
				this._futureChecks.push(i);
				chosen.push(check.currentSection)
			}
		}
	}

	_positionChanged(oldPos: vec3, pos: vec3) {
		//crossed into new checkpoint?
		if (this._checkpoints.length == 0) return;
		for (var i = 0; i < this._futureChecks.length; i++) {
			var check = this._checkpoints[this._futureChecks[i]] as nkm_section_CPOI;
			var distOld = vec2.sub([0, 0], [check.x1, check.z1], [oldPos[0], oldPos[2]]);
			var dist = vec2.sub([0, 0], [check.x1, check.z1], [pos[0], pos[2]]);
			var dot = vec2.dot(dist, [check.sinus, check.cosinus]);
			var dotOld = vec2.dot(distOld, [check.sinus, check.cosinus]);

			var lineCheck = vec2.sub([0, 0], [check.x1, check.z1], [check.x2, check.z2]);
			var lineDot = vec2.dot(dist, lineCheck);

			if (lineDot > 0 && lineDot < vec2.sqrLen(lineCheck) && dot < 0 && dotOld >= 0) {
				this.checkPointNumber = this._futureChecks[i];
				this._genFutureChecks();
				break;
			}
		}

		if (!this.passedKTP2 && this._forwardCrossedKTP(this._passLine, oldPos, pos)) {
			this.passedKTP2 = true;
		}
		if (this.passedKTP2 && this._futureChecks.length == 0) {
			//we can finish the lap
			if (this._forwardCrossedKTP(this._startLine, oldPos, pos)) {
				this.lapNumber++;
				this.checkPointNumber = 0;
				this.passedKTP2 = false;
				this._futureChecks = [1];
				this._scene.lapAdvance(this);
			}
		}
	}

	getPosition() {
		if (this._checkpoints.length == 0 || this._futureChecks.length == 0) return 0;
		var check = this._checkpoints[this._futureChecks[0]] as nkm_section_CPOI;
		var dist = vec2.sub([0, 0], [check.x1, check.z1], [this.pos[0], this.pos[2]]);
		var dot = vec2.dot(dist, [check.sinus, check.cosinus]);

		return this.checkPointNumber + (1 - (Math.abs(dot) / (0xFFFF))) + this.lapNumber * this._checkpoints.length;
	}

	_forwardCrossedKTP(ktp: nkm_section_KTPS, oldPos: vec3, pos: vec3) {
		var distOld = vec2.sub([0, 0], [ktp.pos[0], ktp.pos[2]], [oldPos[0], oldPos[2]]);
		var dist = vec2.sub([0, 0], [ktp.pos[0], ktp.pos[2]], [pos[0], pos[2]]);

		var ang = (ktp.angle[1] / 180) * Math.PI;

		var sinus = Math.sin(ang);
		var cosinus = Math.cos(ang);

		var dot = vec2.dot(dist, [sinus, cosinus]);
		var dotOld = vec2.dot(distOld, [sinus, cosinus]);

		return (dot < 0 && dotOld >= 0);
	}

	_checkKartCollision(scene: Scene) { //check collision with other karts. Really simple.
		for (var i = 0; i < scene.karts.length; i++) {
			var ok = scene.karts[i];
			if (!ok.active) continue;
			if (this != ok) {
				var dist = vec3.dist(this.pos, ok.pos);
				if (dist < 16) {
					this.kartBounce(ok);
					ok.kartBounce(this);
				}
			}
		}

	}

	kartBounce(ok: Kart) {
		//play this kart's horn
		if (this.kartColTimer == 0) { //not if we're still being bounced
			nitroAudio.playSound(208, { volume: 2 }, 0, this);
			nitroAudio.playSound(193 + this._charRes.sndOff / 14, { volume: 1.5 }, 0, this);
		}

		this.kartColTimer = this._COLBOUNCE_TIME;
		var weightMul = this._COLBOUNCE_STRENGTH * (1.5 + (ok.weight - this.weight)) * ((ok.boostNorm > 0 || ok.boostMT > 0) ? 2 : 1) * ((this.boostNorm > 0 || this.boostMT > 0) ? 0.5 : 1);

		//as well as side bounce also add velocity difference if other vel > mine.

		vec3.sub(this.kartColVel, this.pos, ok.pos);
		vec3.normalize(this.kartColVel, this.kartColVel);
		vec3.scale(this.kartColVel, this.kartColVel, weightMul);

		if (vec3.length(this.vel) < vec3.length(ok.vel)) vec3.add(this.kartColVel, this.kartColVel, vec3.sub([0, 0, 0], ok.vel, this.vel));

		this.kartColVel[1] = 0;
	}

	_fixDir(dir: number) {
		return this._posMod(dir, Math.PI * 2);
	}

	_dirDiff(dir1: number, dir2: number) {
		var d = this._fixDir(dir1 - dir2);
		return (d > Math.PI) ? (-2 * Math.PI + d) : d;
	}

	_posMod(i: number, n: number) {
		return (i % n + n) % n;
	}

	_updateKartSound(mode: number, input: InputData) {
		if (!this.local) return; //for now, don't play kart sounds from other racers.
		var turn = (this._onGround && !this.drifting) ? (1 - Math.abs(input.turn) / 11) : 1;
		var transpose = (mode == 0) ? 0 : (22 * turn * Math.min(1.3, this.speed / this._params.topSpeed));

		this._sounds.transpose += (transpose - this._sounds.transpose) / 15;
		if (mode != this._soundMode) {
			this._soundMode = mode;
			if (this._sounds.kart != null) nitroAudio.instaKill(this._sounds.kart);
			this._sounds.kart = nitroAudio.playSound(this._kartSoundBase + this._soundMode, { transpose: this._sounds.transpose, volume: 1 }, 0, this);
			//if (mode == 3) sounds.kart.gainN.gain.value = 0.5;
		} else {
			//sounds.kart.seq.setTranspose(sounds.transpose);
		}
	}

	_buildBasis(): mat4 {
		//order y, x, z
		var dir = this.physicalDir + this.driftOff + (Math.sin((this._COLBOUNCE_TIME - this.kartColTimer) / 3) * (Math.PI / 6) * (this.kartColTimer / this._COLBOUNCE_TIME));
		var forward: vec3 = [
			Math.sin(dir),
			0,
			-Math.cos(dir)
		];
		var side: vec3 = [
			-Math.cos(dir),
			0,
			-Math.sin(dir)
		];
		if (this.physBasis != null) {
			vec3.transformMat4(forward, forward, this.physBasis.mat);
			vec3.transformMat4(side, side, this.physBasis.mat);
		}
		var basis = this._gramShmidt(this.kartNormal, side, forward);
		var temp = basis[0];
		basis[0] = basis[1];
		basis[1] = temp; //todo: cleanup
		return [
			basis[0][0], basis[0][1], basis[0][2], 0,
			basis[1][0], basis[1][1], basis[1][2], 0,
			basis[2][0], basis[2][1], basis[2][2], 0,
			0, 0, 0, 1
		]

	}

	_enterBasis(normal: vec3) {
		//establish a new basis for the kart velocity based on this normal.
		//used by looping and sticky track surface types.

		//first let's get the forward direction in our current basis

		var dir = this.angle;
		var forward: vec3, side: vec3;
		if (this.physBasis != null) {
			forward = vec3.transformMat4([0, 0, 0], [-	Math.sin(dir), 0, Math.cos(dir)], this.physBasis.mat);
			side = vec3.transformMat4([0, 0, 0], [Math.cos(dir), 0, Math.sin(dir)], this.physBasis.mat);
		} else {
			forward = [-Math.sin(dir), 0, Math.cos(dir)];
			side = [Math.cos(dir), 0, Math.sin(dir)];
		}

		var basis = this._gramShmidt(normal, side, forward);
		var temp = basis[0];
		basis[0] = basis[1];
		basis[1] = temp; //todo: cleanup
		var m4 = mat4.clone([
			basis[0][0], basis[0][1], basis[0][2], 0,
			basis[1][0], basis[1][1], basis[1][2], 0,
			basis[2][0], basis[2][1], basis[2][2], 0,
			0, 0, 0, 1
		]);

		this.physicalDir = this._dirDiff(this.physicalDir, this.angle);
		this.angle = 0; //our front direction is now aligned with z.
		this.vel = [Math.sin(this.angle) * this.speed, this.vel[1], -Math.cos(this.angle) * this.speed];

		this.physBasis = {
			mat: m4,
			inv: mat4.invert(mat4.create(), m4),
			normal: normal,
			time: 15,
			loop: false
		};
	}

	exitBasis() {
		//return to a normal y up, z forward basis.

		var v = vec3.transformMat4([0, 0, 0], this.vel, this.physBasis.mat);
		this.physicalDir = this._dirDiff(this.physicalDir, this.angle);
		this.angle = Math.atan2(v[0], -v[2]);
		this.physicalDir += this.angle;
		this.vel = v;
		this.physBasis = null;
	}

	sndUpdate(view: mat4) {
		/*
		k.soundProps.pos = vec3.transformMat4([], k.pos, view);
		if (k.soundProps.lastPos != null) k.soundProps.vel = vec3.sub([], k.soundProps.pos, k.soundProps.lastPos);
		else k.soundProps.vel = [0, 0, 0];
		*/
		this.soundProps.lastPos = this.soundProps.pos;
		this.soundProps.pos = this.pos; //todo: reintroduce doppler via emulation

		this.soundProps.refDistance = 192;
		this.soundProps.rolloffFactor = 1;

		var calcVol = (this.soundProps.refDistance / (this.soundProps.refDistance + this.soundProps.rolloffFactor * (Math.sqrt(vec3.dot(this.soundProps.pos, this.soundProps.pos)) - this.soundProps.refDistance)));
	}

	_gramShmidt(v1: vec3, v2: vec3, v3: vec3) {
		var u1 = v1;
		var u2 = vec3.sub([0, 0, 0], v2, this._project(u1, v2));
		var u3 = vec3.sub([0, 0, 0], vec3.sub([0, 0, 0], v3, this._project(u1, v3)), this._project(u2, v3));
		return [vec3.normalize(u1, u1), vec3.normalize(u2, u2), vec3.normalize(u3, u3)]
	}

	_colSound(collision: number, effect: number) {
		const coll = collision as keyof typeof MKDS_COLTYPE.SOUNDMAP;
		if (MKDS_COLTYPE.SOUNDMAP[coll] == null) return {};
		return MKDS_COLTYPE.SOUNDMAP[coll][effect] || {};
	}

	_colParticle(collision: number, effect: number) {
		const coll = collision as keyof typeof MKDS_COLTYPE.SOUNDMAP;
		if (MKDS_COLTYPE.SOUNDMAP[coll] == null) return null
		if (MKDS_COLTYPE.SOUNDMAP[coll][effect] == null) return null
		return (MKDS_COLTYPE.SOUNDMAP[coll][effect] as any).particle || null;
	}

	_project(u: vec3, v: vec3) {
		return vec3.scale([0, 0, 0], u, (vec3.dot(u, v) / vec3.dot(u, u)))
	}

	_colResponse(pos: vec3, pvel: vec3, dat: lscsweepellipse, ignoreList: kcl_plane[]) {

		var plane = dat.plane;
		var colType = (plane.CollisionType >> 8) & 31;
		var colBE = (plane.CollisionType >> 5) & 7;

		var change = (colType != this._lastCollided);
		this._lastCollided = colType;
		this._lastBE = colBE;
		this._lastColSounds = this._colSound(this._lastCollided, colBE);

		var n = vec3.normalize([0, 0, 0], dat.normal);
		var an = n;
		if (this.physBasis != null) {
			an = vec3.transformMat4([0, 0, 0], n, this.physBasis.inv);
		}
		var gravS = Math.sqrt(vec3.dot(this.gravity, this.gravity));
		var angle = Math.acos(vec3.dot(vec3.scale(vec3.create(), this.gravity, -1 / gravS), n));
		var adjustPos = true;

		if (MKDS_COLTYPE.GROUP_OOB.indexOf(colType) != -1) {
			this.OOB = 1;
		}

		if (MKDS_COLTYPE.GROUP_WALL.indexOf(colType) != -1) { //wall
			//sliding plane, except normal is transformed to be entirely on the xz plane (cannot ride on top of wall, treated as vertical)
			var xz = Math.sqrt(an[0] * an[0] + an[2] * an[2])
			var adjN: vec3 = [an[0] / xz, 0, an[2] / xz]
			var proj = vec3.dot(this.vel, adjN);

			if (proj < -1) {
				if (this.kartWallTimer == 0) {
					if (this._lastColSounds.hit != null) nitroAudio.playSound(this._lastColSounds.hit, { volume: 1 }, 0, this)
					var colObj = {
						pos: pos,
						vel: vec3.clone([0, 0, 0]),
						mat: mat4.fromTranslation(mat4.create(), pos)
					};
					this._scene.particles.push(new NitroEmitter(this._scene, colObj, 13));
					this._scene.particles.push(new NitroEmitter(this._scene, colObj, 14));
				}
				this.kartWallTimer = 15;
			}
			vec3.sub(this.vel, this.vel, vec3.scale(vec3.create(), adjN, proj));

			if (colType == MKDS_COLTYPE.KNOCKBACK_DAMAGE && this.damageType == -1) {
				if (dat.object.vel) {
					vec3.add(this.vel, this.vel, dat.object.vel);
				}
				vec3.add(this.vel, this.vel, vec3.scale(vec3.create(), adjN, 1.25));
				this.damage(MKDSCONST.DAMAGE_FLIP);
			}

			//convert back to angle + speed to keep change to kart vel

			var v = this.vel;
			this.speed = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
			this.angle = Math.atan2(v[0], -v[2]);
			this._stuckTo = dat.object;
		} else if (MKDS_COLTYPE.GROUP_ROAD.indexOf(colType) != -1) {
			//sliding plane
			if (MKDS_COLTYPE.GROUP_BOOST.indexOf(colType) != -1) {
				this.boostNorm = this._BOOSTTIME;
			}

			var stick = (colType == MKDS_COLTYPE.STICKY || colType == MKDS_COLTYPE.LOOP);

			if (this.vel[1] > 0) this.vel[1] = 0;
			var proj = vec3.dot(this.vel, an);
			if (this.damageType > 0) proj *= 1.7;
			else if (!stick && proj < -4 && this.vel[1] < -2) { proj -= 1.5; }
			vec3.sub(this.vel, this.vel, vec3.scale(vec3.create(), an, proj));

			if (stick) {
				this._enterBasis(dat.pNormal);
				this.physBasis.loop = colType == MKDS_COLTYPE.LOOP;
			} else {
				if (this.physBasis != null)
					this.exitBasis();
			}

			this.kartTargetNormal = dat.pNormal;

			if (change) {
				var particle = this._colParticle(this._lastCollided, colBE);
				if (particle == null)
					this._clearWheelParticles(0);
				else
					this._setWheelParticles(particle, 0);
			}
			if (!this._onGround && !stick) {
				this._groundAnim = 0;
				if (this._lastColSounds.land != null) nitroAudio.playSound(this._lastColSounds.land, { volume: 1 }, 0, this)
			}
			this.airTime = 0;
			this._stuckTo = dat.object;
		} else if (colType == MKDS_COLTYPE.CANNON) {
			//cannon!!
			this._triggerCannon(colBE);
		} else {
			adjustPos = false;
			ignoreList.push(plane);
		}

		//vec3.add(pos, pos, vec3.scale(vec3.create(), n, minimumMove)); //move away from plane slightly

		if (adjustPos) { //move back from plane slightly
			//vec3.add(pos, pos, vec3.scale(vec3.create(), n, minimumMove));
			vec3.add(pos, pos, vec3.scale(vec3.create(), pvel, dat.t));
			vec3.add(pos, vec3.scale([0, 0, 0], n, this._params.colRadius + this._minimumMove), dat.colPoint);
			/*if (dat.embedded) {
				
			} else {
				var velMag = Math.sqrt(vec3.dot(pvel, pvel));
				if (velMag*dat.t > minimumMove) {
					vec3.add(pos, pos, vec3.scale(vec3.create(), pvel, dat.t-(minimumMove/velMag)));
				} else {
					//do not move, too close
				}
			}*/
		} else {
			vec3.add(pos, pos, vec3.scale(vec3.create(), pvel, dat.t));
		}

	}
}
