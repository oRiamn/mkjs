import { nkm_section_OBJI } from "../formats/nkm";

/** MOBJ 0x0069 — narrow invisible barrier (grpconf 15×800×5), mostly battle arenas. */
export class ObjBattleBarrier implements SceneEntityObject {
	collidable = true;
	pos: vec3;
	scale: vec3;

	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		this.pos = vec3.clone(obji.pos);
		this.scale = vec3.clone(obji.scale);
	}

	draw() {}

	update() {}

	requireRes() {
		return { mdl: [] as { nsbmd: string }[] };
	}

	provideRes(_r: ProvidedRes) {}
}

/** MOBJ 0x006b — wide invisible barrier (grpconf 215×1500×5), battle ceilings and walls. */
export class ObjWideBarrier implements SceneEntityObject {
	collidable = true;
	pos: vec3;
	scale: vec3;

	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		this.pos = vec3.clone(obji.pos);
		this.scale = vec3.clone(obji.scale);
	}

	draw() {}

	update() {}

	requireRes() {
		return { mdl: [] as { nsbmd: string }[] };
	}

	provideRes(_r: ProvidedRes) {}
}
