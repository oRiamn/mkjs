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

	static idToType: typeof SceneEntityObject[] =  new Array<typeof SceneEntityObject>();

	static init() {

		objDatabase.idToType[0x0001] = ObjWater;
		objDatabase.idToType[0x0003] = ObjWater;
		objDatabase.idToType[0x0006] = ObjWater;
		objDatabase.idToType[0x0008] = ObjSoundMaker;
		objDatabase.idToType[0x0009] = ObjWater;
		objDatabase.idToType[0x000C] = ObjWater;

		objDatabase.idToType[0x0065] = ItemBox;

		objDatabase.idToType[0x00CA] = ObjRoutePlatform;
		objDatabase.idToType[0x00CB] = ObjGear;
		objDatabase.idToType[0x00CE] = ObjGear; //test_cylinder, tick tock clock end
		objDatabase.idToType[0x00D0] = ObjRotaryRoom;
		objDatabase.idToType[0x00D1] = ObjGear; //rotary bridge		

		objDatabase.idToType[0x012D] = BeachTree;
		objDatabase.idToType[0x012E] = BeachTree;
		objDatabase.idToType[0x012F] = ObjDecor;

		objDatabase.idToType[0x0130] = ObjDecor;
		objDatabase.idToType[0x0131] = ObjDecor;
		objDatabase.idToType[0x0132] = ObjDecor;
		objDatabase.idToType[0x0133] = ObjDecor;
		objDatabase.idToType[0x0134] = ObjDecor;
		objDatabase.idToType[0x0135] = ObjDecor;
		objDatabase.idToType[0x0138] = ObjDecor;
		objDatabase.idToType[0x0139] = ObjDecor;
		objDatabase.idToType[0x013C] = ObjDecor; //DEBUG: cheep cheep (routed)
		objDatabase.idToType[0x013D] = ObjDecor; //DEBUG: ghost

		objDatabase.idToType[0x013A] = ObjDecor; //figure 8 tree
		objDatabase.idToType[0x013C] = ObjDecor;
		objDatabase.idToType[0x013F] = ObjDecor;

		objDatabase.idToType[0x0140] = ObjDecor;
		objDatabase.idToType[0x0142] = ObjDecor; //more trees
		objDatabase.idToType[0x0145] = ObjDecor;
		objDatabase.idToType[0x0146] = ObjDecor;
		objDatabase.idToType[0x0148] = ObjDecor;
		objDatabase.idToType[0x0149] = ObjDecor; //yoshi falls egg

		objDatabase.idToType[0x014B] = ObjDecor;
		objDatabase.idToType[0x014C] = ObjDecor;
		objDatabase.idToType[0x014D] = ObjDecor;
		objDatabase.idToType[0x014E] = ObjDecor;
		objDatabase.idToType[0x014F] = ObjDecor;

		objDatabase.idToType[0x0150] = ObjDecor;
		objDatabase.idToType[0x0151] = ObjDecor;
		objDatabase.idToType[0x0152] = ObjDecor;
		objDatabase.idToType[0x0153] = ObjDecor;
		objDatabase.idToType[0x0154] = ObjDecor; //rainbow star
		objDatabase.idToType[0x0155] = ObjDecor;
		objDatabase.idToType[0x0156] = ObjDecor;
		objDatabase.idToType[0x0157] = ObjDecor;

		objDatabase.idToType[0x019C] = ObjTruck;
		objDatabase.idToType[0x019A] = ObjCar;
		objDatabase.idToType[0x0195] = ObjBus;


		objDatabase.idToType[0x00CC] = ObjBridge; //DEBUG: pianta bridge
		objDatabase.idToType[0x000D] = ObjDecor; //DEBUG: puddle

		objDatabase.idToType[0x0158] = ObjDecor; //DEBUG: airship (routed)

		//DEBUG ENEMIES AS DECOR: switch as implemented:

		objDatabase.idToType[0x0191] = ObjDecor;
		objDatabase.idToType[0x0192] = ObjDecor;
		objDatabase.idToType[0x0193] = ObjDecor;
		objDatabase.idToType[0x0196] = ObjDecor;
		objDatabase.idToType[0x0198] = ObjDecor;
		objDatabase.idToType[0x0199] = ObjDecor;
		//truck
		objDatabase.idToType[0x019B] = ObjDecor;
		objDatabase.idToType[0x019D] = ObjDecor;
		objDatabase.idToType[0x019E] = ObjDecor;

		objDatabase.idToType[0x01A0] = ObjDecor;
		objDatabase.idToType[0x01A1] = ObjDecor;
		objDatabase.idToType[0x01A3] = ObjDecor;
		objDatabase.idToType[0x01A4] = ObjDecor;
		objDatabase.idToType[0x01A5] = ObjDecor;
		objDatabase.idToType[0x01A6] = ObjDecor;
		objDatabase.idToType[0x01A7] = ObjDecor;
		objDatabase.idToType[0x01A8] = ObjDecor;
		objDatabase.idToType[0x01A9] = ObjDecor;

		objDatabase.idToType[0x01AA] = ObjDecor;
		objDatabase.idToType[0x01AC] = ObjDecor;
		objDatabase.idToType[0x01AD] = ObjDecor;
		//rotating fireballs

		objDatabase.idToType[0x01B0] = ObjDecor;
		objDatabase.idToType[0x01B1] = ObjDecor;
		objDatabase.idToType[0x01B2] = ObjDecor;
		objDatabase.idToType[0x01B3] = ObjDecor;
		objDatabase.idToType[0x01B4] = ObjDecor;
		objDatabase.idToType[0x01B5] = ObjDecor;
	}

}