import glMatrix from "gl-matrix";
import { IngameRes } from "./src/engine/ingameRes";
import { Item } from "./src/entities/item";
import { Kart } from "./src/entities/kart";
import { kcl } from "./src/formats/kcl";
import { ndsFS } from "./src/formats/ndsFS";
import { nkm, nkm_section_OBJI, nkm_section_POIT } from "./src/formats/nkm";
import { nsbca } from "./src/formats/nsbca";
import { nsbmd } from "./src/formats/nsbmd";
import { nsbta } from "./src/formats/nsbta";
import { nsbtp } from "./src/formats/nsbtp";
import { nsbtx } from "./src/formats/nsbtx";
import { nitroModel, nitromodel_matStack } from "./src/render/nitroModel";

declare global {
	type CustomAudioBufferSourceNode = {
		noteOn: (when?: number, offset?: number, duration?: number) => void;
		donezo: boolean;
	} & AudioBufferSourceNode;

	type CustomWebGLRenderingContext = {
		viewportWidth: number;
		viewportHeight: number;
	} & WebGLRenderingContext;

	type CustomWebGLTexture = {
		width: number;
		height: number;
		realWidth?: number;
		realHeight?: number;
	} & WebGLTexture;

	type RenderTarget = {
		color: CustomWebGLTexture;
		depth: CustomWebGLTexture;
		fb: WebGLFramebuffer | null;
	};

	type MKJSTouch = {
		id: number;
		x: number;
		y: number;
		pressed: boolean;
		released: boolean;
		lastx: number;
		lasty: number;
	};

	interface Window {
		debugParticle: boolean;
		keysArray: boolean[];
		mobile?: boolean;
		touches: MKJSTouch[];
		mozRequestAnimationFrame?: typeof requestAnimationFrame;
		webkitRequestAnimationFrame?: typeof requestAnimationFrame;
		msRequestAnimationFrame?: typeof requestAnimationFrame;
		webkitIndexedDB?: IDBFactory;
		mozIndexedDB?: IDBFactory;
		shimIndexedDB?: IDBFactory;
		VTX_PARTICLE: {
			posArray: Float32Array;
			vPos: WebGLBuffer;
			vTx: WebGLBuffer;
			vCol: WebGLBuffer;
			vMat: WebGLBuffer;
			vNorm: WebGLBuffer;
			verts: number;
			mode: GLenum;
		};
	}

	const gl: CustomWebGLRenderingContext;
	const gameROM: ndsFS;

	const simpleMatStack: nitromodel_matStack;

	type lsc_collision_triangle = {
		Vertices: vec3[];
		Normal: vec3;
		CollisionType?: number;
		cache?: lsc_collision_triangle;
		colFrame?: number;
	};

	type lsc_collision_model = {
		mat: mat4;
		frame?: number;
		tris: lsc_collision_triangle[];
	};

	type lscraycast = {
		plane: lsc_collision_triangle;
		t: number;
		normal: vec3;
		object: lsc_taget | null;
		colPoint: vec3;
	};
	type lscsweepellipse = {
		t: number;
		plane: lsc_collision_triangle;
		colPoint: vec3;
		normal: vec3;
		pNormal: vec3;
		embedded: boolean;
		object: lsc_taget | null;
	};

	interface lsc_taget {
		collidable: boolean;
		pos: vec3;
		colRad: number;
		vel?: vec3;
		getCollision(): lsc_collision_model;
		moveWith?(obj: Kart | Item): void;
		onKartHit?(): void;
	}

	type other = nsbmd | nsbtx | nsbca | nsbta | nsbtp;
	type ProvidedRes = { mdl: nitroModel[]; other: (other | null)[] };

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
		pos: vec3 | null;
	}

	type MKJSDataInput = ArrayBufferLike & { BYTES_PER_ELEMENT?: never };
	abstract class MKJSDataFormator {
		abstract load(input: MKJSDataInput): void;
	}

	interface SceneEntity {
		transparent?: boolean;
		draw(view: mat4, pMatrix: mat4, gl?: CustomWebGLRenderingContext): void;
		update(scn: Scene): void;
		sndUpdate?(view: mat4): void;
	}

	class SceneEntityObject {
		collidable: boolean;
		pos: vec3;
		constructor(obji: nkm_section_OBJI, scene: Scene);
		draw(view: mat4, pMatrix: mat4, gl?: CustomWebGLRenderingContext): void;
		update(scn?: Scene): void;
		sndUpdate?(view: mat4): void;
		requireRes(): { mdl: { nsbmd: string; nsbtx?: string }[]; other?: (string | null)[] } | undefined;
		provideRes(r: ProvidedRes): void;
		moveWith?(obj: Item): void;
	}

	type SceneEntityObjectConstructor = new (obji: nkm_section_OBJI, scene: Scene) => SceneEntityObject;

	class KartItemEntity {
		canBeHeld: boolean;
		canBeDropped: boolean;
		isDestructive: boolean;
		isSolid: boolean;
		constructor(item: Item, scene: Scene, type: string);
		onlyHeld(): boolean;
		update(scene: Scene): void;
		release?(forward: number): boolean;
		onDie?(final: boolean): void;
		collide?(item: Item | Kart): void;
		collideKart?(k: Kart): void;
		colResponse?(pos: vec3, pvel: vec3, dat: lscraycast, ignoreList: lsc_collision_triangle[]): void;
		draw?(mvMatrix: mat4, pMatrix: mat4): void;
		onRest?(normal: vec3): void;
	}

	interface Camera {
		targetShadowPos: vec3;
		view: CamView;
		getView(scene: Scene, width: number, height: number): CamView;
	}

	interface SceneParticule {
		update(scene: Scene): void;
		draw(view: mat4, pMatrix: mat4, gl: CustomWebGLRenderingContext): void;
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
			createItem(t: string, o: Kart): Item;
			removeItem(i: Item): void;
			items: Item[];
		};
		particles: SceneParticule[];
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
		constructor(nkm: nkm);
		local: boolean;
		setKart(k: Kart): void;
		fetchInput(): InputData;
		setRouteID?(i: number): void;
	}
}

export { };

