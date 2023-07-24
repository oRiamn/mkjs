//
// water.js
//--------------------
// Provides multiple types of traffic. 
// by RHY3756547
//
// includes:
// render stuff idk
//

import { nkm_section_OBJI } from "../formats/nkm";
import { nitroRender } from "../render/nitroRender";

export class ObjWater implements SceneEntityObject {
	collidable: boolean;
	scene: Scene;
	obji: nkm_section_OBJI;
	res: ProvidedRes;
	pos: vec3;
	scale: vec3;
	frame: number;
	wheight: number;
	wosc: number;
	wstay: number;
	wchange: number;
	useAlpha: boolean;
	constructor(obji: nkm_section_OBJI, scene: Scene) {
		this.scene = scene;
		this.obji = obji;
		this.res = undefined;
		this.pos = vec3.clone(this.obji.pos);
		//this.angle = vec3.clone(obji.angle);
		this.scale = vec3.clone(this.obji.scale);

		this.frame = 0;
		this.wheight = 6.144;
		this.wosc = 12.288;
		this.wstay = 5 * 60;
		this.wchange = 4 * 60;
		this.useAlpha = true; //probably a crutch - this should be defined in the water material (though it might be in nsbma)
	}

	draw(view: mat4, pMatrix: mat4) {
		if (nitroRender.flagShadow) return;
		var waterM = mat4.create();

		gl.enable(gl.STENCIL_TEST);
		gl.stencilMask(0xFF);

		gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE); //when depth test passes for water lower layer, pixel is already drawn, do not cover it with the white overlay (set stencil bit)

		var height = (this.pos[1]) + this.wheight + Math.sin(this.frame / 150) * this.wosc //0.106

		mat4.translate(waterM, view, [Math.sin(this.frame / 180) * 96, height, Math.cos(this.frame / 146) * 96])
		if (this.useAlpha) {
			nitroRender.setColMult([1, 1, 1, 0x0A / 31]);
		}
		this.res.mdl[0].drawPoly(mat4.scale(mat4.create(), waterM, [16, 16, 16]), pMatrix, 0, 0); //water

		gl.stencilFunc(gl.EQUAL, 0, 0xFF);
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

		if (this.obji.ID != 9) {
			mat4.translate(waterM, view, [0, height, 0])
			if (this.useAlpha) {
				nitroRender.setColMult([1, 1, 1, 0x10 / 31]);
			}

			this.res.mdl[0].drawPoly(mat4.scale(mat4.create(), waterM, [16, 16, 16]), pMatrix, 0, 1); //white shore wash part, water is stencil masked out
		}

		gl.disable(gl.STENCIL_TEST);

		if (this.res.mdl[1] != null) {
			mat4.translate(waterM, view, [-Math.sin((this.frame + 30) / 180) * 96, height, Math.cos((this.frame + 100) / 146) * 96])
			if (this.useAlpha) nitroRender.setColMult([1, 1, 1, 0x04 / 31]);
			this.res.mdl[1].draw(mat4.scale(mat4.create(), waterM, [16, 16, 16]), pMatrix); //water white detail part. stencil should do nothing here, since it's in the same position as the above.
		}

		nitroRender.setColMult([1, 1, 1, 1]);
	}

	update() {
		this.frame = (this.frame + 1) % 197100; //it's a big number but yolo... we have the technology...
		//TODO: physics and void-out for karts
	}

	requireRes() { //scene asks what resources to load
		switch (this.obji.ID) {
			case 0x0001:
				return { mdl: [{ nsbmd: "beach_waterC.nsbmd" }, { nsbmd: "beach_waterA.nsbmd" }] };
			case 0x0003:
				this.useAlpha = false;
				return { mdl: [{ nsbmd: "town_waterC.nsbmd" }, { nsbmd: "town_waterA.nsbmd" }] };
			case 0x0006:
				this.useAlpha = false;
				return { mdl: [{ nsbmd: "yoshi_waterC.nsbmd" }] };
			case 0x0009:
				this.useAlpha = false;
				return { mdl: [{ nsbmd: "hyudoro_waterC.nsbmd" }, { nsbmd: "hyudoro_waterA.nsbmd" }] };
			case 0x000C:
				this.wheight = 38;
				this.wosc = 16;
				return { mdl: [{ nsbmd: "mini_stage3_waterC.nsbmd" }, { nsbmd: "mini_stage3_waterA.nsbmd" }] };
		}
	}

	provideRes(r: ProvidedRes) {
		this.res = r; //...and gives them to us. :)
	}
}