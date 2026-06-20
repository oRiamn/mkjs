//
// nitroAudio.js
//--------------------
// Provides an interface for playing nds music and sound effects.
// by RHY3756547
//

import { sdat } from "../formats/sdat";
import { SSEQWaveCache } from "./SSEQWaveCache";
import { SSEQPlayer, SSEQPlayer_param } from "./sseqPlayer";

type AudioWindow = Window &
	typeof globalThis & {
		webkitAudioContext?: typeof AudioContext;
	};

const audioWindow = window as AudioWindow;
audioWindow.AudioContext = audioWindow.AudioContext || audioWindow.webkitAudioContext!;

export type nitroAudioSoundProps = {
	pos?: vec3;
	vel?: vec3;
	lastPos?: vec3 | null;
	refDistance?: number;
	rolloffFactor?: number;
	panningModel?: PanningModelType;
};

export type nitroAudioSoundTarget = nitroAudioSoundProps & {
	soundProps?: nitroAudioSoundProps;
};

export type nitroAudioSound = {
	seq: SSEQPlayer;
	panner: PannerNode;
	gainN: GainNode;
	dead: boolean;
	killing: boolean;
	obj: nitroAudioSoundTarget | null;
};

export class nitroAudio {
	static ctx: AudioContext;
	static sounds: nitroAudioSound[] = [];
	static sdat: sdat;

	static init(sdat: sdat) {
		nitroAudio.ctx = new AudioContext();
		nitroAudio.ctx = nitroAudio.ctx;

		// var listener = nitroAudio.ctx.listener;
		// listener.dopplerFactor = 1;
		// listener.speedOfSound = 100 / 1024; //343.3

		SSEQWaveCache.init(sdat, nitroAudio.ctx);
		nitroAudio.sdat = sdat;

		const suspendAudio = () => {
			void nitroAudio.ctx.suspend();
		};
		const resumeAudio = () => {
			if (!document.hidden) void nitroAudio.ctx.resume();
		};

		document.addEventListener("visibilitychange", () => {
			if (document.hidden) suspendAudio();
			else resumeAudio();
		});
		window.addEventListener("blur", suspendAudio);
		window.addEventListener("focus", resumeAudio);
	}

	static updateListener(pos: vec3 | null, view: mat4) {
		if (pos == null) return;
		const listener = nitroAudio.ctx.listener;
		if (listener.positionX == null) {
			//use old setters. safari ios
			listener.setPosition(pos[0], pos[1], pos[2]);
			listener.setOrientation(view[8], -view[9], -view[10], view[4], view[5], view[6]);
		} else {
			listener.positionX.value = pos[0];
			listener.positionY.value = pos[1];
			listener.positionZ.value = pos[2];
			listener.forwardX.value = view[8];
			listener.forwardY.value = -view[9];
			listener.forwardZ.value = -view[10];
			listener.upX.value = view[4];
			listener.upY.value = view[5];
			listener.upZ.value = view[6];
		}
	}

	static tick() {
		for (let i = 0; i < nitroAudio.sounds.length; i++) {
			const snd = nitroAudio.sounds[i];
			snd.seq.tick();
			if (snd.obj != null && snd.obj.soundProps != null && snd.panner != null)
				nitroAudio._updatePanner(snd.panner, snd.obj.soundProps);
		}
		for (let i = 0; i < nitroAudio.sounds.length; i++) {
			const snd = nitroAudio.sounds[i];
			snd.dead = snd.seq.dead;
			if (snd.dead) {
				snd.gainN.disconnect();
				nitroAudio.sounds.splice(i--, 1);
			}
		}
	}

	static kill(sound: nitroAudioSound) {
		if (!sound.killing) {
			sound.killing = true;
			sound.seq.kill();
		}
	}

	static instaKill(sound: nitroAudioSound | null) {
		//instantly kills a sound
		if (sound == null) return;
		const ind = nitroAudio.sounds.indexOf(sound);
		sound.gainN.disconnect();
		if (ind == -1) return;
		nitroAudio.sounds.splice(ind, 1);
	}

	static killAll() {
		const sounds = nitroAudio.sounds.splice(0);
		for (const snd of sounds) {
			try {
				snd.seq.instaKill();
			} catch {
				/* sequence may already be dead */
			}
			try {
				snd.gainN.disconnect();
			} catch {
				/* already disconnected */
			}
			try {
				snd.panner?.disconnect();
			} catch {
				/* no panner */
			}
		}
	}

	static playSound(
		seqN: number,
		params: SSEQPlayer_param | null,
		arcN: number | null,
		obj: nitroAudioSoundTarget | null
	): nitroAudioSound | null {
		//if arc is not specified, we just play a normal sequence. this allows 3 overloads.
		//obj should have a property "soundProps" where it sets its falloff, position and velocity relative to the oberver occasionally
		const sound: nitroAudioSound = {
			dead: false,
			killing: false,
			obj: obj,
			seq: undefined!,
			panner: undefined!,
			gainN: undefined!,
		};

		let output: PannerNode | GainNode;
		if (obj != null) {
			//if obj is not null then we have a 3d target to assign this sound to.
			output = nitroAudio.ctx.createPanner();
			sound.gainN = nitroAudio.ctx.createGain();
			sound.gainN.connect(nitroAudio.ctx.destination);
			output.connect(sound.gainN);
			sound.panner = output;

			if (obj.soundProps == null) obj.soundProps = obj;
			nitroAudio._updatePanner(sound.panner, obj.soundProps);
		} else {
			output = nitroAudio.ctx.createGain();
			sound.gainN = output;
			output.connect(nitroAudio.ctx.destination);
		}

		if (arcN == null) {
			const seq0 = nitroAudio.sdat.sections["$INFO"][0][seqN];
			if (seq0 == null) return null;
			sound.seq = new SSEQPlayer(seq0, nitroAudio.sdat, nitroAudio.ctx, output, params);
		} else {
			const arc = nitroAudio.sdat.sections["$INFO"][1][arcN];
			if (arc == null) return null;
			const seq = arc.arc.entries[seqN];
			if (seq == null) return null;
			sound.seq = new SSEQPlayer(seq, nitroAudio.sdat, nitroAudio.ctx, output, params);
		}

		//now that we have the player, package it in an object
		nitroAudio.sounds.push(sound);
		return sound;
	}

	private static _updatePanner(panner: PannerNode, soundProps: nitroAudioSoundProps | null) {
		if (panner == null || soundProps == null) return;
		if (soundProps.pos != null) panner.setPosition(soundProps.pos[0], soundProps.pos[1], soundProps.pos[2]);
		//if (soundProps.vel != null) panner.setVelocity(soundProps.vel[0], soundProps.vel[1], soundProps.vel[2]);

		panner.refDistance = soundProps.refDistance || 192;
		if (soundProps.panningModel != null) panner.panningModel = soundProps.panningModel;
		panner.rolloffFactor = soundProps.rolloffFactor || 1;
	}
}
