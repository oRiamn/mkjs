import { mat2, mat3, mat4, vec2, vec3, vec4 } from "gl-matrix";
import { TileFlattener } from "./engine/2d/tileFlattener";
import { IngameRes } from "./engine/ingameRes";

import { cameraFollowObject, focusCameraOn } from "./engine/cameras/cameraFollowObject";
import { cameraIngame } from "./engine/cameras/cameraIngame";
import { cameraIntro } from "./engine/cameras/cameraIntro";
import { cameraSpectator } from "./engine/cameras/cameraSpectator";

import { controlDefault } from "./engine/controls/controlDefault";
import { controlMobile } from "./engine/controls/controlMobile";
import { controlNetwork } from "./engine/controls/controlNetwork";
import { controlRaceCPU } from "./engine/controls/controlRaceCPU";
import { getPlayerControls } from "./engine/controls/getPlayerControls";

import { ncer } from "./formats/2d/ncer";
import { ncgr } from "./formats/2d/ncgr";
import { nclr } from "./formats/2d/nclr";
import { nscr } from "./formats/2d/nscr";
import { kartoffsetdata } from "./formats/kartoffsetdata";
import { kartphysicalparam } from "./formats/kartphysicalparam";
import { kcl } from "./formats/kcl";
import { lz77 } from "./formats/lz77";
import { narc, narcGroup } from "./formats/narc";
import { ndsFS } from "./formats/ndsFS";
import { netKart } from "./formats/net/netKart";
import { nftr } from "./formats/nftr";
import { nitro } from "./formats/nitro";
import { nkm } from "./formats/nkm";
import { nsbca } from "./formats/nsbca";
import { nsbmd } from "./formats/nsbmd";
import { nsbta } from "./formats/nsbta";
import { nsbtp } from "./formats/nsbtp";
import { nsbtx } from "./formats/nsbtx";
import { sbnk } from "./formats/sbnk";
import { sdat } from "./formats/sdat";
import { spa } from "./formats/spa";
import { ssar } from "./formats/ssar";
import { sseq } from "./formats/sseq";
import { swar } from "./formats/swar";
import { swav } from "./formats/swav";
import { tbl } from "./formats/tbl";

import { nitroAnimator } from "./render/nitroAnimator";
import { nitroModel } from "./render/nitroModel";
import { nitroRender } from "./render/nitroRender";
import { nitroShaders } from "./render/nitroShaders";
import { shadowRender } from "./render/shadowRender";

import { CountD3DUI } from "./ui/countD3DUI";
import { Goal3DUI } from "./ui/goal3DUI";
import { ItemUi } from "./ui/itemUi";
import { LapCountUI } from "./ui/lapCountUI";
import {
	setupMobileControlsOverlay,
	syncMobileControlsLayout,
	syncMobileControlsVisibility,
	updateMobileControlsOverlay,
} from "./ui/mobileControlsOverlay";
import { PlacementUI } from "./ui/placementUI";
import { Start3DUI } from "./ui/start3DUI";
import { fitCanvasToWindow } from "./ui/uiScale";

import { ItemShard } from "./particles/itemboxShard";

import { SSEQWaveCache } from "./audio/SSEQWaveCache";
import { nitroAudio } from "./audio/nitroAudio";
import { SSEQPlayer } from "./audio/sseqPlayer";
import { ItemBox } from "./entities/itembox";
import { BananaC } from "./entities/items/droppable/bananaC";
import { BombC } from "./entities/items/droppable/bombC";
import { FakeBoxC } from "./entities/items/droppable/fakeBoxC";
import { GreenShellC, RedShellC } from "./entities/items/shells/shellC";
import { GreenShellGroup } from "./entities/items/shells/shellGroup";
import { ObjDatabase } from "./entities/objDatabase";
import { ObjDecor } from "./entities/objDecor";
import { ObjBridge } from "./entities/platforms/objBridge";
import { ObjRotaryRoom } from "./entities/platforms/objRotaryRoom";
import { ObjRoutePlatform } from "./entities/platforms/objRoutePlatform";
import { ObjGear } from "./entities/rotatingGear";
import { ObjSoundMaker } from "./entities/soundMaker";
import { ObjBus, ObjCar, ObjTruck } from "./entities/trafficCar";
import { ObjWater } from "./entities/water";

