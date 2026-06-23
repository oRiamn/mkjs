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
import { ObjInvisible } from "./objInvisible";
import { ObjBridge } from "./platforms/objBridge";
import { ObjKoopaBall } from "./platforms/objKoopaBall";
import { ObjMovingItemBox } from "./platforms/objMovingItemBox";
import { ObjRotaryRoom } from "./platforms/objRotaryRoom";
import { ObjRouteBasabasa } from "./platforms/objRouteBasabasa";
import { ObjRoutePlatform } from "./platforms/objRoutePlatform";
import { ObjSkyship } from "./platforms/objSkyship";
import { ObjGear } from "./rotatingGear";
import { ObjSoundMaker } from "./soundMaker";
import { ObjTruck, ObjCar, ObjBus } from "./trafficCar";
import { ObjWater } from "./water";
import { BeachTree } from "./objDecor/BeachTree";
import { EarthenPipe } from "./objDecor/EarthenPipe";
import { OpaTree } from "./objDecor/OpaTree";
import { OlgPipe } from "./objDecor/OlgPipe";
import { OlgMush } from "./objDecor/OlgMush";
import { Of6Yoshi } from "./objDecor/Of6Yoshi";
import { Cow } from "./objDecor/Cow";
import { NsKiller } from "./objDecor/NsKiller";
import { GardenTree } from "./objDecor/GardenTree";
import { Kamome } from "./objDecor/Kamome";
import { CrossTree } from "./objDecor/CrossTree";
import { Bakubaku } from "./objDecor/Bakubaku";
import { Teresa } from "./objDecor/Teresa";
import { BankTree } from "./objDecor/BankTree";
import { Chandelier } from "./objDecor/Chandelier";
import { MarioTree } from "./objDecor/MarioTree";
import { TownTree } from "./objDecor/TownTree";
import { SnowTree } from "./objDecor/SnowTree";
import { DeTree } from "./objDecor/DeTree";
import { BankEgg } from "./objDecor/BankEgg";
import { KinoHouse1 } from "./objDecor/KinoHouse1";
import { KinoHouse2 } from "./objDecor/KinoHouse2";
import { KinoMount1 } from "./objDecor/KinoMount1";
import { KinoMount2 } from "./objDecor/KinoMount2";
import { OlaTree } from "./objDecor/OlaTree";
import { OsaTree } from "./objDecor/OsaTree";
import { Picture1 } from "./objDecor/Picture1";
import { Picture2 } from "./objDecor/Picture2";
import { Om6Tree } from "./objDecor/Om6Tree";
import { RainStar } from "./objDecor/RainStar";
import { Of6Tree } from "./objDecor/Of6Tree";
import { TownMonte } from "./objDecor/TownMonte";
import { Puddle } from "./objDecor/Puddle";
import { Airship } from "./objDecor/Airship";
import { Kuribo } from "./objDecor/Kuribo";
import { Rock } from "./objDecor/Rock";
import { Dossun } from "./objDecor/Dossun";
import { Wanwan } from "./objDecor/Wanwan";
import { Bubble } from "./objDecor/Bubble";
import { Choropu } from "./objDecor/Choropu";
import { Pukupuku } from "./objDecor/Pukupuku";
import { Snowman } from "./objDecor/Snowman";
import { Kanoke } from "./objDecor/Kanoke";
import { Basabasa } from "./objDecor/Basabasa";
import { NsCannon } from "./objDecor/NsCannon";
import { MoveTree } from "./objDecor/MoveTree";
import { Burner } from "./objDecor/Burner";
import { WanwanNoBase } from "./objDecor/WanwanNoBase";
import { Pakkun } from "./objDecor/Pakkun";
import { MontyAirship } from "./objDecor/MontyAirship";
import { Bound } from "./objDecor/Bound";
import { Flipper } from "./objDecor/Flipper";
import { FirePlant } from "./objDecor/FirePlant";
import { Crab } from "./objDecor/Crab";
import { Sun } from "./objDecor/Sun";
import { IronBall } from "./objDecor/IronBall";
import { Rock2 } from "./objDecor/Rock2";
import { Sanbo } from "./objDecor/Sanbo";
import { Cream } from "./objDecor/Cream";
import { Berry } from "./objDecor/Berry";
import { DonkyTree2 } from "./objDecor/DonkyTree2";
import { Psea } from "./objDecor/Psea";
import { Pylon01 } from "./objDecor/Pylon01";

export class objDatabase {
	static idToType: SceneEntityObjectConstructor[] = new Array<SceneEntityObjectConstructor>();

