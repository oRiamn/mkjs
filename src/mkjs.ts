import { TileFlattener } from "./engine/2d/tileFlattener";
import { IngameRes } from "./engine/ingameRes";

import { cameraIngame } from "./engine/cameras/cameraIngame";
import { cameraSpectator } from "./engine/cameras/cameraSpectator";
import { cameraIntro } from "./engine/cameras/cameraIntro";

import { getPlayerControls } from "./engine/controls/getPlayerControls";
import { controlDefault } from "./engine/controls/controlDefault";
import { controlMobile } from "./engine/controls/controlMobile";
import { controlRaceCPU } from "./engine/controls/controlRaceCPU";
import { controlNetwork } from "./engine/controls/controlNetwork";

import { narc, narcGroup } from "./formats/narc";
import { ndsFS } from "./formats/ndsFS";
import { nscr } from "./formats/2d/nscr";
import { nclr } from "./formats/2d/nclr";
import { ncgr } from "./formats/2d/ncgr";
import { ncer } from "./formats/2d/ncer";
import { sseq } from "./formats/sseq";
import { ssar } from "./formats/ssar";
import { nsbca } from "./formats/nsbca";
import { sbnk } from "./formats/sbnk";
import { swav } from "./formats/swav";
import { swar } from "./formats/swar";
import { spa } from "./formats/spa";
import { sdat } from "./formats/sdat";
import { nsbtx } from "./formats/nsbtx";
import { nsbtp } from "./formats/nsbtp";
import { nftr } from "./formats/nftr";
import { nitro } from "./formats/nitro"
import { lz77 } from "./formats/lz77";
import { nkm } from "./formats/nkm";
import { nsbmd } from "./formats/nsbmd";
import { nsbta } from "./formats/nsbta";
import { kartoffsetdata } from "./formats/kartoffsetdata";
import { kartphysicalparam } from "./formats/kartphysicalparam";
import { kcl } from "./formats/kcl";
import { netKart } from "./formats/net/netKart";

import { nitroAnimator } from "./render/nitroAnimator";
import { shadowRender } from "./render/shadowRender";
import { nitroModel } from "./render/nitroModel";
import { nitroRender } from "./render/nitroRender";
import { nitroShaders } from "./render/nitroShaders";

import { CountD3DUI } from "./ui/countD3DUI";
import { Goal3DUI } from "./ui/goal3DUI";
import { LapCountUI } from "./ui/lapCountUI";
import { PlacementUI } from "./ui/placementUI";
import { Start3DUI } from "./ui/start3DUI";

import { ItemShard } from "./particles/itemboxShard";

import { RedShellC } from "./entities/items/shells/redShellC";
import { GreenShellC } from "./entities/items/shells/greenShellC";
import { ShellGroupC } from "./entities/items/shells/shellGroupC";
import { BananaC } from "./entities/items/droppable/bananaC";
import { FakeBoxC } from "./entities/items/droppable/fakeBoxC";
import { BombC } from "./entities/items/droppable/bombC";
import { nitroAudio } from "./audio/nitroAudio";
import { SSEQWaveCache } from "./audio/SSEQWaveCache";
import { SSEQPlayer } from "./audio/sseqPlayer";
import { ItemBox } from "./entities/itembox";
import { ObjBus, ObjCar, ObjTruck } from "./entities/trafficCar";
import { ObjWater } from "./entities/water";
import { ObjBridge } from "./entities/platforms/objBridge";
import { ObjRoutePlatform } from "./entities/platforms/objRoutePlatform";
import { ObjRotaryRoom } from "./entities/platforms/objRotaryRoom";
import { ObjDecor } from "./entities/objDecor";
import { ObjGear } from "./entities/rotatingGear";
import { ObjSoundMaker } from "./entities/soundMaker";
import { objDatabase } from "./entities/objDatabase";

import { MKDS_COLSOUNDS } from "./engine/collisionSounds";
import { KartItems } from "./entities/kartItems";
import { Item } from "./entities/item";
import { fileStore } from "./engine/storage/fileStore";
import { ItemController } from "./engine/itemController";
import { NitroParticle } from "./particles/nitroParticle";
import { NitroEmitter } from "./particles/nitroEmitter";
import { Kart } from "./entities/kart";
import { courseScene } from "./engine/scenes/courseScene";
import { MKDSCONST } from "./engine/mkdsConst";
import { sceneDrawer } from "./engine/scenes/sceneDrawer";
import { singleScene } from "./engine/scenes/singleScene";
import { BeachTree } from "./entities/objDecor/BeachTree";
import { MKDS_COLTYPE } from "./engine/collisionTypes";
import { SSEQThread } from "./audio/sseqThread";
import { BananaGroupC, MushroomC, MushroomGroupC, QueenMushroomC, StarC, ThunderC, BlooperC, BooC, KillerC, BlueShellC } from "./entities/items/placeholder";

Object.assign(window, {
    TileFlattener,
    cameraIngame,
    cameraSpectator,
    cameraIntro,
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
    Start3DUI,
    ItemShard,
    RedShellC,
    GreenShellC,
    ShellGroupC,
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
    objDatabase,
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
    sceneDrawer,
    singleScene,
    BeachTree,
    MKDS_COLTYPE,
    SSEQThread
})