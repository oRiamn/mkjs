import { sdat } from "../formats/sdat";
import { swar } from "../formats/swar";
import { swav } from "../formats/swav";

export type SSEQWaveCache_wave = {
	info: swav;
	buf: AudioBuffer;
};

export class SSEQWaveCache {
	static cache: SSEQWaveCache_wave[][] = [];
	static sdat: sdat | undefined = undefined;
	static ctx: AudioContext | undefined = undefined;

	static cacheWaveArc(num: number) {
		const sdatFile = SSEQWaveCache.sdat;
		const ctx = SSEQWaveCache.ctx;
		if (sdatFile == null || ctx == null) return;

		if (SSEQWaveCache.cache[num] == null) {
			const warinfo = sdatFile.sections["$INFO"][3];
			if (warinfo[num] == null) return;
			const swar: swar = warinfo[num].arc;
			const arc = swar.samples;
			if (arc == null) return;
			SSEQWaveCache.cache[num] = [];
			for (let i = 0; i < arc.length; i++) {
				const cacheentry: SSEQWaveCache_wave = {
					info: arc[i],
					buf: arc[i].getAudioBuffer(ctx),
				};
				SSEQWaveCache.cache[num].push(cacheentry);
			}
		}
	}

	static getWave(arc: number, num: number): SSEQWaveCache_wave {
		return SSEQWaveCache.cache[arc][num];
	}

	static init(s: sdat, c: AudioContext) {
		SSEQWaveCache.cache = [];
		SSEQWaveCache.sdat = s;
		SSEQWaveCache.ctx = c;
	}
}
