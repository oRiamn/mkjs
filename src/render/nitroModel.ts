import { nsbmd, nsbmd_MatInfos, nsbmd_modelData, nsbmd_poly } from "../formats/nsbmd";
import { nsbta, nsbta_data_obj } from "../formats/nsbta";
import { nsbtp, nsbtp_animadata_data_frame } from "../formats/nsbtp";
import { nsbtx } from "../formats/nsbtx";
import { nitroRender, nitroRender_modelBuffer } from "./nitroRender";
import { nitroShaders_defaultShader } from "./nitroShaders";

export type nitromodel_BoundingCollisionModel_dat = {
	Vertices: vec3[];
	Normal: vec3;
	CollisionType?: number; // set in trafficCar.ts...
}[];

export type nitromodel_BoundingCollisionModel = {
	dat: nitromodel_BoundingCollisionModel_dat;
	scale: number;
};

type nitromodel_collisionModel_dat = {
	Normal: vec3;
	CollisionType: number;
	Vertices: vec3[];
};

export type nitromodel_collisionModel = { dat: nitromodel_collisionModel_dat[]; scale: number };

export type nitromodel_matStack = { built: boolean; dat: Float32Array };
type nitroModel_textMapper = { tex: {}; pal: {} };

export type nitroDrawPass = 'all' | 'opaque' | 'blend';

export class nitroModel {
	btx: nsbtx | null;
	bmd: nsbmd;
	billboardID!: number;
	baseMat: mat4;

	private _texAnim: nsbta;
	private _texFrame: number;
	private _texPAnim: nsbtp;
	private _texCanvas: HTMLCanvasElement[];
	private _tex: CustomWebGLTexture[];
	private _collisionModel: nitromodel_collisionModel[][];
	private _matBufEmpty: Float32Array;
	private _off: number;
	private _texMap: { tex: {}; pal: {} };

	private _modelBuffers: nitroRender_modelBuffer[][];
	private _matBuf: nitromodel_matStack[];
	shadVol!: nitroModel;

	constructor(bmd: nsbmd, btx: nsbtx | null, texMap?: nitroModel_textMapper | null) {
		this.btx = btx;
		this.bmd = bmd;

		this._texCanvas = undefined!;
		this._tex = undefined!;
		this._texAnim = undefined!;
		this._texPAnim = undefined!;
		this._texFrame = undefined!;
		this._collisionModel = [];
		this._matBufEmpty = new Float32Array(31 * 16);

		const temp = mat4.create();
		this._off = 0;
		for (let i = 0; i < 31; i++) {
			this._matBufEmpty.set(temp, this._off);
			this._off += 16;
		}

		this._texMap = texMap || { tex: {}, pal: {} };
		//var matStack;

		this.baseMat = mat4.create();

		this._modelBuffers = [];
		this._matBuf = [];
		for (let i = 0; i < this.bmd.modelData.objectData.length; i++) {
			this._modelBuffers.push(new Array(this.bmd.modelData.objectData[i].polys.objectData.length));
			this._matBuf.push({ built: false, dat: new Float32Array(31 * 16) });
		}

		if (this.btx != null) {
			this._loadTexture(this.btx);
		} else if (this.bmd.tex != null) {
			this._loadTexture(this.bmd.tex);
		} else {
			this._loadWhiteTex();
		}
	}

	loadTexAnim(bta: nsbta) {
		this._texAnim = bta;
		this._texFrame = 0;
	}

	loadTexPAnim(btp: nsbtp) {
		this._texPAnim = btp;
	}

	setFrame(frame: number) {
		this._texFrame = frame;
	}

	setBaseMat(mat: mat4) {
		this.baseMat = mat;
		this.billboardID = -1;
	}

	draw(mv: mat4, project: mat4, matStack?: nitromodel_matStack, pass: nitroDrawPass = 'all') {
		const models = this.bmd.modelData.objectData;
		for (let j = 0; j < models.length; j++) {
			this._drawModel(models[j], mv, project, j, matStack, pass);
		}
	}

