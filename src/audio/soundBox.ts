import { nitroAudio, nitroAudioSound, nitroAudioSoundTarget } from "./nitroAudio";
import { SSEQPlayer_param } from "./sseqPlayer";

/** Sequence IDs from the MKDS SDAT. */
export const SFX = {
	// Race flow
	RACE_INIT_VS: 11,
	RACE_INIT_BATTLE: 12,
	COUNTDOWN_BEEP: 39,
	RACE_START: 40,
	FINAL_LAP: 62,
	ITEM_CAROUSEL: 62,
	ITEM_CAROUSEL_PICK: 63,
	ITEM_CAROUSEL_PICK_SPECIAL: 64,
	LAP_COMPLETE: 65,

	// Kart
	BOOST: 160,
	KART_ENGINE_BASE: 170,
	KART_HORN_BASE: 193,
	DRIFT_HOP: 207,
	KART_COLLISION: 208,
	DRIFT_RED_SPARK: 209,
	DRIFT_BLUE_SPARK: 210,

	// Items
	ITEM_BOX_BREAK: 212,
	SHELL_WALL_BOUNCE: 214,
	SHELL_DESTROY: 213,
	GREEN_SHELL_FLY: 215,
	RED_SHELL_FLY: 216,
	ITEM_THROW: 218,
	BANANA_DROP: 219,
	SHELL_GROUP_FLY: 227,
	ITEM_EQUIP: 231,
	FAKE_BOX_PLACE: 250,
	FAKE_BOX_HIT: 251,

	// Cannon
	CANNON_SHORT: 345,
	CANNON_LONG: 347,
	CANNON_VOICE_AIRSHIP: 380,
	CANNON_VOICE_WALUIGI: 456,
} as const;

const DEFAULT_ITEM_VOLUME = { volume: 2 } as const;

export class SoundBox {
	private static _play(
		seqN: number,
		params: SSEQPlayer_param | null,
		arcN: number | null,
		obj: nitroAudioSoundTarget | null
	): nitroAudioSound | null {
		return nitroAudio.playSound(seqN, params, arcN, obj);
	}

	// --- Race flow ---

	static raceInitVs(): nitroAudioSound | null {
		return SoundBox._play(SFX.RACE_INIT_VS, DEFAULT_ITEM_VOLUME, null, null);
	}

	static raceInitBattle(): nitroAudioSound | null {
		return SoundBox._play(SFX.RACE_INIT_BATTLE, DEFAULT_ITEM_VOLUME, null, null);
	}

	static countdownBeep(): nitroAudioSound | null {
		return SoundBox._play(SFX.COUNTDOWN_BEEP, { bpmMultiplier: 16 }, 0, null);
	}

	static raceStart(): nitroAudioSound | null {
		return SoundBox._play(SFX.RACE_START, { volume: 2, bpmMultiplier: 16 }, 0, null);
	}

	static finalLap(): nitroAudioSound | null {
		return SoundBox._play(SFX.FINAL_LAP, DEFAULT_ITEM_VOLUME, null, null);
	}

	static lapComplete(): nitroAudioSound | null {
		return SoundBox._play(SFX.LAP_COMPLETE, DEFAULT_ITEM_VOLUME, 0, null);
	}

	static music(seqN: number, params: SSEQPlayer_param | null = { volume: 2 }): nitroAudioSound | null {
		return SoundBox._play(seqN, params, null, null);
	}

	static sting(seqN: number, arcN: number | null = 0): nitroAudioSound | null {
		return SoundBox._play(seqN, DEFAULT_ITEM_VOLUME, arcN, null);
	}

	// --- Item box / carousel ---

	static itemCarousel(): nitroAudioSound | null {
		return SoundBox._play(SFX.ITEM_CAROUSEL, DEFAULT_ITEM_VOLUME, 0, null);
	}

