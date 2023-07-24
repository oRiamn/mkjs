//
// swav.js
//--------------------
// Reads swav files.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
//

import { MKSUtils } from "./utils";

// todo implements MKJSDataFormator
export class swav {
	input: MKJSDataInput | DataView;
	hasHead: boolean;
	dataView: boolean;
	indChanges: number[];
	ADPCMTable: number[];
	waveType: number;
	bLoop: number;
	nSampleRate: number;
	nTime: number;
	nLoopOff: number;
	nNonLoopLen: number;
	bytesize: number;
	mul: number;
	loopSTime: number;
	data: Float32Array;
	constructor(input: MKJSDataInput | DataView, hasHead: boolean, dataView: boolean) {

		this.input = input;
		this.hasHead = hasHead;
		this.dataView = dataView;

		this.indChanges = [-1, -1, -1, -1, 2, 4, 6, 8];
		this.ADPCMTable = [
			0x0007, 0x0008, 0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x000E, 0x0010, 0x0011, 0x0013, 0x0015,
			0x0017, 0x0019, 0x001C, 0x001F, 0x0022, 0x0025, 0x0029, 0x002D, 0x0032, 0x0037, 0x003C, 0x0042,
			0x0049, 0x0050, 0x0058, 0x0061, 0x006B, 0x0076, 0x0082, 0x008F, 0x009D, 0x00AD, 0x00BE, 0x00D1,
			0x00E6, 0x00FD, 0x0117, 0x0133, 0x0151, 0x0173, 0x0198, 0x01C1, 0x01EE, 0x0220, 0x0256, 0x0292,
			0x02D4, 0x031C, 0x036C, 0x03C3, 0x0424, 0x048E, 0x0502, 0x0583, 0x0610, 0x06AB, 0x0756, 0x0812,
			0x08E0, 0x09C3, 0x0ABD, 0x0BD0, 0x0CFF, 0x0E4C, 0x0FBA, 0x114C, 0x1307, 0x14EE, 0x1706, 0x1954,
			0x1BDC, 0x1EA5, 0x21B6, 0x2515, 0x28CA, 0x2CDF, 0x315B, 0x364B, 0x3BB9, 0x41B2, 0x4844, 0x4F7E,
			0x5771, 0x602F, 0x69CE, 0x7462, 0x7FFF
		]; //thanks no$gba docs


		if (this.input != null) {
			this.load(this.input, this.hasHead, this.dataView);
		}

	}

	load(input: MKJSDataInput | DataView, hasHead: boolean, dataView: boolean): void {
		var view = (dataView) ? input as DataView : (new DataView(input as MKJSDataInput));
		var offset = 0;

		if (hasHead) {
			var stamp = MKSUtils.asciireadChar(view, 0x0) + MKSUtils.asciireadChar(view, 0x1) + MKSUtils.asciireadChar(view, 0x2) + MKSUtils.asciireadChar(view, 0x3);
			if (stamp != "SWAV") throw "SWAV invalid. Expected SWAV, found " + stamp;
			offset += 16;
			var data = MKSUtils.asciireadChar(view, offset) + MKSUtils.asciireadChar(view, offset + 1) + MKSUtils.asciireadChar(view, offset + 2) + MKSUtils.asciireadChar(view, offset + 3);
			if (data != "DATA") throw "SWAV invalid, expected DATA, found " + data;
			offset += 8;
		}

		this.waveType = view.getUint8(offset);
		this.bLoop = view.getUint8(offset + 1);
		this.nSampleRate = view.getUint16(offset + 2, true);
		if (this.nSampleRate < 3000) {
			throw "BAD SAMPLE RATE! " + this.nSampleRate;
		}
		this.nTime = view.getUint16(offset + 4, true);
		this.nLoopOff = view.getUint16(offset + 6, true);
		this.nNonLoopLen = view.getUint32(offset + 8, true);
		this.bytesize = (this.nLoopOff + this.nNonLoopLen) * 4;
		this.mul = 1;

		offset += 12;
		switch (this.waveType) {
			case 0:
				var size = this.bytesize;
				this.data = new Float32Array(size);
				for (var i = 0; i < size; i++) {
					this.data[i] = view.getInt8(offset++) / 0x7F;
				}
				this.loopSTime = (this.nLoopOff * 4) / this.nSampleRate;
				break;
			case 1:
				var size = this.bytesize / 2;
				this.data = new Float32Array(size);
				for (var i = 0; i < size; i++) {
					this.data[i] = view.getInt16(offset, true) / 0x7FFF;
					offset += 2;
				}
				this.loopSTime = (this.nLoopOff * 2) / this.nSampleRate;
				break;
			case 2:
				this.data = this._decodeADPCM(view, offset);
				this.loopSTime = ((this.nLoopOff - 1) * 8) / this.nSampleRate;
				break;
		}
	}

	getAudioBuffer(ctx: BaseAudioContext): AudioBuffer {
		while (true) {
			try {
				var buf = ctx.createBuffer(1, this.data.length, this.nSampleRate);
				buf.getChannelData(0).set(this.data);
				return buf;
			} catch (e) {
				this.nSampleRate *= 2; //keep increasing sample rate until the target supports it.
				this.loopSTime /= 2;
				this.mul *= 2;
			}
			if (this.nSampleRate > 96000) {
				return ctx.createBuffer(1, 1, 44000); //give up and return an empty buffer

			}
		}
	}

	_decodeADPCM(view: DataView, off: number): Float32Array {
		var pcm = view.getUint16(off, true); //initial pcm
		var ind = view.getUint8(off + 2); //initial index
		off += 4;

		var size = this.bytesize - 4;
		var out = new Float32Array((size * 2));
		var write = 0;
		//out[write++] = pcm/0x7FFF;

		for (var i = 0; i < size; i++) {
			var b = view.getUint8(off++);
			for (var j = 0; j < 2; j++) {
				var nibble = (b >> (j * 4)) & 15;

				var diff = Math.floor(((nibble & 7) * 2 + 1) * this.ADPCMTable[ind] / 8);
				if (nibble & 8) pcm = Math.max(pcm - diff, -0x7FFF);
				else pcm = Math.min(pcm + diff, 0x7FFF);
				out[write++] = pcm / 0x7FFF;

				ind = Math.min(88, Math.max(0, ind + this.indChanges[nibble & 7]));
			}
		}
		return out;
	}
}