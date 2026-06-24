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

	draw(mv: mat4, project: mat4, matStack?: nitromodel_matStack) {
		let models = this.bmd.modelData.objectData;
		for (let j = 0; j < models.length; j++) {
			this._drawModel(models[j], mv, project, j, matStack);
		}
	}

	drawPoly(mv: mat4, project: mat4, modelind: number, polyInd: number, matStack?: nitromodel_matStack) {
		let models = this.bmd.modelData.objectData;
		let model = models[modelind];

		let polys = model.polys.objectData;
		if (matStack == null) {
			matStack = this._matBuf[modelind];

			if ((this.billboardID != nitroRender.billboardID && this.bmd.hasBillboards) || !matStack.built) {
				nitroRender.lastMatStack = null;
				this._generateMatrixStack(model, matStack.dat);
				matStack.built = true;
				this.billboardID = nitroRender.billboardID;
			}
		}

		let shader = nitroRender.nitroShader;

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
		let models = this.bmd.modelData.objectData;
		this._drawModel(models[mdl], mv, project, mdl);
	}

	getBoundingCollisionModel(modelind: number, polyind: number): nitromodel_BoundingCollisionModel {
		//simple func to get collision model for a model. used when I'm too lazy to define my own... REQUIRES TRI MODE ACTIVE!
		let model = this.bmd.modelData.objectData[modelind];
		let poly = model.polys.objectData[polyind];
		if (this._modelBuffers[modelind][polyind] == null)
			this._modelBuffers[modelind][polyind] = nitroRender.renderDispList(
				poly.disp,
				this._tex[poly.mat],
				poly.stackID == null ? model.lastStackID : poly.stackID
			);

		let tris = this._modelBuffers[modelind][polyind].strips[0].posArray;

		let min = [Infinity, Infinity, Infinity];
		let max = [-Infinity, -Infinity, -Infinity];
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
		let model = this.bmd.modelData.objectData[modelind];
		let poly = model.polys.objectData[polyind];
		if (this._modelBuffers[modelind][polyind] == null)
			this._modelBuffers[modelind][polyind] = nitroRender.renderDispList(
				poly.disp,
				this._tex[poly.mat],
				poly.stackID == null ? model.lastStackID : poly.stackID
			);

		let tris = this._modelBuffers[modelind][polyind].strips[0].posArray;

		let out: nitromodel_collisionModel_dat[] = [];
		let tC = tris.length / 9;
		let off = 0;
		for (let i = 0; i < tC; i++) {
			const Vertices: vec3[] = [];

			Vertices[0] = [tris[off++], tris[off++], tris[off++]];
			Vertices[1] = [tris[off++], tris[off++], tris[off++]];
			Vertices[2] = [tris[off++], tris[off++], tris[off++]];

			//calculate normal
			let v = vec3.sub([0, 0, 0], Vertices[1], Vertices[0]);
			let w = vec3.sub([0, 0, 0], Vertices[2], Vertices[0]);

			out.push({
				Normal: vec3.cross([0, 0, 0], v, w),
				CollisionType: colType,
				Vertices,
			});
		}
		this._collisionModel[modelind][polyind] = { dat: out, scale: model.head.scale };
		return this._collisionModel[modelind][polyind];
	}

	private _loadWhiteTex(btx?: nsbtx) {
		//examines the materials in the loaded model and generates textures for each.
		this._texCanvas = [];
		this._tex = [];
		let models = this.bmd.modelData.objectData;
		for (let j = 0; j < models.length; j++) {
			let model = models[j];
			let mat = model.materials.objectData;
			for (let i = 0; i < mat.length; i++) {
				let m = mat[i];

				let fC = document.createElement("canvas");
				fC.width = 2;
				fC.height = 2;
				let ctx = fC.getContext("2d")!;
				ctx.fillStyle = "black";
				ctx.globalAlpha = 0.33;
				ctx.fillRect(0, 0, 2, 2);
				this._texCanvas.push(fC);
				let t = nitroModel._loadTex(fC, gl, !m.repeatX, !m.repeatY);
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
		let models = this.bmd.modelData.objectData;
		for (let j = 0; j < models.length; j++) {
			let model = models[j];
			let mat = model.materials.objectData;
			for (let i = 0; i < mat.length; i++) {
				mat[i].texInd = this._tex.length;
				this._loadMatTex(mat[i], btx);
			}
		}
	}

	private _loadMatTex(mat: nsbmd_MatInfos, btx: nsbtx, matReplace?: nsbtp_animadata_data_frame) {
		let m: nsbmd_MatInfos | nsbtp_animadata_data_frame = mat;
		if (matReplace) {
			m = matReplace;
		}
		let texI = m.texName;
		let palI = m.palName;

		if (texI == null || palI == null) {
			// debugger;
			console.warn(`WARNING: material ${m} in model could not be assigned a texture.`);
			/*
    
			var fC = document.createElement("canvas");
			fC.width = 2;
			fC.height = 2;
			var ctx = fC.getContext("2d")
			ctx.fillStyle = "white";
			ctx.fillRect(0,0,2,2);
			texCanvas.push(fC);
			var t = nitroModel._loadTex(fC, gl, !mat.repeatX, !mat.repeatY);
			t.realWidth = 2;
			t.realHeight = 2;
			tex.push(t);
			*/

			return;
		}

		let truetex = btx.textureInfoNameToIndex[`$${texI}`] || 0;
		let truepal = btx.paletteInfoNameToIndex[`$${palI}`] || 0;
		let cacheID = `${truetex}:${truepal}`;
		let cached = btx.cache[cacheID];

		this._tex[mat.texInd] = this._cacheTex(btx, truetex, truepal, mat);
	}

	private _cacheTex(btx: nsbtx, truetex: number, truepal: number, m: nsbmd_MatInfos): CustomWebGLTexture {
		let cacheID = `${truetex}:${truepal}`;
		let cached = btx.cache[cacheID];

		if (cached == null) {
			let canvas = btx.readTexWithPal(truetex, truepal);
			if (m.flipX || m.flipY) {
				let fC = document.createElement("canvas");
				let ctx = fC.getContext("2d")!;
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
				let t = nitroModel._loadTex(fC, gl, !m.repeatX, !m.repeatY);
				t.realWidth = canvas.width;
				t.realHeight = canvas.height;
				btx.cache[cacheID] = t;
				return t;
			} else {
				this._texCanvas.push(canvas);
				let oTexture = nitroModel._loadTex(canvas, gl, !m.repeatX, !m.repeatY);
				oTexture.realWidth = canvas.width;
				oTexture.realHeight = canvas.height;
				btx.cache[cacheID] = oTexture;
				return oTexture;
			}
		} else {
			return cached;
		}
	}

	private _drawModel(model: nsbmd_modelData, mv: mat4, project: mat4, modelind: number, matStack?: nitromodel_matStack) {
		let polys = model.polys.objectData;
		if (matStack == null) {
			matStack = this._matBuf[modelind];

			if ((this.billboardID != nitroRender.billboardID && this.bmd.hasBillboards) || !matStack.built) {
				nitroRender.lastMatStack = null;
				this._generateMatrixStack(model, matStack.dat);
				matStack.built = true;
				this.billboardID = nitroRender.billboardID;
			}
		}
		let shader = nitroRender.nitroShader;

		//var mv = mat4.scale([], mv, [model.head.scale, model.head.scale, model.head.scale]);

		gl.uniformMatrix4fv(shader.uniforms.mvMatrixUniform, false, mv);
		gl.uniformMatrix4fv(shader.uniforms.pMatrixUniform, false, project);
		if (matStack != nitroRender.lastMatStack) {
			gl.uniformMatrix4fv(shader.uniforms.matStackUniform, false, matStack.dat);
			nitroRender.lastMatStack = matStack;
		}

		for (let i = 0; i < polys.length; i++) {
			this._drawPoly(polys[i], modelind, i);
		}
	}

	private _drawPoly(poly: nsbmd_poly, modelind: number, polyind: number) {
		let shader = nitroRender.nitroShader;
		let model = this.bmd.modelData.objectData[modelind];

		//texture 0 SHOULD be bound, assuming the nitrorender program has been prepared
		let pmat = poly.mat;
		let matname = model.materials.names[pmat]; //attach tex anim to mat with same name
		if (this._texPAnim != null) {
			let info = this._texPAnim.animData.objectData[modelind];
			let anims = this._texPAnim.animData.objectData[modelind].data;
			let animNum = anims.names.indexOf(matname);
			if (animNum != -1) {
				let offFrame = this._texFrame % info.duration;
				//we got a match! it's wonderful :')
				let anim = anims.objectData[animNum];
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
			gl.bindTexture(gl.TEXTURE_2D, this._tex[pmat]); //load up material texture
			nitroRender.last.tex = this._tex[pmat];
		}

		let material = model.materials.objectData[pmat];
		nitroRender.setAlpha(material.alpha);

		if (this._texAnim != null) {
			//generate and send texture matrix from data
			let matname = model.materials.names[pmat]; //attach tex anim to mat with same name
			let textanims = this._texAnim.animData.objectData[modelind].data;
			let animNum = textanims.names.indexOf(matname);

			if (animNum != -1) {
				//we got a match! it's wonderful :')
				let tanim = textanims.objectData[animNum];
				let mat = this._matAtFrame(this._texFrame, tanim);
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
				return;
			}
			gl.disable(gl.CULL_FACE);
		}
		this._drawModelBuffer(this._modelBuffers[modelind][polyind], gl, shader);
	}

	private _frameLerp(frame: number, step: number, values: number[]) {
		if (values.length == 1) return values[0];
		let i = (frame / (1 << step)) % 1;
		let len = values.length;
		if (step > 0) len -= 1;
		let frame1 = (frame >> step) % len;
		let from = values[frame1];
		let to = values[frame1 + 1] || values[frame1];
		return to * i + from * (1 - i);
	}

	private _matAtFrame(frame: number, anim: nsbta_data_obj) {
		let mat = mat3.create(); //material texture mat is ignored

		mat3.scale(mat, mat, [
			this._frameLerp(frame, anim.frameStep.scaleS, anim.scaleS),
			this._frameLerp(frame, anim.frameStep.scaleT, anim.scaleT),
		]);
		mat3.translate(mat, mat, [
			-this._frameLerp(frame, anim.frameStep.translateS, anim.translateS),
			this._frameLerp(frame, anim.frameStep.translateT, anim.translateT),
		]);

		return mat;
	}

	private _generateMatrixStack(model: nsbmd_modelData, targ: Float32Array) {
		//this generates a matrix stack with the default bones. use nitroAnimator to pass custom matrix stacks using nsbca animations.
		let matrices: mat4[] = [];

		let objs = model.objects.objectData;
		let cmds = model.commands;
		let curMat = mat4.clone(this.baseMat);
		let lastStackID = 0;
		let highestUsed = -1;

		for (let i = 0; i < cmds.length; i++) {
			let cmd = cmds[i];
			if (cmd.copy != null) {
				//copy this matrix to somewhere else, because it's bound and is going to be overwritten.
				matrices[cmd.dest!] = mat4.clone(matrices[cmd.copy!]);
				continue;
			}
			if (cmd.restoreID != null) curMat = mat4.clone(matrices[cmd.restoreID]);
			let o = objs[cmd.obj!];
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

		let scale: vec3 = [model.head.scale, model.head.scale, model.head.scale];
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
			let obj = buf.strips[i];

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
		let texture = gl.createTexture() as CustomWebGLTexture;
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