	drawPoly(mv: mat4, project: mat4, modelind: number, polyInd: number, matStack?: nitromodel_matStack) {
		const models = this.bmd.modelData.objectData;
		const model = models[modelind];

		const polys = model.polys.objectData;
		if (matStack == null) {
			matStack = this._matBuf[modelind];

			if ((this.billboardID != nitroRender.billboardID && this.bmd.hasBillboards) || !matStack.built) {
				nitroRender.lastMatStack = null;
				this._generateMatrixStack(model, matStack.dat);
				matStack.built = true;
				this.billboardID = nitroRender.billboardID;
			}
		}

		const shader = nitroRender.nitroShader;

		//var mv = mat4.scale([], mv, [model.head.scale, model.head.scale, model.head.scale]);

		gl.uniformMatrix4fv(shader.uniforms.mvMatrixUniform, false, mv);
		gl.uniformMatrix4fv(shader.uniforms.pMatrixUniform, false, project);
		if (matStack != nitroRender.lastMatStack) {
			gl.uniformMatrix4fv(shader.uniforms.matStackUniform, false, matStack.dat);
			nitroRender.lastMatStack = matStack;
		}

		this._drawPoly(polys[polyInd], modelind, polyInd);
	}

	drawModel(mv: mat4, project: mat4, mdl: number) {
		const models = this.bmd.modelData.objectData;
		this._drawModel(models[mdl], mv, project, mdl);
	}

	getBoundingCollisionModel(modelind: number, polyind: number): nitromodel_BoundingCollisionModel {
		//simple func to get collision model for a model. used when I'm too lazy to define my own... REQUIRES TRI MODE ACTIVE!
		const model = this.bmd.modelData.objectData[modelind];
		const poly = model.polys.objectData[polyind];
		if (this._modelBuffers[modelind][polyind] == null) {
			nitroRender.setAlpha(1);
			this._modelBuffers[modelind][polyind] = nitroRender.renderDispList(
				poly.disp,
				this._tex[poly.mat],
				poly.stackID == null ? model.lastStackID : poly.stackID
			);
		}

		const tris = this._modelBuffers[modelind][polyind].strips[0].posArray;

		const min = [Infinity, Infinity, Infinity];
		const max = [-Infinity, -Infinity, -Infinity];
		for (let i = 0; i < tris.length; i += 3) {
			for (let j = 0; j < 3; j++) {
				if (tris[i + j] < min[j]) min[j] = tris[i + j];
				if (tris[i + j] > max[j]) max[j] = tris[i + j];
			}
		}
		//create the bounding box
		const out: nitromodel_BoundingCollisionModel_dat = [
			{
				//top
				Vertices: [
					[max[0], max[1], max[2]],
					[max[0], max[1], min[2]],
					[min[0], max[1], min[2]],
				],
				Normal: [0, 1, 0],
			},
			{
				Vertices: [
					[min[0], max[1], min[2]],
					[min[0], max[1], max[2]],
					[max[0], max[1], max[2]],
				],
				Normal: [0, 1, 0],
			},

			{
				//bottom
				Vertices: [
					[min[0], min[1], min[2]],
					[max[0], min[1], min[2]],
					[max[0], min[1], max[2]],
				],
				Normal: [0, -1, 0],
			},
			{
				Vertices: [
					[max[0], min[1], max[2]],
					[min[0], min[1], max[2]],
					[min[0], min[1], min[2]],
				],
				Normal: [0, -1, 0],
			},

			{
				//back (farthest z)
				Vertices: [
					[max[0], max[1], max[2]],
					[max[0], min[1], max[2]],
					[min[0], min[1], max[2]],
				],
				Normal: [0, 0, 1],
			},
			{
				Vertices: [
					[min[0], min[1], max[2]],
					[min[0], max[1], max[2]],
					[max[0], max[1], max[2]],
				],
				Normal: [0, 0, 1],
			},

			{
				//front (closest z)
				Vertices: [
					[min[0], min[1], min[2]],
					[max[0], min[1], min[2]],
					[max[0], max[1], min[2]],
				],
				Normal: [0, 0, -1],
			},
			{
				Vertices: [
					[max[0], max[1], min[2]],
					[min[0], max[1], min[2]],
					[min[0], min[1], min[2]],
				],
				Normal: [0, 0, -1],
			},

			{
				//right (pos x)
				Vertices: [
					[max[0], max[1], max[2]],
					[max[0], min[1], max[2]],
					[max[0], min[1], min[2]],
				],
				Normal: [1, 0, 0],
			},
			{
				Vertices: [
					[max[0], min[1], min[2]],
					[max[0], max[1], min[2]],
					[max[0], max[1], max[2]],
				],
				Normal: [1, 0, 0],
			},

			{
				//left (neg x)
				Vertices: [
					[-max[0], min[1], min[2]],
					[-max[0], min[1], max[2]],
					[-max[0], max[1], max[2]],
				],
				Normal: [-1, 0, 0],
			},
			{
				Vertices: [
					[-max[0], max[1], max[2]],
					[-max[0], max[1], min[2]],
					[-max[0], min[1], min[2]],
				],
				Normal: [-1, 0, 0],
			},
		];
		return { dat: out, scale: model.head.scale };
	}

