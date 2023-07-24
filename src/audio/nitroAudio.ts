//
// nitroAudio.js
//--------------------
// Provides an interface for playing nds music and sound effects.
// by RHY3756547
//

import { sdat } from "../formats/sdat";
import { SSEQWaveCache } from "./SSEQWaveCache";
import { SSEQPlayer } from "./sseqPlayer";

window.AudioContext = window.AudioContext || (window as any).webkitAudioContext;


export type nitroAudioSound = {
	seq: SSEQPlayer;
	panner: PannerNode;
	gainN: GainNode;
	dead: boolean,
	killing: boolean,
	obj: any;
};

export class nitroAudio {

	static ctx: AudioContext = undefined;
	static sounds: nitroAudioSound[] = [];
	static sdat: sdat = null;


	static init(sdat: sdat) {
		nitroAudio.ctx = new AudioContext();
		nitroAudio.ctx = nitroAudio.ctx;

		// var listener = nitroAudio.ctx.listener;
		// listener.dopplerFactor = 1;
		// listener.speedOfSound = 100 / 1024; //343.3

		SSEQWaveCache.init(sdat, nitroAudio.ctx);
		nitroAudio.sdat = sdat;
	}

	static updateListener(pos: vec3, view: mat4) {
		var listener = nitroAudio.ctx.listener;
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
		for (var i = 0; i < nitroAudio.sounds.length; i++) {
			var snd = nitroAudio.sounds[i];
			snd.seq.tick();
			if (snd.obj != null && snd.obj.soundProps != null && snd.panner != null) nitroAudio._updatePanner(snd.panner, snd.obj.soundProps);
		}
		for (var i = 0; i < nitroAudio.sounds.length; i++) {
			var snd = nitroAudio.sounds[i];
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

	static instaKill(sound: nitroAudioSound) { //instantly kills a sound
		if (sound == null) return;
		var ind = nitroAudio.sounds.indexOf(sound)
		sound.gainN.disconnect();
		if (ind == -1) return;
		nitroAudio.sounds.splice(ind, 1);
	}

	static playSound(seqN: number, params: any, arcN: number, obj: any) { //if arc is not specified, we just play a normal sequence. this allows 3 overloads. 
		//obj should have a property "soundProps" where it sets its falloff, position and velocity relative to the oberver occasionally
		var sound: nitroAudioSound = { 
			dead: false, 
			killing: false, 
			obj: obj,
			seq:undefined,
			panner:undefined,
			gainN:undefined,
		};

		var output;
		if (obj != null) { //if obj is not null then we have a 3d target to assign this sound to.
			output = nitroAudio.ctx.createPanner();
			sound.gainN = nitroAudio.ctx.createGain();
			sound.gainN.connect(nitroAudio.ctx.destination);
			output.connect(sound.gainN);
			sound.panner = output;

			if (sound.obj.soundProps == null) sound.obj.soundProps = obj;
			nitroAudio._updatePanner(sound.panner, sound.obj.soundProps);
		} else {
			output = nitroAudio.ctx.createGain();
			sound.gainN = output;
			output.connect(nitroAudio.ctx.destination);
		}

		if (arcN == null) {
			var seq0 = nitroAudio.sdat.sections["$INFO"][0][seqN];
			if (seq0 == null) return;
			sound.seq = new SSEQPlayer(seq0, nitroAudio.sdat, nitroAudio.ctx, output, params);
		} else {
			var arc = nitroAudio.sdat.sections["$INFO"][1][arcN];
			if (arc == null) return;
			var seq = arc.arc.entries[seqN];
			if (seq == null) return;
			sound.seq = new SSEQPlayer(seq, nitroAudio.sdat, nitroAudio.ctx, output, params);
		}

		//now that we have the player, package it in an object
		nitroAudio.sounds.push(sound);
		return sound;
	}

	static _updatePanner(panner: PannerNode, soundProps: any) {
		if (panner == null || soundProps == null) return;
		if (soundProps.pos != null) panner.setPosition(soundProps.pos[0], soundProps.pos[1], soundProps.pos[2]);
		//if (soundProps.vel != null) panner.setVelocity(soundProps.vel[0], soundProps.vel[1], soundProps.vel[2]);

		panner.refDistance = soundProps.refDistance || 192;
		if (soundProps.panningModel != null) panner.panningModel = soundProps.panningModel;
		panner.rolloffFactor = soundProps.rolloffFactor || 1;
	}
}