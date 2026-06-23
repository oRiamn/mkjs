import { nkm_section_OBJI } from "../formats/nkm";

export class ObjInvisible implements SceneEntityObject {
	collidable!: boolean;
	pos: vec3;
	scale: vec3;

	constructor(obji: nkm_section_OBJI, _scene: Scene) {
		this.collidable = obji.ID === 0x0066;
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
