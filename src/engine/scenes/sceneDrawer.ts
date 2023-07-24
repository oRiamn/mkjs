//
// sceneDrawer.js
//--------------------
// Provides functions to draw scenes in various ways.
// by RHY3756547
//
import { nitroRender } from "../../render/nitroRender";
import { shadowRender } from "../../render/shadowRender";
import { courseScene } from "./courseScene";

export class sceneDrawer {
	gl: CustomWebGLRenderingContext;
	shadowTarg: {
		color: CustomWebGLTexture;
		depth: CustomWebGLTexture;
		fb: WebGLFramebuffer;
	};
	shadowRes: number;
	static instance: sceneDrawer;
	constructor() {
		this.gl = null;
		this.shadowTarg = null;
		this.shadowRes = 2048;
	}

	static getInstance() {
		if (!this.instance) {
			this.instance = new sceneDrawer();
		}
		return this.instance;
	}

	init(gl: CustomWebGLRenderingContext) {
		this.gl = gl;
		this.shadowTarg = this.createRenderTarget(
			gl,
			this.shadowRes,
			this.shadowRes,
			true
		);
	}

	drawWithShadow(gl: CustomWebGLRenderingContext, scn: courseScene, x: number, y: number, width: number, height: number) {
		if (scn.lastWidth != width || scn.lastHeight != height) {
			scn.lastWidth = width;
			scn.lastHeight = height;
			scn.renderTarg = this.createRenderTarget(gl, width, height, true);
		}

		var view = scn.camera.getView(scn, width, height);
		var viewProj = mat4.mul(view.p, view.p, view.mv);

		var shadMat = scn.shadMat;

		if (scn.farShad == null) {
			scn.farShad = this.createRenderTarget(gl, this.shadowRes * 2, this.shadowRes * 2, true);
			gl.viewport(0, 0, this.shadowRes * 2, this.shadowRes * 2);
			gl.bindFramebuffer(gl.FRAMEBUFFER, scn.farShad.fb);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
			gl.colorMask(false, false, false, false);
			scn.draw(gl, scn.farShadMat, true);
		}

		gl.viewport(0, 0, this.shadowRes, this.shadowRes);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowTarg.fb);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
		gl.colorMask(false, false, false, false);
		scn.draw(gl, shadMat, true);

		gl.viewport(0, 0, width, height);
		gl.bindFramebuffer(gl.FRAMEBUFFER, scn.renderTarg.fb);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
		gl.colorMask(true, true, true, true);
		scn.draw(gl, viewProj, false);

		scn.sndUpdate(view.mv);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		gl.viewport(x, y, width, height);
		shadowRender.drawShadowed(scn.renderTarg.color, scn.renderTarg.depth, this.shadowTarg.depth, scn.farShad.depth, viewProj, shadMat, scn.farShadMat)
	}

	drawTest(gl: CustomWebGLRenderingContext, scn: courseScene, x: number, y: number, width: number, height: number) {

		var shadMat = scn.shadMat;
		var viewProj = mat4.mul(mat4.create(), scn.camera.view.p, scn.camera.view.mv);
		var view = {
			p: viewProj,
			mv: scn.camera.view.mv
		};

		nitroRender.unsetShadowMode();
		nitroRender.flagShadow = true;
		nitroRender.updateBillboards(scn.lightMat);

		if (scn.farShad == null) {
			scn.farShad = this.createRenderTarget(gl, this.shadowRes * 2, this.shadowRes * 2, true);
			gl.viewport(0, 0, this.shadowRes * 2, this.shadowRes * 2);
			gl.bindFramebuffer(gl.FRAMEBUFFER, scn.farShad.fb);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
			gl.colorMask(false, false, false, false);
			scn.draw(gl, scn.farShadMat, true);
		}

		gl.viewport(0, 0, this.shadowRes, this.shadowRes);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowTarg.fb);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
		gl.colorMask(false, false, false, false);
		scn.draw(gl, shadMat, true);

		nitroRender.setShadowMode(this.shadowTarg.depth, scn.farShad.depth, shadMat, scn.farShadMat, scn.lightDir);
		nitroRender.flagShadow = false;

		nitroRender.updateBillboards(view.mv);
		gl.viewport(x, y, width, height);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
		gl.colorMask(true, true, true, true);
		scn.draw(gl, viewProj, false);

		scn.sndUpdate(view.mv);

	}

	createRenderTarget(gl: CustomWebGLRenderingContext, xsize: number, ysize: number, _depth: boolean) {
		var depthTextureExt = gl.getExtension("WEBGL_depth_texture");
		if (!depthTextureExt) alert("depth texture not supported! we're DOOMED! jk we'll just have to add a fallback for people with potato gfx");

		var colorTexture = gl.createTexture() as CustomWebGLTexture;
		gl.bindTexture(gl.TEXTURE_2D, colorTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, xsize, ysize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		var depthTexture = gl.createTexture() as CustomWebGLTexture;
		gl.bindTexture(gl.TEXTURE_2D, depthTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, xsize, ysize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);

		var framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

		return {
			color: colorTexture,
			depth: depthTexture,
			fb: framebuffer
		}
	}
}