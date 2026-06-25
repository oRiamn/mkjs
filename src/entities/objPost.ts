import { nkm_section_OBJI } from "../formats/nkm";

/** MOBJ 0x0066 — invisible boxy collision post (grpconf 150×1300×2). */
export class ObjPost implements SceneEntityObject {
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
