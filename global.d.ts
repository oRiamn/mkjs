import * as glMatrix from "gl-matrix";
import { IngameRes } from "./src/engine/ingameRes";
import { Item } from "./src/entities/item";
import { Kart } from "./src/entities/kart";
import { kcl_plane, kcl } from "./src/formats/kcl";
import { ndsFS } from "./src/formats/ndsFS";
import { nkm_section_OBJI, nkm, nkm_section_POIT } from "./src/formats/nkm";
import { nsbca } from "./src/formats/nsbca";
import { nsbmd } from "./src/formats/nsbmd";
import { nsbta } from "./src/formats/nsbta";
import { nsbtp } from "./src/formats/nsbtp";
import { nsbtx } from "./src/formats/nsbtx";
import { nitromodel_BoundingCollisionModel_dat, nitroModel } from "./src/render/nitroModel";

declare global {

    type CustomAudioBufferSourceNode = {
        noteOn: (when?: number, offset?: number, duration?: number) => void,
        donezo: boolean,
    } & AudioBufferSourceNode
    
    type CustomWebGLRenderingContext = {
        viewportWidth: number,
        viewportHeight: number
    } & WebGLRenderingContext;

    type CustomWebGLTexture = {
        width: number,
        height: number,
        realWidth?: number,
        realHeight?: number

    } & WebGLTexture;

    interface Window {
        debugParticle: boolean
        VTX_PARTICLE: {
            posArray: Float32Array,
            vPos: WebGLBuffer,
            vTx: WebGLBuffer,
            vCol: WebGLBuffer,
            vMat: WebGLBuffer,
            vNorm: WebGLBuffer,
            verts: number,
            mode: GLenum,
        }
    }


    const gl: CustomWebGLRenderingContext;
    const gameROM: ndsFS;

    const simpleMatStack: {
        dat: mat4,
        built: boolean
    };


    type lscraycast = {
        plane: any; 
        t: number; 
        normal: vec3; 
        object: lsc_taget;
        colPoint: vec3;
    }
    type lscsweepellipse = {
        t: number,
        plane: any
        colPoint: vec3,
        normal: vec3,
        pNormal: any,
        embedded: boolean,
        object: lsc_taget
    }

    interface lsc_taget {
        collidable: boolean;
        vel?: vec3;
        getCollision(): {
            mat: mat4;
            frame?: number;
            tris: nitromodel_BoundingCollisionModel_dat;
        }
        moveWith?(obj: Kart | Item): void;
    }

   

    type other = nsbmd | nsbtx | nsbca | nsbta | nsbtp
    type ProvidedRes = { mdl: nitroModel[], other: other[] }


    const mat4: typeof glMatrix.mat4;
    const mat3: typeof glMatrix.mat3;
    const vec3: typeof glMatrix.vec3;
    const vec2: typeof glMatrix.vec2;
    const vec4: typeof glMatrix.vec4;

    type mat4 = glMatrix.mat4;
    type mat3 = glMatrix.mat3;
    type vec3 = glMatrix.vec3;
    type vec2 = glMatrix.vec2;
    type vec4 = glMatrix.vec4;

    interface CamView {
        p: mat4;
        mv: mat4;
        pos: vec3;
    }

    type MKJSDataInput = ArrayBufferLike & { BYTES_PER_ELEMENT?: never; }
    abstract class MKJSDataFormator {
        abstract load(input: MKJSDataInput): void;
    }

    interface SceneEntity {
        transparent: boolean
        draw(view: mat4, pMatrix: mat4, gl: CustomWebGLRenderingContext): void
        update(scn: Scene): void;
        sndUpdate?(view: mat4): void;
    }

    class SceneEntityObject {
        collidable: boolean;
        pos: vec3;
        constructor(obji: nkm_section_OBJI, scene: Scene);
        draw(view: mat4, pMatrix: mat4, gl?: CustomWebGLRenderingContext): void
        update(scn: Scene): void;
        sndUpdate?(view: mat4): void;
        requireRes(): { mdl: { nsbmd: string; nsbtx?: string }[]; other?: string[] }
        provideRes(r: ProvidedRes): void;
        moveWith?(obj: Item): void;
    }

    class KartItemEntity {
        canBeHeld: boolean;
        canBeDropped: boolean;
        isDestructive: boolean;
        isSolid: boolean;
        constructor(item: any, scene: Scene, type: string);
        update(scene: Scene): void;
        release?(forward: number): void;
        onDie?(final: boolean): void;
        collide?(item: Item | Kart): void;
        collideKart?(k: Kart): void;
        colResponse?(pos: vec3, pvel: vec3, dat: lscraycast, ignoreList: kcl_plane[]): void;
        draw?(mvMatrix: mat4, pMatrix: mat4): void;
        onRest?(normal: vec3): void;
    }

    interface Camera {
        targetShadowPos:vec3;
        view: CamView;
        getView(scene: Scene, width: number, height: number): CamView
    }

    interface SceneParticule {

    }

    interface Scene {
        camera: Camera;
        gameRes: IngameRes;
        karts: Kart[];
        removeEntity(obj: SceneEntity): void;
        removeParticle(obj: SceneParticule): void;
        nkm: nkm;
        paths: nkm_section_POIT[][];
        items: {
            createItem(t: string, o: Kart): Item,
            removeItem(i: Item): void;
            items: Item[]
        },
        particles: any[];
        kcl: kcl;
    }
    interface InputData {
        accel: boolean;
        decel: boolean;
        drift: boolean;
        item: boolean;
        turn: number; //-1 to 1, intensity
        airTurn: number; //air excitebike turn, doesn't really have much function
    }

    const input: InputData;
    class Controls {
        constructor(nkm: nkm)
        local: boolean;
        setKart(k: Kart): void;
        fetchInput(): InputData;
        setRouteID?(i: number): void;
    }
}

export { };