	getCollisionModel(modelind: number, polyind: number, colType: number) {
		//simple func to get collision model for a model. used when I'm too lazy to define my own... REQUIRES TRI MODE ACTIVE!
		if (this._collisionModel[modelind] == null) this._collisionModel[modelind] = [];
		if (this._collisionModel[modelind][polyind] != null) return this._collisionModel[modelind][polyind];
		const model = this.bmd.modelData.objectData[modelind];
		const poly = model.polys.objectData[polyind];
		if (this._modelBuffers[modelind][polyind] == null) {
			nitroRender.setAlpha(1);
			this._modelBuffers[modelind][polyind] = nitroRender.renderDispList(
				poly.disp,
				this._tex[poly.mat],
				poly.stackID == null ? model.lastStackID : poly.stackID
			);
		}

		const tris = this._modelBuffers[modelind][polyind].strips[0].posArray;

		const out: nitromodel_collisionModel_dat[] = [];
		const tC = tris.length / 9;
		let off = 0;
		for (let i = 0; i < tC; i++) {
			const Vertices: vec3[] = [];

			Vertices[0] = [tris[off++], tris[off++], tris[off++]];
			Vertices[1] = [tris[off++], tris[off++], tris[off++]];
			Vertices[2] = [tris[off++], tris[off++], tris[off++]];

			//calculate normal
			const v = vec3.sub([0, 0, 0], Vertices[1], Vertices[0]);
			const w = vec3.sub([0, 0, 0], Vertices[2], Vertices[0]);

			out.push({
				Normal: vec3.cross([0, 0, 0], v, w),
				CollisionType: colType,
				Vertices,
			});
		}
		this._collisionModel[modelind][polyind] = { dat: out, scale: model.head.scale };
		return this._collisionModel[modelind][polyind];
	}

	private _loadWhiteTex(_btx?: nsbtx) {
		//examines the materials in the loaded model and generates textures for each.
		this._texCanvas = [];
		this._tex = [];
		const models = this.bmd.modelData.objectData;
		for (let j = 0; j < models.length; j++) {
			const model = models[j];
			const mat = model.materials.objectData;
			for (let i = 0; i < mat.length; i++) {
				const m = mat[i];

				const fC = document.createElement("canvas");
				fC.width = 2;
				fC.height = 2;
				const ctx = fC.getContext("2d")!;
				ctx.fillStyle = "black";
				ctx.globalAlpha = 0.33;
				ctx.fillRect(0, 0, 2, 2);
				this._texCanvas.push(fC);
				const t = nitroModel._loadTex(fC, gl, !m.repeatX, !m.repeatY);
				t.realWidth = 2;
				t.realHeight = 2;
				this._tex.push(t);
			}
		}
	}

