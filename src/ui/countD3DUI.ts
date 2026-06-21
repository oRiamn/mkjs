import { nsbca } from "../formats/nsbca";
import { nsbmd } from "../formats/nsbmd";
import { nsbtp } from "../formats/nsbtp";
import { nitroAnimator, nitroAnimator_matStack } from "../render/nitroAnimator";
import { nitroModel } from "../render/nitroModel";
import { nitroRender } from "../render/nitroRender";
import { getUiScale } from "./uiScale";

export class CountD3DUI implements SceneEntity {
	transparent: boolean;
	scene: Scene;
	pos: vec3;
	mat: mat4;
	proj: mat4;
	param: number[];
	lastViewWidth: number;
	lastViewHeight: number;
	length: number;
	animFrame: number;
	animMat: nitroAnimator_matStack;
	model: nitroModel;
	bmd: nsbmd;
	bca: nsbca;
	btp: nsbtp;
	anim: nitroAnimator;
	constructor(scene: Scene) {
		this.scene = scene;
		this.transparent = false;

		this.pos = vec3.clone([0, 0, 0]);
		this.mat = mat4.create();
		this.proj = mat4.create();

		this.param = [-128, 128, -96, 96].map((e) => e / 1024);

		this.lastViewWidth = 0;
		this.lastViewHeight = 0;
		this.buildOrtho(nitroRender.getViewWidth(), nitroRender.getViewHeight());

		let bmdFile = this.scene.gameRes.Race.getFile("count.nsbmd")!;
		let bcaFile = this.scene.gameRes.Race.getFile("count.nsbca")!;
		let btpFile = this.scene.gameRes.Race.getFile("count.nsbtp")!;

		this.bmd = new nsbmd(bmdFile);
		this.bca = new nsbca(bcaFile);
		this.btp = new nsbtp(btpFile);

		this.anim = new nitroAnimator(this.bmd, this.bca);
		this.length = this.anim.getLength(0) * 3;

		this.animFrame = 0;
		this.animMat = this.anim.setFrame(0, 0, this.animFrame);

		this.model = new nitroModel(this.bmd, null);
		this.model.loadTexPAnim(this.btp);
	}

	private buildOrtho(width: number, height: number) {
		this.lastViewWidth = width;
		this.lastViewHeight = height;
		const scale = getUiScale(width, height);
		const ratio = width / height;
		const vHalf = ((this.param[3] - this.param[2]) * scale) / 2;
		const w = vHalf * ratio;
		mat4.ortho(this.proj, -w, w, this.param[2] * scale, this.param[3] * scale, -0.001, 10);
	}

	draw(view: mat4) {
		if (nitroRender.flagShadow || this.animFrame < 0) return;
		const width = nitroRender.getViewWidth();
		const height = nitroRender.getViewHeight();
		if (width !== this.lastViewWidth || height !== this.lastViewHeight) {
			this.buildOrtho(width, height);
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
