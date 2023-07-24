import { sdat } from "../formats/sdat";
import { swar } from "../formats/swar";
import { swav } from "../formats/swav";

type SSEQWaveCache_wave = {
    info: swav;
    buf: AudioBuffer;
}

export class SSEQWaveCache {
    static cache: SSEQWaveCache_wave[][] = [];
    static sdat: sdat = undefined;
    static ctx: AudioContext = undefined;

    static cacheWaveArc(num: number) {
        if (SSEQWaveCache.cache[num] == null) {
            var warinfo = SSEQWaveCache.sdat.sections["$INFO"][3]
            if (warinfo[num] == null) return;
            var swar: swar = warinfo[num].arc;
            var arc = swar.samples;
            if (arc == null) return;
            SSEQWaveCache.cache[num] = [];
            for (var i = 0; i < arc.length; i++) {
                const cacheentry: SSEQWaveCache_wave = {
                    info: arc[i],
                    buf: arc[i].getAudioBuffer(SSEQWaveCache.ctx)
                }
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