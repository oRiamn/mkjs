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
import { Airship } from "./objDecor/Airship";
import { Bakubaku } from "./objDecor/Bakubaku";
import { BankEgg } from "./objDecor/BankEgg";
import { BankTree } from "./objDecor/BankTree";
import { Basabasa } from "./objDecor/Basabasa";
import { BeachTree } from "./objDecor/BeachTree";
import { Berry } from "./objDecor/Berry";
import { Bound } from "./objDecor/Bound";
import { Bubble } from "./objDecor/Bubble";
import { Burner } from "./objDecor/Burner";
import { Chandelier } from "./objDecor/Chandelier";
import { Choropu } from "./objDecor/Choropu";
import { Cow } from "./objDecor/Cow";
import { Crab } from "./objDecor/Crab";
import { Cream } from "./objDecor/Cream";
import { CrossTree } from "./objDecor/CrossTree";
import { DeTree } from "./objDecor/DeTree";
import { DonkyTree2 } from "./objDecor/DonkyTree2";
import { Dossun } from "./objDecor/Dossun";
import { EarthenPipe } from "./objDecor/EarthenPipe";
import { FirePlant } from "./objDecor/FirePlant";
import { Fireballs } from "./objDecor/Fireballs";
import { Flipper } from "./objDecor/Flipper";
import { GardenTree } from "./objDecor/GardenTree";
import { IronBall } from "./objDecor/IronBall";
import { Kamome } from "./objDecor/Kamome";
import { Kanoke } from "./objDecor/Kanoke";
import { KinoHouse1 } from "./objDecor/KinoHouse1";
import { KinoHouse2 } from "./objDecor/KinoHouse2";
import { KinoMount1 } from "./objDecor/KinoMount1";
import { KinoMount2 } from "./objDecor/KinoMount2";
import { Kuribo } from "./objDecor/Kuribo";
import { MarioTree } from "./objDecor/MarioTree";
import { MontyAirship } from "./objDecor/MontyAirship";
import { MoveTree } from "./objDecor/MoveTree";
import { NsCannon } from "./objDecor/NsCannon";
import { NsKiller } from "./objDecor/NsKiller";
import { Of6Tree } from "./objDecor/Of6Tree";
import { Of6Yoshi } from "./objDecor/Of6Yoshi";
import { OlaTree } from "./objDecor/OlaTree";
import { OlgMush } from "./objDecor/OlgMush";
import { OlgPipe } from "./objDecor/OlgPipe";
import { Om6Tree } from "./objDecor/Om6Tree";
import { OpaTree } from "./objDecor/OpaTree";
import { OsaTree } from "./objDecor/OsaTree";
import { Pakkun } from "./objDecor/Pakkun";
import { Picture1 } from "./objDecor/Picture1";
import { Picture2 } from "./objDecor/Picture2";
import { Puddle } from "./objDecor/Puddle";
import { Pukupuku } from "./objDecor/Pukupuku";
import { Pylon01 } from "./objDecor/Pylon01";
import { RainStar } from "./objDecor/RainStar";
import { Rock } from "./objDecor/Rock";
import { Rock2 } from "./objDecor/Rock2";
import { Sanbo } from "./objDecor/Sanbo";
import { Snowman } from "./objDecor/Snowman";
import { SnowTree } from "./objDecor/SnowTree";
import { Sun } from "./objDecor/Sun";
import { Teresa } from "./objDecor/Teresa";
import { TownMonte } from "./objDecor/TownMonte";
import { TownTree } from "./objDecor/TownTree";
import { Wanwan } from "./objDecor/Wanwan";
import { WanwanNoBase } from "./objDecor/WanwanNoBase";
import { WaterEffect } from "./objDecor/WaterEffect";
import { Woodbox } from "./objDecor/Woodbox";
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
import { ObjBus, ObjCar, ObjTruck } from "./trafficCar";
import { ObjWater } from "./water";