	static itemCarouselPick(special: boolean): nitroAudioSound | null {
		return SoundBox._play(special ? SFX.ITEM_CAROUSEL_PICK_SPECIAL : SFX.ITEM_CAROUSEL_PICK, DEFAULT_ITEM_VOLUME, 0, null);
	}

	static itemBoxBreak(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.ITEM_BOX_BREAK, {}, 0, target);
	}

	// --- Items ---

	static itemThrow(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.ITEM_THROW, DEFAULT_ITEM_VOLUME, 0, target);
	}

	static itemEquip(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.ITEM_EQUIP, DEFAULT_ITEM_VOLUME, 0, target);
	}

	static bananaDrop(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.BANANA_DROP, DEFAULT_ITEM_VOLUME, 0, target);
	}

	static fakeBoxPlace(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.FAKE_BOX_PLACE, DEFAULT_ITEM_VOLUME, 0, target);
	}

	static fakeBoxHit(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.FAKE_BOX_HIT, DEFAULT_ITEM_VOLUME, 0, target);
	}

	// --- Shells ---

	static greenShellFly(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.GREEN_SHELL_FLY, { volume: 1.5 }, 0, target);
	}

	static redShellFly(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.RED_SHELL_FLY, { volume: 1.5 }, 0, target);
	}

	static shellDestroy(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.SHELL_DESTROY, DEFAULT_ITEM_VOLUME, 0, target);
	}

	static shellWallBounce(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.SHELL_WALL_BOUNCE, { volume: 2.5 }, 0, target);
	}

	static shellGroupFly(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.SHELL_GROUP_FLY, { volume: 1.5 }, 0, target);
	}

	static shellGroupEquip(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.ITEM_EQUIP, DEFAULT_ITEM_VOLUME, 0, target);
	}

	// --- Kart ---

	static boost(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.BOOST, {}, 0, target);
	}

	static kartEngine(soundMode: number, transpose: number, target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.KART_ENGINE_BASE + soundMode, { transpose, volume: 1 }, 0, target);
	}

	static driftHop(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.DRIFT_HOP, { transpose: -4 }, 0, target);
	}

	static driftBlueSpark(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.DRIFT_BLUE_SPARK, {}, 0, target);
	}

	static driftRedSpark(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.DRIFT_RED_SPARK, {}, 0, target);
	}

	static kartCollision(target: nitroAudioSoundTarget, volume: number): nitroAudioSound | null {
		return SoundBox._play(SFX.KART_COLLISION, { volume }, 0, target);
	}

	static kartHorn(sndOff: number, target: nitroAudioSoundTarget, volume: number): nitroAudioSound | null {
		return SoundBox._play(SFX.KART_HORN_BASE + sndOff / 14, { volume }, 0, target);
	}

	static characterVoice(
		voiceIndex: number,
		sndOff: number,
		target: nitroAudioSoundTarget,
		volume: number
	): nitroAudioSound | null {
		return SoundBox._play(voiceIndex + sndOff, { volume }, 2, target);
	}

	static surface(seqN: number, target: nitroAudioSoundTarget, params: SSEQPlayer_param | null = {}): nitroAudioSound | null {
		return SoundBox._play(seqN, params, 0, target);
	}

	// --- Cannon ---

	static cannonShort(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.CANNON_SHORT, { volume: 2.5 }, 0, target);
	}

	static cannonLong(target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(SFX.CANNON_LONG, { volume: 2.5 }, 0, target);
	}

	static cannonVoiceAirship(): nitroAudioSound | null {
		return SoundBox._play(SFX.CANNON_VOICE_AIRSHIP, DEFAULT_ITEM_VOLUME, 0, null);
	}

	static cannonVoiceWaluigi(): nitroAudioSound | null {
		return SoundBox._play(SFX.CANNON_VOICE_WALUIGI, DEFAULT_ITEM_VOLUME, 0, null);
	}

	// --- Ambient / map objects ---

	static ambient(seqN: number, target: nitroAudioSoundTarget): nitroAudioSound | null {
		return SoundBox._play(seqN, {}, 0, target);
	}
}