	private _loadTexture(btx: nsbtx) {
		//examines the materials in the loaded model and generates textures for each.
		this._texCanvas = [];
		this._tex = [];
		const models = this.bmd.modelData.objectData;
		for (let j = 0; j < models.length; j++) {
			const model = models[j];
			const mat = model.materials.objectData;
			for (let i = 0; i < mat.length; i++) {
				mat[i].texInd = this._tex.length;
				this._loadMatTex(mat[i], btx);
			}
		}
	}

	private _assignPlaceholderTex(mat: nsbmd_MatInfos) {
		const fC = document.createElement("canvas");
		fC.width = 2;
		fC.height = 2;
		const ctx = fC.getContext("2d")!;
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, 2, 2);
		this._texCanvas.push(fC);
		const t = nitroModel._loadTex(fC, gl, !mat.repeatX, !mat.repeatY);
		t.realWidth = 2;
		t.realHeight = 2;
		this._tex[mat.texInd] = t;
	}

	private _resolvePaletteIndex(btx: nsbtx, texIndex: number, palName: string | null | undefined): number | null {
		if (palName != null) {
			return btx.paletteInfoNameToIndex[`$${palName}`] ?? 0;
		}

		const texInfo = btx.textureInfo.objectData[texIndex];
		if (texInfo?.format === 7) {
			return 0;
		}

		return btx.paletteInfo.numObjects > 0 ? 0 : null;
	}

	private _loadMatTex(mat: nsbmd_MatInfos, btx: nsbtx, matReplace?: nsbtp_animadata_data_frame) {
		let m: nsbmd_MatInfos | nsbtp_animadata_data_frame = mat;
		if (matReplace) {
			m = matReplace;
		}
		const texI = m.texName;
		const palI = m.palName;

		if (texI == null) {
			console.warn(`WARNING: material in model could not be assigned a texture (missing tex name).`);
			this._assignPlaceholderTex(mat);
			return;
		}

		const truetex = btx.textureInfoNameToIndex[`$${texI}`] ?? 0;
		const truepal = this._resolvePaletteIndex(btx, truetex, palI);
		if (truepal == null) {
			console.warn(`WARNING: material ${texI} in model could not be assigned a palette.`);
			this._assignPlaceholderTex(mat);
			return;
		}

		this._tex[mat.texInd] = this._cacheTex(btx, truetex, truepal, mat);
	}

	private _cacheTex(btx: nsbtx, truetex: number, truepal: number, m: nsbmd_MatInfos): CustomWebGLTexture {
		const cacheID = `${truetex}:${truepal}`;
		const cached = btx.cache[cacheID];

		if (cached == null) {
			const canvas = btx.readTexWithPal(truetex, truepal);
			if (m.flipX || m.flipY) {
				const fC = document.createElement("canvas");
				const ctx = fC.getContext("2d")!;
				fC.width = m.flipX ? canvas.width * 2 : canvas.width;
				fC.height = m.flipY ? canvas.height * 2 : canvas.height;

				ctx.drawImage(canvas, 0, 0);
				ctx.save();
				if (m.flipX) {
					ctx.translate(2 * canvas.width, 0);
					ctx.scale(-1, 1);
					ctx.drawImage(canvas, 0, 0);
					ctx.restore();
					ctx.save();
				}
				if (m.flipY) {
					ctx.translate(0, 2 * canvas.height);
					ctx.scale(1, -1);
					ctx.drawImage(fC, 0, 0);
					ctx.restore();
				}
				this._texCanvas.push(fC);
				const t = nitroModel._loadTex(fC, gl, !m.repeatX, !m.repeatY);
				t.realWidth = canvas.width;
				t.realHeight = canvas.height;
				btx.cache[cacheID] = t;
				return t;
			} else {
				this._texCanvas.push(canvas);
				const oTexture = nitroModel._loadTex(canvas, gl, !m.repeatX, !m.repeatY);
				oTexture.realWidth = canvas.width;
				oTexture.realHeight = canvas.height;
				btx.cache[cacheID] = oTexture;
				return oTexture;
			}
		} else {
			return cached;
		}
	}

	private _drawModel(
		model: nsbmd_modelData,
		mv: mat4,
		project: mat4,
		modelind: number,
		matStack?: nitromodel_matStack,
		pass: nitroDrawPass = 'all'
	) {
		const polys = model.polys.objectData;
		if (matStack == null) {
			matStack = this._matBuf[modelind];

			if ((this.billboardID != nitroRender.billboardID && this.bmd.hasBillboards) || !matStack.built) {
				nitroRender.lastMatStack = null;
				this._generateMatrixStack(model, matStack.dat);
				matStack.built = true;
				this.billboardID = nitroRender.billboardID;
			}
		}
		const shader = nitroRender.nitroShader;

		//var mv = mat4.scale([], mv, [model.head.scale, model.head.scale, model.head.scale]);

		gl.uniformMatrix4fv(shader.uniforms.mvMatrixUniform, false, mv);
		gl.uniformMatrix4fv(shader.uniforms.pMatrixUniform, false, project);
		if (matStack != nitroRender.lastMatStack) {
			gl.uniformMatrix4fv(shader.uniforms.matStackUniform, false, matStack.dat);
			nitroRender.lastMatStack = matStack;
		}

		const blendPolys: number[] = [];
		for (let i = 0; i < polys.length; i++) {
			const mat = model.materials.objectData[polys[i].mat];
			const isBlend = this._materialUsesAlphaBlend(mat);
			if (isBlend) {
				if (pass !== 'opaque') blendPolys.push(i);
			} else if (pass !== 'blend') {
				this._drawPoly(polys[i], modelind, i);
			}
		}

		if (blendPolys.length > 0) {
			gl.depthMask(false);
			for (let i = 0; i < blendPolys.length; i++) {
				this._drawPoly(polys[blendPolys[i]], modelind, blendPolys[i]);
			}
			gl.depthMask(true);
		}
	}

	/** Per-texel alpha (A3I5 / A5I3 / RGB5A1) needs a later blend pass; cutout alpha stays opaque. */
	private _materialUsesAlphaBlend(material: nsbmd_MatInfos): boolean {
		if (material.alpha < 0.999) return true;
		const btx = this.btx ?? this.bmd.tex;
		if (btx == null || material.texName == null) return false;
		const texIdx = btx.textureInfoNameToIndex[`$${material.texName}`];
		if (texIdx == null) return false;
		const tex = btx.textureInfo.objectData[texIdx];
		if (tex == null) return false;
		return tex.format === 1 || tex.format === 6 || tex.format === 7;
	}

	private _drawPoly(poly: nsbmd_poly, modelind: number, polyind: number) {
		const shader = nitroRender.nitroShader;
		const model = this.bmd.modelData.objectData[modelind];

		//texture 0 SHOULD be bound, assuming the nitrorender program has been prepared
		const pmat = poly.mat;
		const matname = model.materials.names[pmat]; //attach tex anim to mat with same name
		if (this._texPAnim != null) {
			const info = this._texPAnim.animData.objectData[modelind];
			const anims = this._texPAnim.animData.objectData[modelind].data;
			const animNum = anims.names.indexOf(matname);
			if (animNum != -1) {
				const offFrame = this._texFrame % info.duration;
				//we got a match! it's wonderful :')
				const anim = anims.objectData[animNum];
				//look thru frames for the approprate point in the animation
				for (let i = anim.frames.length - 1; i >= 0; i--) {
					if (offFrame >= anim.frames[i].time) {
						const oBtx = this.btx == null ? this.bmd.tex : this.btx;
						const oMatReplace = anim.frames[i];
						const oMat = model.materials.objectData[pmat];
						this._loadMatTex(oMat, oBtx, oMatReplace);
						/*
						tex[pmat] = cacheTex(btx == null ? bmd.tex : btx, anim.frames[i].tex, anim.frames[i].mat, model.materials.objectData[pmat]);
						*/
						break;
					}
				}
			}
		}

		if (nitroRender.last.tex != this._tex[pmat]) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this._tex[pmat]); //load up material texture
			nitroRender.last.tex = this._tex[pmat];
		}

		const material = model.materials.objectData[pmat];
		const receivingShadow = nitroRender.usingShadowShader();
		if (receivingShadow) {
			nitroRender.setAlpha(material.alpha);
		} else {
			nitroRender.setAlpha(1);
		}

		if (this._texAnim != null) {
			//generate and send texture matrix from data
			const matname = model.materials.names[pmat]; //attach tex anim to mat with same name
			const textanims = this._texAnim.animData.objectData[modelind].data;
			const animNum = textanims.names.indexOf(matname);

			if (animNum != -1) {
				//we got a match! it's wonderful :')
				const tanim = textanims.objectData[animNum];
				const mat = this._matAtFrame(this._texFrame, tanim);
				gl.uniformMatrix3fv(shader.uniforms.texMatrixUniform, false, mat);
			} else {
				gl.uniformMatrix3fv(shader.uniforms.texMatrixUniform, false, material.texMat);
			}
		} else gl.uniformMatrix3fv(shader.uniforms.texMatrixUniform, false, material.texMat);

		if (this._modelBuffers[modelind][polyind] == null)
			this._modelBuffers[modelind][polyind] = nitroRender.renderDispList(
				poly.disp,
				this._tex[poly.mat],
				poly.stackID == null ? model.lastStackID : poly.stackID
			);

		const applyMaterialAlpha = !receivingShadow && material.alpha < 0.999;
		const prevColMult = applyMaterialAlpha ? nitroRender.getColMult() : null;
		if (applyMaterialAlpha) {
			nitroRender.setColMult([prevColMult![0], prevColMult![1], prevColMult![2], prevColMult![3] * material.alpha]);
		}

		if (material.cullMode < 3) {
			gl.enable(gl.CULL_FACE);
			gl.cullFace(nitroRender.cullModes[material.cullMode]);
		} else {
			if (nitroRender.forceFlatNormals) {
				//dual side lighting model, course render mode essentially
				gl.enable(gl.CULL_FACE);
				gl.cullFace(gl.BACK);
				this._drawModelBuffer(this._modelBuffers[modelind][polyind], gl, shader);
				nitroRender.setNormalFlip(-1);
				gl.cullFace(gl.FRONT);
				this._drawModelBuffer(this._modelBuffers[modelind][polyind], gl, shader);
				nitroRender.setNormalFlip(1);
				if (applyMaterialAlpha) nitroRender.setColMult(prevColMult!);
				return;
			}
			gl.disable(gl.CULL_FACE);
		}
		this._drawModelBuffer(this._modelBuffers[modelind][polyind], gl, shader);
		if (applyMaterialAlpha) nitroRender.setColMult(prevColMult!);
	}

	private _frameLerp(frame: number, step: number, values: number[]) {
		if (values.length == 1) return values[0];
		const i = (frame / (1 << step)) % 1;
		let len = values.length;
		if (step > 0) len -= 1;
		const frame1 = (frame >> step) % len;
		const from = values[frame1];
		const to = values[frame1 + 1] || values[frame1];
		return to * i + from * (1 - i);
	}

	private _matAtFrame(frame: number, anim: nsbta_data_obj) {
		const mat = mat3.create();

		const scaleS = this._frameLerp(frame, anim.frameStep.scaleS, anim.scaleS);
		const scaleT = this._frameLerp(frame, anim.frameStep.scaleT, anim.scaleT);
		const translateS = this._frameLerp(frame, anim.frameStep.translateS, anim.translateS);
		const translateT = this._frameLerp(frame, anim.frameStep.translateT, anim.translateT);

		let rotA = 0;
		let rotB = 1;
		if (anim.rotation.length >= 2) {
			const rotFrame = frame >> anim.frameStep.rotation;
			const rotIdx = Math.min(rotFrame * 2, anim.rotation.length - 2);
			rotA = anim.rotation[rotIdx];
			rotB = anim.rotation[rotIdx + 1];
		}

		mat3.scale(mat, mat, [scaleS, scaleT]);
		const rot = mat3.fromValues(rotB, rotA, 0, -rotA, rotB, 0, 0, 0, 1);
		mat3.multiply(mat, mat, rot);
		mat3.translate(mat, mat, [-translateS, translateT]);

		return mat;
	}

	private _generateMatrixStack(model: nsbmd_modelData, targ: Float32Array) {
		//this generates a matrix stack with the default bones. use nitroAnimator to pass custom matrix stacks using nsbca animations.
		const matrices: mat4[] = [];

		const objs = model.objects.objectData;
		const cmds = model.commands;
		let curMat = mat4.clone(this.baseMat);
		let lastStackID = 0;
		let highestUsed = -1;

		for (let i = 0; i < cmds.length; i++) {
			const cmd = cmds[i];
			if (cmd.copy != null) {
				//copy this matrix to somewhere else, because it's bound and is going to be overwritten.
				matrices[cmd.dest!] = mat4.clone(matrices[cmd.copy!]);
				continue;
			}
			if (cmd.restoreID != null) curMat = mat4.clone(matrices[cmd.restoreID]);
			const o = objs[cmd.obj!];
			mat4.multiply(curMat, curMat, o.mat);
			if (o.billboardMode == 1) mat4.multiply(curMat, curMat, nitroRender.billboardMat);
			if (o.billboardMode == 2) mat4.multiply(curMat, curMat, nitroRender.yBillboardMat);

			if (cmd.stackID != null) {
				matrices[cmd.stackID] = mat4.clone(curMat);
				lastStackID = cmd.stackID;
				if (lastStackID > highestUsed) highestUsed = lastStackID;
			} else {
				matrices[lastStackID] = mat4.clone(curMat);
			}
		}

		model.lastStackID = lastStackID;

		const scale: vec3 = [model.head.scale, model.head.scale, model.head.scale];
		targ.set(this._matBufEmpty);
		let off = 0;
		for (let i = 0; i <= highestUsed; i++) {
			if (matrices[i] != null) {
				mat4.scale(matrices[i], matrices[i], scale);
				targ.set(matrices[i], off);
			}
			off += 16;
		}

		return targ;
	}

	private _drawModelBuffer(buf: nitroRender_modelBuffer, gl: CustomWebGLRenderingContext, shader: nitroShaders_defaultShader) {
		for (let i = 0; i < buf.strips.length; i++) {
			const obj = buf.strips[i];

			if (obj != nitroRender.last.obj) {
				gl.bindBuffer(gl.ARRAY_BUFFER, obj.vPos);
				gl.vertexAttribPointer(shader.attributes.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

				gl.bindBuffer(gl.ARRAY_BUFFER, obj.vTx);
				gl.vertexAttribPointer(shader.attributes.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

				gl.bindBuffer(gl.ARRAY_BUFFER, obj.vCol);
				gl.vertexAttribPointer(shader.attributes.colorAttribute, 4, gl.FLOAT, false, 0, 0);

				gl.bindBuffer(gl.ARRAY_BUFFER, obj.vMat);
				gl.vertexAttribPointer(shader.attributes.matAttribute, 1, gl.FLOAT, false, 0, 0);

				gl.bindBuffer(gl.ARRAY_BUFFER, obj.vNorm);
				gl.vertexAttribPointer(shader.attributes.normAttribute, 3, gl.FLOAT, false, 0, 0);
				nitroRender.last.obj = obj;
			}

			gl.drawArrays(obj.mode, 0, obj.verts);
		}
	}

	private static _loadTex(img: HTMLCanvasElement, gl: CustomWebGLRenderingContext, clampx: boolean, clampy: boolean): CustomWebGLTexture {
		//general purpose function for loading an image into a texture.
		const texture = gl.createTexture() as CustomWebGLTexture;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		if (clampx) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		if (clampy) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.generateMipmap(gl.TEXTURE_2D);

		texture.width = img.width;
		texture.height = img.height;

		gl.bindTexture(gl.TEXTURE_2D, null);

		return texture;
	}
}
