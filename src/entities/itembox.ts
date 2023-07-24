//
// itembox.js
//--------------------
// Drives and animates itembox entity.
// by RHY3756547
//

import { nitroAudio } from "../audio/nitroAudio";
import { nkm_section_OBJI } from "../formats/nkm";
import { nsbca } from "../formats/nsbca";
import { ItemShard } from "../particles/itemboxShard";
import { NitroEmitter } from "../particles/nitroEmitter";
import { nitroAnimator, nitroAnimator_matStack } from "../render/nitroAnimator";
import { nitroRender } from "../render/nitroRender";

export class ItemBox implements SceneEntityObject {
	collidable: boolean;
	_obji: nkm_section_OBJI;
	_res: ProvidedRes;
	_anim: nitroAnimator;
	_animFrame: number;
	_animMat: nitroAnimator_matStack;
	_frames: number;
	pos: vec3;
	scale: vec3;
	mode: number;
	time: number;
	soundProps: {
		lastPos: vec3;
		pos: vec3;
		refDistance: number;
		rolloffFactor: number;
	};
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		this._obji = obji;
		this._res = undefined;

		this._anim = undefined;
		this._animFrame = 0;
		this._animMat = undefined;
		this._frames = 0;

		this.pos = vec3.clone(this._obji.pos);
		//this.angle = vec3.clone(obji.angle);
		this.scale = vec3.clone(this._obji.scale);

		this.soundProps = {
			lastPos: this.pos,
			pos: this.pos,
			refDistance: 192,
			rolloffFactor: 1,
		};	

		this.mode = 0;
		this.time = 0;
	}

	update(scene: Scene) {
		switch (this.mode) {
			case 0: //alive
				for (var i = 0; i < scene.karts.length; i++) {
					var ok = scene.karts[i];
					var dist = vec3.dist(vec3.add([0, 0, 0], this.pos, [0, 1, 0]), ok.pos);
					if (dist < 24) {
						var breakSound = nitroAudio.playSound(212, {}, 0, this);
						breakSound.gainN.gain.value = parseFloat("4");
						for (var j = 0; j < 10; j++) {
							scene.particles.push(new ItemShard(scene, ok, this._res.mdl[2]));
						}
						scene.particles.push(new NitroEmitter(scene, ok, 47));
						this.mode = 1;
						this.time = 0;
						ok.items.getItem(null); //todo: specific item from some
						break;
					}
				}
				break;
			case 1: //dead
				if (this.time++ > 30) {
					this.mode = 2;
					this.time = 0;
				}
				break;
			case 2: //respawning
				if (this.time++ > 30) {
					this.mode = 0;
					this.time = 0;
				}
				break;
		}

		this._animMat = this._anim.setFrame(0, 0, this._animFrame);
		this._animFrame = (this._animFrame + 1) % this._frames;
	}

	draw(view: mat4, pMatrix: mat4, gl: CustomWebGLRenderingContext) {
		if (this.mode == 0 || this.mode == 2) {
			if (this.mode == 2) nitroRender.setColMult([1, 1, 1, this.time / 30]);
			var mat = mat4.translate(mat4.create(), view, this.pos);

			mat4.scale(mat, mat, vec3.scale([0, 0, 0], this.scale, 16));

			//res.mdl[2].draw(mat, pMatrix);

			mat4.translate(mat, mat, [0, 1, 0])

			gl.enable(gl.CULL_FACE); //box part
			//gl.depthMask(false);
			this._res.mdl[0].drawPoly(mat, pMatrix, 0, 1, this._animMat);
			//gl.depthMask(true);
			gl.disable(gl.CULL_FACE);

			//question mark part
			gl.depthRange(0, 0.99); //hack to push question mark forward in z buffer, causes a few issues with far away boxes though
			this._res.mdl[0].drawPoly(mat, pMatrix, 0, 0, this._animMat);
			gl.depthRange(0, 1);

			if (this.mode == 2) nitroRender.setColMult([1, 1, 1, 1]);
		}
	}

	sndUpdate() {
		/*
		t.soundProps.pos = vec3.transformMat4([], t.pos, view);
		if (t.soundProps.lastPos != null) t.soundProps.vel = vec3.sub([], t.soundProps.pos, t.soundProps.lastPos);
		else t.soundProps.vel = [0, 0, 0];
		*/
		this.soundProps.lastPos = this.soundProps.pos;
		this.soundProps.pos = this.pos; //todo: reintroduce doppler via emulation

		this.soundProps.refDistance = 192;
		this.soundProps.rolloffFactor = 1;
	}

	requireRes() { //scene asks what resources to load
		return {
			mdl: [
				{ nsbmd: "itembox.nsbmd" },
				{ nsbmd: "obj_shadow.nsbmd" },
				{ nsbmd: "itembox_hahen.nsbmd" }
			],
			other: [
				"itembox.nsbca"
			]
		};
	}

	provideRes(r: ProvidedRes) {
		this._res = r; //...and gives them to us. :)

		const bca = <nsbca>r.other[0];
		const bmd = r.mdl[0].bmd;

		this._anim = new nitroAnimator(bmd, bca);
		this._frames = bca.animData.objectData[0].frames;
		this._animFrame = Math.floor(Math.random() * this._frames);
		this._animMat = this._anim.setFrame(0, 0, this._animFrame);
	}

}