export const ObjDatabase = new Map([
	[0x0001, ObjWater],
	// [0x0002, Psea],
	[0x0003, ObjWater],
	[0x0005, ObjSoundMaker],
	[0x0006, ObjWater],
	[0x0008, ObjSoundMaker],
	[0x0009, ObjWater],
	[0x000a, ObjSoundMaker],
	[0x000c, ObjWater],
	[0x000e, ObjSoundMaker],
	[0x000f, WaterEffect],
	[0x0065, ItemBox],
	[0x0066, ObjInvisible],
	[0x0069, ObjInvisible],
	[0x006b, ObjInvisible],
	[0x0067, Woodbox],
	[0x00c9, ObjMovingItemBox],
	[0x00ca, ObjRoutePlatform],
	[0x00cb, ObjGear],
	[0x00cd, ObjRouteBasabasa],
	[0x00ce, ObjGear], //test_cylinder, tick tock clock end
	[0x00cf, ObjKoopaBall],
	[0x00d0, ObjRotaryRoom],
	[0x00d1, ObjGear], //rotary bridge
	[0x00d2, ObjSkyship],
	[0x012d, BeachTree],
	[0x012e, BeachTree],
	[0x012f, EarthenPipe],
	[0x0130, OpaTree],
	[0x0131, OlgPipe],
	[0x0132, OlgMush],
	[0x0133, Of6Yoshi],
	[0x0134, Cow],
	[0x0135, NsCannon],
	[0x0136, DonkyTree2],
	[0x0138, GardenTree],
	[0x0139, Kamome],
	[0x013a, CrossTree],
	[0x013c, Bakubaku], //DEBUG: cheep cheep (routed)
	[0x013d, Teresa], //DEBUG: ghost
	[0x013e, BankTree],
	[0x013f, GardenTree],
	[0x0140, Chandelier],
	[0x0142, MarioTree],
	[0x0144, Pylon01],
	[0x0145, TownTree],
	[0x0146, SnowTree],
	[0x0148, DeTree],
	[0x0149, BankEgg], //yoshi falls egg
	[0x014b, KinoHouse1],
	[0x014c, KinoHouse2],
	[0x014d, KinoMount1],
	[0x014e, KinoMount2],
	[0x014f, OlaTree],
	[0x0150, OsaTree],
	[0x0151, Picture1],
	[0x0152, Picture2],
	[0x0153, Om6Tree],
	[0x0154, RainStar], //rainbow star
	[0x0155, Of6Tree],
	[0x0156, Of6Tree],
	[0x0157, TownMonte],
	[0x000d, Puddle], //DEBUG: puddle
	[0x0158, Airship], //DEBUG: airship (routed)

	//DEBUG ENEMIES AS DECOR:
	[0x0191, Kuribo],
	[0x0192, Rock],
	[0x0193, Dossun],
	[0x0196, Wanwan],
	[0x0198, Bubble],
	[0x0199, Choropu],
	[0x019b, Pukupuku],
	[0x019d, Snowman],
	[0x019e, Kanoke],
	[0x01a0, Basabasa],
	[0x01a1, NsKiller],
	[0x01a3, MoveTree],
	[0x01a4, Burner],
	[0x01a5, WanwanNoBase],
	[0x01a6, Pakkun],
	[0x01a7, MontyAirship],
	[0x01a8, Bound],
	[0x01a9, Flipper],
	[0x01aa, FirePlant],
	[0x01ac, Crab],
	[0x01ad, Sun],
	[0x01af, Fireballs],
	[0x01b0, IronBall],
	[0x01b1, Rock2],
	[0x01b2, Sanbo],
	[0x01b3, IronBall],
	[0x01b4, Cream],
	[0x01b5, Berry],
	[0x019c, ObjTruck],
	[0x019a, ObjCar],
	[0x0195, ObjBus],
	[0x00cc, ObjBridge], //DEBUG: pianta bridge
] as [number, SceneEntityObjectConstructor][])
