//
// kartphysicalparam.js
//--------------------
// Provides functionality to read mario kart ds kart physical parameters
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0) (maybe)
//

export type kartphysicalparam_kart = {
	colRadius: number;
	unknown1: number;
	unknown2: number;
	weight: number;
	miniTurbo: number;
	topSpeed: number;
	accel1: number;
	accel2: number;
	accelSwitch: number;
	driftAccel1: number;
	driftAccel2: number;
	driftAccelSwitch: number;
	decel: number;
	turnRate: number;
	driftTurnRate: number;
	driftOffRestore: number;
	unknown3: number;
	colParam: {
		handling: number;
		topSpeedMul: number;
	}[];
};

export class kartphysicalparam implements MKJSDataFormator {
	input: MKJSDataInput;
	karts!: kartphysicalparam_kart[];
	constructor(input: MKJSDataInput) {
		this.input = input;
		if (this.input != null) {
			this.load(this.input);
		}
	}

	load(input: MKJSDataInput) {
		let view = new DataView(input);
		let off = 0;
		this.karts = [];
		for (let i = 0; i < 50; i++) {
			let colParam = [];
			let off1 = off + 0x38;
			let off2 = off + 0x68;
			for (let j = 0; j < 12; j++) {
				let handling = view.getInt32(off1, true) / 4096;
				let topSpeed = view.getInt32(off2, true) / 4096;
				colParam.push({
					handling: handling,
					topSpeedMul: topSpeed,
				});
				off1 += 4;
				off2 += 4;
			}
			this.karts.push({
				colRadius: view.getInt32(off, true) / 4096,
				unknown1: view.getInt32(off + 0x4, true) / 4096,
				unknown2: view.getInt32(off + 0x8, true) / 4096,
				weight: view.getInt16(off + 0xc, true) / 4096,
				miniTurbo: view.getUint16(off + 0xe, true),
				topSpeed: view.getInt32(off + 0x10, true) / 4096,
				accel1: view.getInt32(off + 0x14, true) / 4096,
				accel2: view.getInt32(off + 0x18, true) / 4096,
				accelSwitch: view.getInt32(off + 0x1c, true) / 4096,
				driftAccel1: view.getInt32(off + 0x20, true) / 4096,
				driftAccel2: view.getInt32(off + 0x24, true) / 4096,
				driftAccelSwitch: view.getInt32(off + 0x28, true) / 4096,
				decel: view.getInt32(off + 0x2c, true) / 4096,
				turnRate: (view.getInt16(off + 0x30, true) / 32768) * Math.PI,
				driftTurnRate: (view.getInt16(off + 0x32, true) / 32768) * Math.PI,
				driftOffRestore: (view.getInt16(off + 0x34, true) / 32768) * Math.PI,
				unknown3: view.getInt16(off + 0x36, true),
				colParam,
			});
			off += 0x98;
		}
	}
}