import {
	getRequestAnimationFrameFnct,
	hideMenu,
	mobilecheck,
	onAppStateChange,
	setupFullscreen,
	setupHUD,
	setupHudBehavior,
	setupMenu,
	showMenu,
	showMenuScreen,
	startGameLoop,
} from "./app";
import { SSEQThread } from "./audio/sseqThread";
import { MKDS_COLSOUNDS } from "./engine/collisionSounds";
import { MKDS_COLTYPE } from "./engine/collisionTypes";
import { ItemController } from "./engine/itemController";
import { MKDSCONST, refreshSettings } from "./engine/mkdsConst";
import { courseScene } from "./engine/scenes/courseScene";
import { sceneDrawer } from "./engine/scenes/sceneDrawer";
import { singleScene } from "./engine/scenes/singleScene";
import { fileStore } from "./engine/storage/fileStore";
import { Item } from "./entities/item";
import {
	BananaGroupC,
	BlooperC,
	BlueShellC,
	BooC,
	KillerC,
	MushroomC,
	MushroomGroupC,
	QueenMushroomC,
	StarC,
	ThunderC,
} from "./entities/items/placeholder";
import { Kart } from "./entities/kart";
import { KartItems } from "./entities/kartItems";
import { BeachTree } from "./entities/objDecor/BeachTree";
import { NitroEmitter } from "./particles/nitroEmitter";
import { NitroParticle } from "./particles/nitroParticle";

Object.assign(window, {
	vec2,
	vec3,
	vec4,
	mat2,
	mat3,
	mat4,
	TileFlattener,
	cameraIngame,
	cameraSpectator,
	cameraIntro,
	cameraFollowObject,
	focusCameraOn,
	getPlayerControls,
	controlDefault,
	controlMobile,
	controlRaceCPU,
	controlNetwork,
	kartoffsetdata,
	ncer,
	ncgr,
	nclr,
	nscr,
	narc,
	narcGroup,
	ndsFS,
	sseq,
	ssar,
	nsbca,
	sbnk,
	swav,
	swar,
	spa,
	sdat,
	nsbtx,
	nsbtp,
	kartphysicalparam,
	tbl,
	nftr,
	nitro,
	lz77,
	nkm,
	nsbmd,
	nsbta,
	nitroAnimator,
	shadowRender,
	kcl,
	netKart,
	nitroModel,
	nitroRender,
	nitroShaders,
	IngameRes,
	CountD3DUI,
	Goal3DUI,
	LapCountUI,
	PlacementUI,
	ItemUi,
	Start3DUI,
	ItemShard,
	RedShellC,
	GreenShellC,
	GreenShellGroup,
	BananaGroupC,
	MushroomC,
	MushroomGroupC,
	QueenMushroomC,
	StarC,
	ThunderC,
	BlooperC,
	BooC,
	KillerC,
	BlueShellC,
	BananaC,
	FakeBoxC,
	BombC,
	nitroAudio,
	SSEQWaveCache,
	SSEQPlayer,
	ItemBox,
	ObjTruck,
	ObjCar,
	ObjBus,
	ObjWater,
	ObjBridge,
	ObjRoutePlatform,
	ObjRotaryRoom,
	ObjDecor,
	ObjGear,
	ObjSoundMaker,
	ObjDatabase,
	MKDS_COLSOUNDS,
	KartItems,
	Item,
	fileStore,
	ItemController,
	NitroEmitter,
	NitroParticle,
	Kart,
	courseScene,
	MKDSCONST,
	refreshSettings,
	sceneDrawer,
	singleScene,
	BeachTree,
	MKDS_COLTYPE,
	SSEQThread,
	setupHUD,
	getRequestAnimationFrameFnct,
	startGameLoop,
	mobilecheck,
	setupMenu,
	showMenuScreen,
	hideMenu,
	showMenu,
	setupHudBehavior,
	onAppStateChange,
	setupFullscreen,
	fitCanvasToWindow,
	setupMobileControlsOverlay,
	syncMobileControlsLayout,
	syncMobileControlsVisibility,
	updateMobileControlsOverlay,
});