	static init() {
		objDatabase.idToType[0x0001] = ObjWater;
		objDatabase.idToType[0x0002] = Psea;
		objDatabase.idToType[0x0003] = ObjWater;
		objDatabase.idToType[0x0005] = ObjSoundMaker;
		objDatabase.idToType[0x0006] = ObjWater;
		objDatabase.idToType[0x0008] = ObjSoundMaker;
		objDatabase.idToType[0x0009] = ObjWater;
		objDatabase.idToType[0x000a] = ObjSoundMaker;
		objDatabase.idToType[0x000c] = ObjWater;
		objDatabase.idToType[0x000e] = ObjSoundMaker;

		objDatabase.idToType[0x0065] = ItemBox;
		objDatabase.idToType[0x0066] = ObjInvisible;
		objDatabase.idToType[0x0069] = ObjInvisible;
		objDatabase.idToType[0x006b] = ObjInvisible;

		objDatabase.idToType[0x00c9] = ObjMovingItemBox;

		objDatabase.idToType[0x00ca] = ObjRoutePlatform;
		objDatabase.idToType[0x00cb] = ObjGear;
		objDatabase.idToType[0x00cd] = ObjRouteBasabasa;
		objDatabase.idToType[0x00ce] = ObjGear; //test_cylinder, tick tock clock end
		objDatabase.idToType[0x00cf] = ObjKoopaBall;
		objDatabase.idToType[0x00d0] = ObjRotaryRoom;
		objDatabase.idToType[0x00d1] = ObjGear; //rotary bridge
		objDatabase.idToType[0x00d2] = ObjSkyship;

		objDatabase.idToType[0x012d] = BeachTree;
		objDatabase.idToType[0x012e] = BeachTree;
		objDatabase.idToType[0x012f] = EarthenPipe;
		objDatabase.idToType[0x0130] = OpaTree;
		objDatabase.idToType[0x0131] = OlgPipe;
		objDatabase.idToType[0x0132] = OlgMush;
		objDatabase.idToType[0x0133] = Of6Yoshi;
		objDatabase.idToType[0x0134] = Cow;
		objDatabase.idToType[0x0135] = NsKiller;
		objDatabase.idToType[0x0136] = DonkyTree2;
		objDatabase.idToType[0x0138] = GardenTree;
		objDatabase.idToType[0x0139] = Kamome;
		objDatabase.idToType[0x013a] = CrossTree;
		objDatabase.idToType[0x013c] = Bakubaku; //DEBUG: cheep cheep (routed)
		objDatabase.idToType[0x013d] = Teresa; //DEBUG: ghost
		objDatabase.idToType[0x013e] = BankTree;
		objDatabase.idToType[0x013f] = GardenTree;
		objDatabase.idToType[0x0140] = Chandelier;
		objDatabase.idToType[0x0142] = MarioTree;
		objDatabase.idToType[0x0144] = Pylon01;
		objDatabase.idToType[0x0145] = TownTree;
		objDatabase.idToType[0x0146] = SnowTree;
		objDatabase.idToType[0x0148] = DeTree;
		objDatabase.idToType[0x0149] = BankEgg; //yoshi falls egg
		objDatabase.idToType[0x014b] = KinoHouse1;
		objDatabase.idToType[0x014c] = KinoHouse2;
		objDatabase.idToType[0x014d] = KinoMount1;
		objDatabase.idToType[0x014e] = KinoMount2;
		objDatabase.idToType[0x014f] = OlaTree;
		objDatabase.idToType[0x0150] = OsaTree;
		objDatabase.idToType[0x0151] = Picture1;
		objDatabase.idToType[0x0152] = Picture2;
		objDatabase.idToType[0x0153] = Om6Tree;
		objDatabase.idToType[0x0154] = RainStar; //rainbow star
		objDatabase.idToType[0x0155] = Of6Tree;
		objDatabase.idToType[0x0156] = Of6Tree;
		objDatabase.idToType[0x0157] = TownMonte;

		objDatabase.idToType[0x000d] = Puddle; //DEBUG: puddle
		objDatabase.idToType[0x0158] = Airship; //DEBUG: airship (routed)

		//DEBUG ENEMIES AS DECOR:
		objDatabase.idToType[0x0191] = Kuribo;
		objDatabase.idToType[0x0192] = Rock;
		objDatabase.idToType[0x0193] = Dossun;
		objDatabase.idToType[0x0196] = Wanwan;
		objDatabase.idToType[0x0198] = Bubble;
		objDatabase.idToType[0x0199] = Choropu;
		objDatabase.idToType[0x019b] = Pukupuku;
		objDatabase.idToType[0x019d] = Snowman;
		objDatabase.idToType[0x019e] = Kanoke;
		objDatabase.idToType[0x01a0] = Basabasa;
		objDatabase.idToType[0x01a1] = NsCannon;
		objDatabase.idToType[0x01a3] = MoveTree;
		objDatabase.idToType[0x01a4] = Burner;
		objDatabase.idToType[0x01a5] = WanwanNoBase;
		objDatabase.idToType[0x01a6] = Pakkun;
		objDatabase.idToType[0x01a7] = MontyAirship;
		objDatabase.idToType[0x01a8] = Bound;
		objDatabase.idToType[0x01a9] = Flipper;
		objDatabase.idToType[0x01aa] = FirePlant;
		objDatabase.idToType[0x01ac] = Crab;
		objDatabase.idToType[0x01ad] = Sun;
		objDatabase.idToType[0x01b0] = IronBall;
		objDatabase.idToType[0x01b1] = Rock2;
		objDatabase.idToType[0x01b2] = Sanbo;
		objDatabase.idToType[0x01b3] = IronBall;
		objDatabase.idToType[0x01b4] = Cream;
		objDatabase.idToType[0x01b5] = Berry;

		objDatabase.idToType[0x019c] = ObjTruck;
		objDatabase.idToType[0x019a] = ObjCar;
		objDatabase.idToType[0x0195] = ObjBus;

		objDatabase.idToType[0x00cc] = ObjBridge; //DEBUG: pianta bridge
	}
}
