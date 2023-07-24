import { nsbca } from "../formats/nsbca";
import { nsbmd } from "../formats/nsbmd";
import { nitroAnimator, nitroAnimator_matStack } from "../render/nitroAnimator";
import { nitroModel } from "../render/nitroModel";
import { nitroRender } from "../render/nitroRender";

export class Goal3DUI implements SceneEntity {
	transparent: boolean;
	scene: Scene;
	pos: vec3;
	mat: mat4;
	proj: mat4;
	param: number[];
	lastWidth: number;
	bmd: nsbmd;
	bca: nsbca;
	anim: nitroAnimator;
	length: number;
	animFrame: number;
	animMat: nitroAnimator_matStack;
	model: nitroModel;

	constructor(scene: Scene) {
		this.scene = scene;

		this.pos = vec3.clone([0, 0, 0]);
		this.mat = mat4.create();
		this.proj = mat4.create();

		this.param = [
			-128,
			128,
			-96,
			96
		].map(e => e / 1024)

		this.buildOrtho(nitroRender.getViewWidth(), nitroRender.getViewHeight());
		this.lastWidth = 0;

		var bmdFile = this.scene.gameRes.RaceLoc.getFile("goal.nsbmd");
		var bcaFile = this.scene.gameRes.Race.getFile("goal.nsbca")

		this.bmd = new nsbmd(bmdFile);
		this.bca = new nsbca(bcaFile);

		this.anim = new nitroAnimator(this.bmd, this.bca);
		this.length = this.anim.getLength(0);

		this.animFrame = 0;
		this.animMat = this.anim.setFrame(0, 0, this.animFrame);

		this.model = new nitroModel(this.bmd, null);
	}

	buildOrtho(width: number, height: number) {
		this.lastWidth = width;
		var ratio = width / height;
		var w = (this.param[3] - this.param[2]) * ratio / 2;
		mat4.ortho(this.proj, -w, w, this.param[2], this.param[3], -0.001, 10);
	}

	draw(view: mat4) {
		if (nitroRender.flagShadow || this.animFrame < 0) return;
		var width = nitroRender.getViewWidth();
		if (width != this.lastWidth) {
			this.buildOrtho(width, nitroRender.getViewHeight());
		}
		mat4.translate(this.mat, view, this.pos);
		nitroRender.pauseShadowMode();
		this.model.draw(this.mat, this.proj, this.animMat);
		nitroRender.unpauseShadowMode();
	}

	update() {
		if (this.anim != null) {
			this.model.setFrame(this.animFrame);
			this.animMat = this.anim.setFrame(0, 0, Math.max(0, this.animFrame++));
		}
		if (this.animFrame > this.length) {
			this.scene.removeEntity(this);
		}
	}
}