//
// objDatabase.js
//--------------------
// Links object IDs to specific entity types. Must be initialized after all js files are loaded!
// by RHY3756547
//
// includes:
// entities/*
//

import { ItemBox } from "./itembox";
import { ObjDecor } from "./objDecor";
import { BeachTree } from "./objDecor/BeachTree";
import { ObjBridge } from "./platforms/objBridge";
import { ObjRotaryRoom } from "./platforms/objRotaryRoom";
import { ObjRoutePlatform } from "./platforms/objRoutePlatform";
import { ObjGear } from "./rotatingGear";
import { ObjSoundMaker } from "./soundMaker";
import { ObjTruck, ObjCar, ObjBus } from "./trafficCar";
import { ObjWater } from "./water";

export class objDatabase {
	static idToType: SceneEntityObjectConstructor[] = new Array<SceneEntityObjectConstructor>();

	static init() {
		objDatabase.idToType[0x0001] = ObjWater;
		objDatabase.idToType[0x0003] = ObjWater;
		objDatabase.idToType[0x0006] = ObjWater;
		objDatabase.idToType[0x0008] = ObjSoundMaker;
		objDatabase.idToType[0x0009] = ObjWater;
		objDatabase.idToType[0x000c] = ObjWater;

		objDatabase.idToType[0x0065] = ItemBox;

		objDatabase.idToType[0x00ca] = ObjRoutePlatform;
		objDatabase.idToType[0x00cb] = ObjGear;
		objDatabase.idToType[0x00ce] = ObjGear; //test_cylinder, tick tock clock end
		objDatabase.idToType[0x00d0] = ObjRotaryRoom;
		objDatabase.idToType[0x00d1] = ObjGear; //rotary bridge

		objDatabase.idToType[0x012d] = BeachTree;
		objDatabase.idToType[0x012e] = BeachTree;
		objDatabase.idToType[0x012f] = ObjDecor;

		objDatabase.idToType[0x0130] = ObjDecor;
		objDatabase.idToType[0x0131] = ObjDecor;
		objDatabase.idToType[0x0132] = ObjDecor;
		objDatabase.idToType[0x0133] = ObjDecor;
		objDatabase.idToType[0x0134] = ObjDecor;
		objDatabase.idToType[0x0135] = ObjDecor;
		objDatabase.idToType[0x0138] = ObjDecor;
		objDatabase.idToType[0x0139] = ObjDecor;
		objDatabase.idToType[0x013c] = ObjDecor; //DEBUG: cheep cheep (routed)
		objDatabase.idToType[0x013d] = ObjDecor; //DEBUG: ghost

		objDatabase.idToType[0x013a] = ObjDecor; //figure 8 tree
		objDatabase.idToType[0x013c] = ObjDecor;
		objDatabase.idToType[0x013f] = ObjDecor;

		objDatabase.idToType[0x0140] = ObjDecor;
		objDatabase.idToType[0x0142] = ObjDecor; //more trees
		objDatabase.idToType[0x0145] = ObjDecor;
		objDatabase.idToType[0x0146] = ObjDecor;
		objDatabase.idToType[0x0148] = ObjDecor;
		objDatabase.idToType[0x0149] = ObjDecor; //yoshi falls egg

		objDatabase.idToType[0x014b] = ObjDecor;
		objDatabase.idToType[0x014c] = ObjDecor;
		objDatabase.idToType[0x014d] = ObjDecor;
		objDatabase.idToType[0x014e] = ObjDecor;
		objDatabase.idToType[0x014f] = ObjDecor;

		objDatabase.idToType[0x0150] = ObjDecor;
		objDatabase.idToType[0x0151] = ObjDecor;
		objDatabase.idToType[0x0152] = ObjDecor;
		objDatabase.idToType[0x0153] = ObjDecor;
		objDatabase.idToType[0x0154] = ObjDecor; //rainbow star
		objDatabase.idToType[0x0155] = ObjDecor;
		objDatabase.idToType[0x0156] = ObjDecor;
		objDatabase.idToType[0x0157] = ObjDecor;

		objDatabase.idToType[0x019c] = ObjTruck;
		objDatabase.idToType[0x019a] = ObjCar;
		objDatabase.idToType[0x0195] = ObjBus;

		objDatabase.idToType[0x00cc] = ObjBridge; //DEBUG: pianta bridge
		objDatabase.idToType[0x000d] = ObjDecor; //DEBUG: puddle

		objDatabase.idToType[0x0158] = ObjDecor; //DEBUG: airship (routed)

		//DEBUG ENEMIES AS DECOR: switch as implemented:

		objDatabase.idToType[0x0191] = ObjDecor;
		objDatabase.idToType[0x0192] = ObjDecor;
		objDatabase.idToType[0x0193] = ObjDecor;
		objDatabase.idToType[0x0196] = ObjDecor;
		objDatabase.idToType[0x0198] = ObjDecor;
		objDatabase.idToType[0x0199] = ObjDecor;
		//truck
		objDatabase.idToType[0x019b] = ObjDecor;
		objDatabase.idToType[0x019d] = ObjDecor;
		objDatabase.idToType[0x019e] = ObjDecor;

		objDatabase.idToType[0x01a0] = ObjDecor;
		objDatabase.idToType[0x01a1] = ObjDecor;
		objDatabase.idToType[0x01a3] = ObjDecor;
		objDatabase.idToType[0x01a4] = ObjDecor;
		objDatabase.idToType[0x01a5] = ObjDecor;
		objDatabase.idToType[0x01a6] = ObjDecor;
		objDatabase.idToType[0x01a7] = ObjDecor;
		objDatabase.idToType[0x01a8] = ObjDecor;
		objDatabase.idToType[0x01a9] = ObjDecor;

		objDatabase.idToType[0x01aa] = ObjDecor;
		objDatabase.idToType[0x01ac] = ObjDecor;
		objDatabase.idToType[0x01ad] = ObjDecor;
		//rotating fireballs

		objDatabase.idToType[0x01b0] = ObjDecor;
		objDatabase.idToType[0x01b1] = ObjDecor;
		objDatabase.idToType[0x01b2] = ObjDecor;
		objDatabase.idToType[0x01b3] = ObjDecor;
		objDatabase.idToType[0x01b4] = ObjDecor;
		objDatabase.idToType[0x01b5] = ObjDecor;
	}
}
