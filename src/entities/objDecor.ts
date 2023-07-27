//
// decorations.js
//--------------------
// Provides decoration objects.
// by RHY3756547
//
// includes:
// render stuff idk
//

import { nkm_section_OBJI } from "../formats/nkm";
import { nsbca } from "../formats/nsbca";
import { nsbta } from "../formats/nsbta";
import { nsbtp } from "../formats/nsbtp";
import { nitroAnimator, nitroAnimator_matStack } from "../render/nitroAnimator";
import { nitroRender } from "../render/nitroRender";
export class ObjDecor implements SceneEntityObject {
	collidable: boolean;
	_res: ProvidedRes;
	_forceBill: boolean;
	_obji: nkm_section_OBJI;
	_mat: mat4;
	_anim: nitroAnimator;
	_animFrame: number;
	_animMat: nitroAnimator_matStack;
	pos: vec3;
	angle: vec3;
	scale: vec3;
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		this._forceBill = undefined;
		this._obji = obji;
		this._res = undefined;

		this._mat = mat4.create();
		this._anim = null;
		this._animFrame = 0;
		this._animMat = null;

		this.pos = vec3.clone(this._obji.pos);
		this.angle = vec3.clone(this._obji.angle);
		this.scale = vec3.clone(this._obji.scale);
	}


	draw(view: mat4, pMatrix: mat4) {
		if (this._forceBill) {
			nitroRender.setShadBias(0.001);
		}
		mat4.translate(this._mat, view, this.pos);

		if (this.angle[2] != 0) mat4.rotateZ(this._mat, this._mat, this.angle[2] * (Math.PI / 180));
		if (this.angle[1] != 0) mat4.rotateY(this._mat, this._mat, this.angle[1] * (Math.PI / 180));
		if (this.angle[0] != 0) mat4.rotateX(this._mat, this._mat, this.angle[0] * (Math.PI / 180));

		mat4.scale(this._mat, this._mat, vec3.scale([0, 0, 0], this.scale, 16));
		this._res.mdl[0].draw(this._mat, pMatrix, this._animMat);
		if (this._forceBill) {
			nitroRender.resetShadOff();
		}
	}

	update() {
		this._res.mdl[0].setFrame(this._animFrame);
		if (this._anim != null) {
			this._animMat = this._anim.setFrame(0, 0, this._animFrame);
		}
		this._animFrame++;
	}

	requireRes() { //scene asks what resources to load
		this._forceBill = true;
		switch (this._obji.ID) {
			case 0x012F:
				return { mdl: [{ nsbmd: "earthen_pipe1.nsbmd" }] }; //why is there an earthen pipe 2
			case 0x0130:
				return { mdl: [{ nsbmd: "opa_tree1.nsbmd" }] };
			case 0x0131:
				return { mdl: [{ nsbmd: "OlgPipe1.nsbmd" }] };
			case 0x0132:
				return { mdl: [{ nsbmd: "OlgMush1.nsbmd" }] };
			case 0x0133:
				return { mdl: [{ nsbmd: "of6yoshi1.nsbmd" }] };
			case 0x0134:
				return { mdl: [{ nsbmd: "cow.nsbmd" }], other: [null, null, "cow.nsbtp"] }; //has animation, cow.nsbtp
			case 0x0135:
				this._forceBill = false;
				return { mdl: [{ nsbmd: "NsKiller1.nsbmd" }, { nsbmd: "NsKiller2.nsbmd" }, { nsbmd: "NsKiller2_s.nsbmd" }] }; //probably animates
			case 0x0138:
				return { mdl: [{ nsbmd: "GardenTree1.nsbmd" }] };
			case 0x0139:
				return { mdl: [{ nsbmd: "kamome.nsbmd" }], other: [null, null, "kamome.nsbtp"] }; //animates using nsbtp, and uses route to move

			case 0x013A:
				return { mdl: [{ nsbmd: "CrossTree1.nsbmd" }] };

			//0x013C is big cheep cheep
			case 0x013C:
				this._forceBill = false;
				return { mdl: [{ nsbmd: "bakubaku.nsbmd" }] };

			//0x013D is spooky ghost
			case 0x013D:
				this._forceBill = false;
				return { mdl: [{ nsbmd: "teresa.nsbmd" }], other: [null, null, "teresa.nsbtp"] };

			case 0x013E:
				return { mdl: [{ nsbmd: "Bank_Tree1.nsbmd" }] };
			case 0x013F:
				return { mdl: [{ nsbmd: "GardenTree1.nsbmd" }] }; //non solid

			case 0x0140:
				return { mdl: [{ nsbmd: "chandelier.nsbmd" }], other: [null, "chandelier.nsbca"] };
			case 0x0142:
				return { mdl: [{ nsbmd: "MarioTree3.nsbmd" }] };
			case 0x0145:
				return { mdl: [{ nsbmd: "TownTree1.nsbmd" }] };
			case 0x0146:
				//solid
				return { mdl: [{ nsbmd: "Snow_Tree1.nsbmd" }] };
			case 0x0148:
				return { mdl: [{ nsbmd: "DeTree1.nsbmd" }] };
			case 0x0149:
				return { mdl: [{ nsbmd: "BankEgg1.nsbmd" }] };

			case 0x014B:
				return { mdl: [{ nsbmd: "KinoHouse1.nsbmd" }] };
			case 0x014C:
				return { mdl: [{ nsbmd: "KinoHouse2.nsbmd" }] };
			case 0x014D:
				return { mdl: [{ nsbmd: "KinoMount1.nsbmd" }] };
			case 0x014E:
				return { mdl: [{ nsbmd: "KinoMount2.nsbmd" }] };


			case 0x014F:
				return { mdl: [{ nsbmd: "olaTree1c.nsbmd" }] };

			case 0x0150:
				return { mdl: [{ nsbmd: "osaTree1c.nsbmd" }] };
			case 0x0151:
				this._forceBill = false;
				return { mdl: [{ nsbmd: "picture1.nsbmd" }], other: [null, "picture1.nsbca"] };
			case 0x0152:
				this._forceBill = false;
				return { mdl: [{ nsbmd: "picture2.nsbmd" }], other: [null, "picture2.nsbca"] };
			case 0x0153:
				return { mdl: [{ nsbmd: "om6Tree1.nsbmd" }] };

			//0x0154 is rainbow road rotating star
			case 0x0154:
				this._forceBill = false;
				return { mdl: [{ nsbmd: "RainStar.nsbmd" }], other: ["RainStar.nsbta"] };

			case 0x0155:
				return { mdl: [{ nsbmd: "Of6Tree1.nsbmd" }] };
			case 0x0156:
				return { mdl: [{ nsbmd: "Of6Tree1.nsbmd" }] };
			case 0x0157:
				return { mdl: [{ nsbmd: "TownMonte.nsbmd" }], other: [null, null, "TownMonte.nsbtp"] }; //pianta!

			//debug pianta bridge
			case 0x00CC:
				this._forceBill = false;
				return { mdl: [{ nsbmd: "bridge.nsbmd" }], other: [null, "bridge.nsbca"] };
			//debug puddle
			case 0x000D:
				this._forceBill = false;
				return { mdl: [{ nsbmd: "puddle.nsbmd" }] };
			//debug airship
			case 0x0158:
				this._forceBill = false;
				return { mdl: [{ nsbmd: "airship.nsbmd" }] };

			//need version for 3d objects?

			//DEBUG ENEMIES - remove here when implemented.

			case 0x0191: //goomba
				return { mdl: [{ nsbmd: "kuribo.nsbmd" }], other: [null, null, "kuribo.nsbtp"] }; //has nsbtp, route
			case 0x0192: //rock
				this._forceBill = false;
				return { mdl: [{ nsbmd: "rock.nsbmd" }, { nsbmd: "rock_shadow.nsbmd" }] }; //has route
			case 0x0193: //thwomp
				this._forceBill = false;
				return { mdl: [{ nsbmd: "dossun.nsbmd" }, { nsbmd: "dossun_shadow.nsbmd" }] }; //has route
			case 0x0196: //chain chomp
				this._forceBill = false;
				return { mdl: [{ nsbmd: "wanwan.nsbmd" }, { nsbmd: "wanwan_chain.nsbmd" }, { nsbmd: "wanwan_kui.nsbmd" }, { nsbmd: "rock_shadow.nsbmd" }] };
			case 0x0198: //bowser castle GBA fireball
				return { mdl: [{ nsbmd: "mkd_ef_bubble.nsbmd" }] };
			case 0x0199: //peach gardens monty
				this._forceBill = false;
				return { mdl: [{ nsbmd: "choropu.nsbmd" }], other: [null, null, "choropu.nsbtp"] }; //has nsbtp
			case 0x019B: //cheep cheep (bouncing)
				return { mdl: [{ nsbmd: "pukupuku.nsbmd" }] }; //has nsbtp //, other:[null, null, "pukupuku.nsbtp"]
			case 0x019D: //snowman
				return { mdl: [{ nsbmd: "sman_top.nsbmd" }, { nsbmd: "sman_bottom.nsbmd" }] };
			case 0x019E: //trunk with bats
				this._forceBill = false;
				return { mdl: [{ nsbmd: "kanoke_64.nsbmd" }, { nsbmd: "basabasa.nsbmd" }], other: [null, "kanoke_64.nsbca"] }; //basa has nsbtp
			case 0x01A0: //bat
				return { mdl: [{ nsbmd: "basabasa.nsbmd" }], other: [null, null, "basabasa.nsbtp"] }; //has nsbtp
			case 0x01A1: //as fortress cannon
				this._forceBill = false;
				return { mdl: [{ nsbmd: "NsCannon1.nsbmd" }] };
			case 0x01A3: //mansion moving tree
				this._forceBill = false;
				return { mdl: [{ nsbmd: "move_tree.nsbmd" }], other: [null, "move_tree.nsbca"] }; //has route
			case 0x01A4: //flame
				this._forceBill = false;
				return { mdl: [{ nsbmd: "mkd_ef_burner.nsbmd" }], other: ["mkd_ef_burner.nsbta", null] };
			case 0x01A5: //chain chomp no base
				this._forceBill = false;
				return { mdl: [{ nsbmd: "wanwan.nsbmd" }, { nsbmd: "wanwan_chain.nsbmd" }, { nsbmd: "rock_shadow.nsbmd" }] };

			case 0x01A6: //plant
				return { mdl: [{ nsbmd: "ob_pakkun_sf.nsbmd" }], other: [null, null, "ob_pakkun_sf.nsbtp"] }; //has nsbtp

			case 0x01A7: //monty airship
				this._forceBill = false;
				return { mdl: [{ nsbmd: "poo.nsbmd" }, { nsbmd: "cover.nsbmd" }, { nsbmd: "hole.nsbmd" }], other: [null, null, "poo.nsbtp"] }; //poo has nsbtp

			case 0x01A8: //bound
				this._forceBill = false;
				return { mdl: [{ nsbmd: "bound.nsbmd" }], other: [null, null, "bound.nsbtp"] }; //has nsbtp
			case 0x01A9: //flipper
				this._forceBill = false;
				return { mdl: [{ nsbmd: "flipper.nsbmd" }], other: ["flipper.nsbta", null, "flipper.nsbtp"] }; //has nsbtp

			case 0x01AA: //3d fire plant
				this._forceBill = false;
				//note... what exactly is PakkunZHead...
				return { mdl: [{ nsbmd: "PakkunMouth.nsbmd" }, { nsbmd: "PakkunBody.nsbmd" }, { nsbmd: "FireBall.nsbmd" }], other: [null, "PakkunMouth.nsbca"] };
			case 0x01AC: //crab
				this._forceBill = false;
				return { mdl: [{ nsbmd: "crab.nsbmd" }, { nsbmd: "crab_hand.nsbmd" }], other: [null, null, "crab.nsbtp"] }; //both have nsbtp

			case 0x01AD: //desert hills sun
				this._forceBill = false;
				return { mdl: [{ nsbmd: "sun.nsbmd" }, { nsbmd: "sun_LOD.nsbmd" }]/*, other:[null, "sun.nsbca"]*/ }; //exesun animation does not load

			case 0x01B0: //routed iron ball
				return { mdl: [{ nsbmd: "IronBall.nsbmd" }] };
			case 0x01B1: //routed choco mountain rock
				this._forceBill = false;
				return { mdl: [{ nsbmd: "rock2.nsbmd" }] };
			case 0x01B2: //sanbo... whatever that is (pokey?) routed
				return { mdl: [{ nsbmd: "sanbo_h.nsbmd" }, { nsbmd: "sanbo_b.nsbmd" }] };
			case 0x01B3: //iron ball
				return { mdl: [{ nsbmd: "IronBall.nsbmd" }] };

			case 0x01B4: //cream
				this._forceBill = false;
				return { mdl: [{ nsbmd: "cream.nsbmd" }, { nsbmd: "cream_effect.nsbmd" }] };
			case 0x01B5: //berry
				this._forceBill = false;
				return { mdl: [{ nsbmd: "berry.nsbmd" }, { nsbmd: "cream_effect.nsbmd" }] };
		}
	}

	provideRes(r: ProvidedRes) {
		this._res = r; //...and gives them to us. :)

		if (this._forceBill) {
			this.angle[1] = 0;
			var bmd = r.mdl[0].bmd;
			bmd.hasBillboards = true;
			var models = bmd.modelData.objectData;
			for (var i = 0; i < models.length; i++) {
				var objs = models[i].objects.objectData;
				for (var j = 0; j < objs.length; j++) {
					objs[i].billboardMode = 2;
				}
			}
		}

		if (r.other != null) {
			if (r.other.length > 0 && r.other[0] != null) {
				const bta = <nsbta>r.other[0]
				this._res.mdl[0].loadTexAnim(bta);
			}
			if (r.other.length > 1 && r.other[1] != null) {
				const bca = <nsbca>r.other[1];
				this._anim = new nitroAnimator(r.mdl[0].bmd, bca);
			}
			if (r.other.length > 2 && r.other[2] != null) {
				const btp = <nsbtp>r.other[2]
				this._res.mdl[0].loadTexPAnim(btp);
			}
		}
	}
}