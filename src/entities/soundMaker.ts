//
// soundMaker.js
//--------------------
// Provides env sound object, such as crowd for figure 8
// by RHY3756547
//

import { nitroAudio, nitroAudioSound } from "../audio/nitroAudio";
import { nkm_section_OBJI } from "../formats/nkm";

//0008

export class ObjSoundMaker implements SceneEntityObject {
	collidable: boolean;
	obji: nkm_section_OBJI;
	pos: vec3;
	soundProps: {
		pos: vec3,
		refDistance: number,
		rolloffFactor: number,
	};
	sound: nitroAudioSound;
	sN: number;
	threshold: number;
	gain: number;
	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		this.obji = obji;
		this.pos = vec3.clone(this.obji.pos);
		this.soundProps = {
			pos: this.pos,
			refDistance: 1024,
			rolloffFactor: 1

		};
		this.sound = null;
		this.sN = 0;
		this.threshold = 0.2;
		this.gain = 1;
		switch (this.obji.ID) {
			case 0x0008:
				this.sN = 259;
				this.gain = 2;
				this.threshold = 0.2;
				break;
		}
	}

	draw() {

	}

	update() {
	}

	sndUpdate(view: mat4) {
		//t.soundProps.pos = vec3.transformMat4([], t.pos, view);
		//t.soundProps.pos = [0, 0, Math.sqrt(vec3.dot(t.soundProps.pos, t.soundProps.pos))]
		//if (t.soundProps.lastPos != null) t.soundProps.vel = vec3.sub([], t.soundProps.pos, t.soundProps.lastPos);
		//else t.soundProps.vel = [0, 0, 0];
		//t.soundProps.lastPos = t.soundProps.pos;

		this.soundProps.pos = this.pos; //todo: when reintroducing doppler, disable it on this source

		this.soundProps.refDistance = 1024;
		//t.soundProps.rolloffFactor = 1;

		var relPos = vec3.transformMat4([0, 0, 0], this.pos, view);

		var calcVol = (this.soundProps.refDistance / (this.soundProps.refDistance + this.soundProps.rolloffFactor * (relPos[2] - this.soundProps.refDistance)));

		if (calcVol < this.threshold) {
			if (this.sound != null) {
				nitroAudio.instaKill(this.sound);
				this.sound = null;
			}
		} else {
			if (this.sound == null) {
				this.sound = nitroAudio.playSound(this.sN, {}, 0, this);
				this.sound.gainN.gain.value = parseFloat(`${this.gain}`);
			}
		}
	}

	requireRes(): { mdl: { nsbmd: string }[] } {
		return { mdl: [] };
	}

	provideRes(r: ProvidedRes) { }

}