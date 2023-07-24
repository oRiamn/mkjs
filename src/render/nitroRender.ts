//
// nitroRender._js
//--------------------
// Provides an interface with which NSBMD models can be drawn to a fst canvas.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
// /formats/nitro.js --passive requirement from other nitro formats
// /formats/nsbmd.js
// /formats/nsbta.js
// /formats/nsbtx.js
//

import { nitromodel_matStack } from "./nitroModel";
import { nitroShaders, nitroShaders_defaultShader, nitroShaders_shadowShader } from "./nitroShaders";

type nitroRender_modelBufferStrip = {
	posArray: Float32Array,
	vPos: WebGLBuffer,
	vTx: WebGLBuffer,
	vCol: WebGLBuffer,
	vMat: WebGLBuffer,
	vNorm: WebGLBuffer,
	verts: number,
	mode: GLenum,
}


export type nitroRender_modelBuffer = {
	strips: nitroRender_modelBufferStrip[];
}


export class nitroRender {

	static cullModes: GLenum[] = [];
	static billboardID = 0; //incrememts every time billboards need to be updated. cycles &0xFFFFFF to avoid issues
	static lastMatStack: nitromodel_matStack = null; //used to check if we need to send the matStack again. will be used with a versioning system in future.
	static last: {
		tex?: CustomWebGLTexture,
		obj?: nitroRender_modelBufferStrip,
	} = {}; //obj: the last vertex buffers drawn	
	static flagShadow = false;
	static forceFlatNormals = false; //generate flat normals for this mesh. Used for course model for better shadows.

	static _gl: CustomWebGLRenderingContext;
	static _cVec: number[] = undefined;
	static _color: [number, number, number, number] = undefined;
	static _texCoord: [number, number] = undefined;
	static _norm: number[] = undefined;
	static _vecMode: number = undefined;
	static _vecPos: number[] = undefined;
	static _vecNorm: number[] = undefined;
	static _vecTx: number[] = undefined;
	static _vecCol: number[] = undefined;
	static _vecNum: number = undefined;
	static _vecMat: number[] = undefined;
	static _curMat: number = undefined;
	static _stripAlt: number = undefined;
	static _texWidth: number = undefined;
	static _texHeight: number = undefined;
	static _modelBuffer: nitroRender_modelBuffer = undefined;

	static _instructions: {
		[x: number]: (view: DataView, off: number) => void;
	} = {};
	static _alphaMul = 1;
	static _optimiseTriangles = true; //improves draw performance by >10x on most models.

	static _paused = false;
	static _parameters: { [x: number]: number } = {
		0: 0,
		0x10: 1, 0x11: 0, 0x12: 1, 0x13: 1, 0x14: 1, 0x15: 0, 0x16: 16, 0x17: 12, 0x18: 16, 0x19: 12, 0x1A: 9, 0x1B: 3, 0x1C: 3, //matrix commands
		0x20: 1, 0x21: 1, 0x22: 1, 0x23: 2, 0x24: 1, 0x25: 1, 0x26: 1, 0x27: 1, 0x28: 1, 0x29: 1, 0x2A: 1, 0x2B: 1, //vertex commands
		0x30: 1, 0x31: 1, 0x32: 1, 0x33: 1, 0x34: 32, //material param
		0x40: 1, 0x41: 0, //begin or end vertices
		0x50: 1, //swap buffers
		0x60: 1, //viewport
		0x70: 3, 0x71: 2, 0x72: 1 //tests
	}
	static billboardMat: mat4;
	static yBillboardMat: mat4;
	static nitroShader: nitroShaders_defaultShader | nitroShaders_shadowShader;

	static _defaultShader: nitroShaders_defaultShader;
	static _shadowShader: nitroShaders_shadowShader;

	static init(ctx: CustomWebGLRenderingContext) {
		nitroRender._gl = ctx;
		nitroRender.billboardMat = mat4.create();
		nitroRender.yBillboardMat = mat4.create();

		nitroRender._defaultShader = nitroShaders.compileDefaultShader();
		nitroRender._shadowShader = nitroShaders.compileShadowShader();
		

		nitroRender.nitroShader = nitroRender._defaultShader;
		nitroRender.cullModes = [
			nitroRender._gl.FRONT_AND_BACK,
			nitroRender._gl.FRONT,
			nitroRender._gl.BACK
		];


		nitroRender._instructions[0x14] = function (view: DataView, off: number) { //restore to matrix, used constantly for bone transforms
			nitroRender._curMat = view.getUint8(off);
		}

		nitroRender._instructions[0x20] = function (view: DataView, off: number) { //color
			var dat = view.getUint16(off, true);
			nitroRender._color[0] = (dat & 31) / 31;
			nitroRender._color[1] = ((dat >> 5) & 31) / 31;
			nitroRender._color[2] = ((dat >> 10) & 31) / 31;
		}

		nitroRender._instructions[0x21] = function (view: DataView, off: number) { //normal
			var dat = view.getUint32(off, true);
			nitroRender._norm[0] = nitroRender._tenBitSign(dat);
			nitroRender._norm[1] = nitroRender._tenBitSign(dat >> 10);
			nitroRender._norm[2] = nitroRender._tenBitSign(dat >> 20);
		}

		nitroRender._instructions[0x22] = function (view: DataView, off: number) { //texcoord
			nitroRender._texCoord[0] = (view.getInt16(off, true) / 16) / nitroRender._texWidth;
			nitroRender._texCoord[1] = (view.getInt16(off + 2, true) / 16) / nitroRender._texHeight;
		}

		nitroRender._instructions[0x23] = function (view: DataView, off: number) { //xyz 16 bit
			nitroRender._cVec[0] = view.getInt16(off, true) / 4096;
			nitroRender._cVec[1] = view.getInt16(off + 2, true) / 4096;
			nitroRender._cVec[2] = view.getInt16(off + 4, true) / 4096;
			nitroRender._pushVector();
		}

		nitroRender._instructions[0x24] = function (view: DataView, off: number) { //xyz 10 bit
			var dat = view.getUint32(off, true);
			nitroRender._cVec[0] = nitroRender._tenBitSign(dat);
			nitroRender._cVec[1] = nitroRender._tenBitSign(dat >> 10);
			nitroRender._cVec[2] = nitroRender._tenBitSign(dat >> 20);
			nitroRender._pushVector();
		}

		nitroRender._instructions[0x25] = function (view: DataView, off: number) { //xy 16 bit
			nitroRender._cVec[0] = view.getInt16(off, true) / 4096;
			nitroRender._cVec[1] = view.getInt16(off + 2, true) / 4096;
			nitroRender._pushVector();
		}

		nitroRender._instructions[0x26] = function (view: DataView, off: number) { //xz 16 bit
			nitroRender._cVec[0] = view.getInt16(off, true) / 4096;
			nitroRender._cVec[2] = view.getInt16(off + 2, true) / 4096;
			nitroRender._pushVector();
		}

		nitroRender._instructions[0x27] = function (view: DataView, off: number) { //yz 16 bit
			nitroRender._cVec[1] = view.getInt16(off, true) / 4096;
			nitroRender._cVec[2] = view.getInt16(off + 2, true) / 4096;
			nitroRender._pushVector();
		}

		nitroRender._instructions[0x28] = function (view: DataView, off: number) { //xyz 10 bit relative
			var dat = view.getUint32(off, true);
			nitroRender._cVec[0] += nitroRender._relativeSign(dat);
			nitroRender._cVec[1] += nitroRender._relativeSign(dat >> 10);
			nitroRender._cVec[2] += nitroRender._relativeSign(dat >> 20);
			nitroRender._pushVector();
		}

		nitroRender._instructions[0x40] = function (view: DataView, off: number) { //begin vtx
			var dat = view.getUint32(off, true);
			nitroRender._vecMode = dat;

			if (!nitroRender._optimiseTriangles) {
				nitroRender._vecPos = [];
				nitroRender._vecNorm = [];
				nitroRender._vecTx = [];
				nitroRender._vecCol = [];
				nitroRender._vecMat = [];
			}
			nitroRender._vecNum = 0;
			nitroRender._stripAlt = 0;
		}

		nitroRender._instructions[0x41] = function (view: DataView, off: number) { //end vtx
			if (!nitroRender._optimiseTriangles) nitroRender._pushStrip();
		}
	}

	static prepareShader() {
		//prepares the shader so no redundant calls have to be made. Should be called upon every program change.
		nitroRender._gl.enable(nitroRender._gl.BLEND);
		nitroRender._gl.blendFunc(nitroRender._gl.ONE, nitroRender._gl.ONE_MINUS_SRC_ALPHA); //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		nitroRender.last = {};
		nitroRender._gl.activeTexture(nitroRender._gl.TEXTURE0);
		nitroRender._gl.uniform1i(nitroRender.nitroShader.uniforms.samplerUniform, 0);
	}

	static setShadowMode(sTex: CustomWebGLTexture, fsTex: CustomWebGLTexture, sMat: Float32List, fsMat: Float32List, dir: vec3) {
		nitroRender.nitroShader = nitroRender._shadowShader;
		var shader = nitroRender._shadowShader;
		nitroRender._gl.useProgram(shader.program);

		vec3.normalize(dir, dir);
		nitroRender._gl.uniform3fv(shader.uniforms.lightDirUniform, dir);
		nitroRender._gl.uniformMatrix4fv(shader.uniforms.shadowMatUniform, false, sMat);
		nitroRender._gl.uniformMatrix4fv(shader.uniforms.farShadowMatUniform, false, fsMat);
		nitroRender._gl.uniform1f(shader.uniforms.lightIntensityUniform, 0.3);

		nitroRender.resetShadOff();
		nitroRender.setNormalFlip(1);
		nitroRender._gl.activeTexture(nitroRender._gl.TEXTURE1);
		nitroRender._gl.bindTexture(nitroRender._gl.TEXTURE_2D, sTex);
		nitroRender._gl.uniform1i(shader.uniforms.lightSamplerUniform, 1);

		nitroRender._gl.activeTexture(nitroRender._gl.TEXTURE2);
		nitroRender._gl.bindTexture(nitroRender._gl.TEXTURE_2D, fsTex);
		nitroRender._gl.uniform1i(shader.uniforms.farLightSamplerUniform, 2);

		nitroRender.setColMult([1, 1, 1, 1]);
		nitroRender.prepareShader();
	}

	static setLightIntensities(intensity: number, shadIntensity: number) {
		var shader = <nitroShaders_shadowShader>nitroRender.nitroShader;
		nitroRender._gl.useProgram(nitroRender.nitroShader.program);
		nitroRender._gl.uniform1f(shader.uniforms.lightIntensityUniform, intensity);
		nitroRender._gl.uniform1f(shader.uniforms.shadLightenUniform, 1 - shadIntensity);
	}

	static setShadBias(bias: number) {
		var shader = <nitroShaders_shadowShader>nitroRender.nitroShader;
		nitroRender._gl.useProgram(nitroRender.nitroShader.program);
		nitroRender._gl.uniform1f(shader.uniforms.shadOffUniform, bias);
		nitroRender._gl.uniform1f(shader.uniforms.farShadOffUniform, bias);
	}

	static setNormalFlip(flip: number) {
		var shader = <nitroShaders_shadowShader>nitroRender.nitroShader;
		nitroRender._gl.useProgram(nitroRender.nitroShader.program);
		nitroRender._gl.uniform1f(shader.uniforms.normalFlipUniform, flip);
	}

	static resetShadOff() {
		var shader = <nitroShaders_shadowShader>nitroRender.nitroShader;
		nitroRender._gl.useProgram(nitroRender.nitroShader.program);
		nitroRender._gl.uniform1f(shader.uniforms.shadOffUniform, 0.0005);
		nitroRender._gl.uniform1f(shader.uniforms.farShadOffUniform, 0.0020);
	}

	static unsetShadowMode() {
		nitroRender.nitroShader = nitroRender._defaultShader;
		nitroRender._gl.useProgram(nitroRender.nitroShader.program);

		nitroRender.setColMult([1, 1, 1, 1]);
		nitroRender.prepareShader();
	}

	static pauseShadowMode() {
		nitroRender.nitroShader = nitroRender._defaultShader;
		if (nitroRender.nitroShader == nitroRender._shadowShader) {
			nitroRender._paused = true;
		}
		nitroRender._gl.useProgram(nitroRender.nitroShader.program);

		nitroRender.setColMult([1, 1, 1, 1]);
		nitroRender.prepareShader();
	}

	static unpauseShadowMode() {
		if (!nitroRender._paused) return;
		nitroRender.nitroShader = nitroRender._shadowShader;
		nitroRender._gl.useProgram(nitroRender.nitroShader.program);

		nitroRender.setColMult([1, 1, 1, 1]);
		nitroRender.prepareShader();
	}

	static setColMult(color: number[]) {
		nitroRender._gl.useProgram(nitroRender.nitroShader.program);
		nitroRender._gl.uniform4fv(nitroRender.nitroShader.uniforms.colMultUniform, color);
	}

	static updateBillboards(view: mat4) {
		nitroRender.billboardID = (nitroRender.billboardID + 1) % 0xFFFFFF;

		var nv = mat4.clone(view);
		nv[12] = 0;
		nv[13] = 0;
		nv[14] = 0; //nullify translation
		var nv2 = mat4.clone(nv);
		nitroRender.billboardMat = mat4.invert(nv, nv);
		nv2[4] = 0;
		nv2[5] = 1; //do not invert y axis view
		nv2[6] = 0;
		nitroRender.yBillboardMat = mat4.invert(nv2, nv2);
	}

	static renderDispList(disp: MKJSDataInput, tex: { width: number; height: number; }, startStack: number) { //renders the display list to a form of vertex buffer. The idea is that NSBTA and NSBCA can still be applied to the buffer at little performance cost. (rather than recompiling the model)
		nitroRender._modelBuffer = {
			strips: []
			/* strip entry format:
				vPos: glBuffer,
				vTx: glBuffer,
				vCol: glBuffer,
				verts: int count of vertices,
				mode: (eg. gl.TRIANGLES, gl.TRIANGLESTRIP)
				mat: transformation matrix to apply. unused atm as matrix functions are unimplemented
			*/
		} //the nitroModel will store this and use it for rendering instead of the display list in future.

		nitroRender._curMat = startStack; //start on root bone
		var off = 0;
		var view = new DataView(disp);

		nitroRender._texWidth = tex.width;
		nitroRender._texHeight = tex.height;

		nitroRender._cVec = [];
		nitroRender._norm = [0, 1, 0];
		nitroRender._texCoord = [0, 0];
		nitroRender._color = [1, 1, 1, nitroRender._alphaMul]; //todo: polygon attributes

		nitroRender._vecMode = 0;
		nitroRender._vecNum = 0;
		nitroRender._stripAlt = 0;
		nitroRender._vecPos = [];
		nitroRender._vecNorm = [];
		nitroRender._vecTx = [];
		nitroRender._vecCol = [];
		nitroRender._vecMat = [];

		while (off < disp.byteLength) {
			var ioff = off;
			off += 4;
			for (var i = 0; i < 4; i++) {
				var inst = view.getUint8(ioff++);
				if (nitroRender._instructions[inst] != null) {
					nitroRender._instructions[inst](view, off);
				} else {
					if (inst != 0) alert("invalid instruction 0x" + (inst.toString(16)));
				}
				var temp = nitroRender._parameters[inst];
				off += (temp == null) ? 0 : temp * 4;
			}
		}

		if (nitroRender._optimiseTriangles) nitroRender._pushStrip();

		return nitroRender._modelBuffer;
	}

	static setAlpha(alpha: number) { //for fading specific things out or whatever
		nitroRender._alphaMul = alpha;
	}

	static getViewWidth() {
		return nitroRender._gl.viewportWidth;
	}

	static getViewHeight() {
		return nitroRender._gl.viewportHeight;
	}


	static _pushStrip() { //push the last group of triangles to the buffer. Should do this on matrix change... details fourthcoming
		var modes = (nitroRender._optimiseTriangles) ? [
			nitroRender._gl.TRIANGLES,
			nitroRender._gl.TRIANGLES,
			nitroRender._gl.TRIANGLES,
			nitroRender._gl.TRIANGLES
		] : [
			nitroRender._gl.TRIANGLES,
			nitroRender._gl.TRIANGLES,
			nitroRender._gl.TRIANGLE_STRIP,
			nitroRender._gl.TRIANGLE_STRIP
		];
		var pos = nitroRender._gl.createBuffer();
		var col = nitroRender._gl.createBuffer();
		var tx = nitroRender._gl.createBuffer();
		var mat = nitroRender._gl.createBuffer();
		var norm = nitroRender._gl.createBuffer();

		var posArray = new Float32Array(nitroRender._vecPos);
		if (nitroRender.forceFlatNormals && modes[nitroRender._vecMode] == nitroRender._gl.TRIANGLES) {
			//calculate new flat normals for each triangle
			for (var i = 0; i < nitroRender._vecPos.length; i += 9) {
				var v1: vec3 = [nitroRender._vecPos[i], nitroRender._vecPos[i + 1], nitroRender._vecPos[i + 2]];
				var v2: vec3 = [nitroRender._vecPos[i + 3], nitroRender._vecPos[i + 4], nitroRender._vecPos[i + 5]];
				var v3: vec3 = [nitroRender._vecPos[i + 6], nitroRender._vecPos[i + 7], nitroRender._vecPos[i + 8]];

				vec3.sub(v2, v2, v1);
				vec3.sub(v3, v3, v1);
				var newNorm = vec3.cross([0, 0, 0], v2, v3);
				vec3.normalize(newNorm, newNorm);
				for (var j = 0; j < 3; j++) {
					for (var k = 0; k < 3; k++) {
						nitroRender._vecNorm[i + (j * 3) + k] = newNorm[k];
					}
				}
			}
		}

		nitroRender._gl.bindBuffer(nitroRender._gl.ARRAY_BUFFER, pos);
		nitroRender._gl.bufferData(nitroRender._gl.ARRAY_BUFFER, posArray, nitroRender._gl.STATIC_DRAW);

		nitroRender._gl.bindBuffer(nitroRender._gl.ARRAY_BUFFER, tx);
		nitroRender._gl.bufferData(nitroRender._gl.ARRAY_BUFFER, new Float32Array(nitroRender._vecTx), nitroRender._gl.STATIC_DRAW);

		nitroRender._gl.bindBuffer(nitroRender._gl.ARRAY_BUFFER, col);
		nitroRender._gl.bufferData(nitroRender._gl.ARRAY_BUFFER, new Float32Array(nitroRender._vecCol), nitroRender._gl.STATIC_DRAW);

		nitroRender._gl.bindBuffer(nitroRender._gl.ARRAY_BUFFER, mat);
		nitroRender._gl.bufferData(nitroRender._gl.ARRAY_BUFFER, new Float32Array(nitroRender._vecMat), nitroRender._gl.STATIC_DRAW);

		nitroRender._gl.bindBuffer(nitroRender._gl.ARRAY_BUFFER, norm);
		nitroRender._gl.bufferData(nitroRender._gl.ARRAY_BUFFER, new Float32Array(nitroRender._vecNorm), nitroRender._gl.STATIC_DRAW);

		// global.d.ts modelBuffer
		nitroRender._modelBuffer.strips.push({
			posArray: posArray,
			vPos: pos,
			vTx: tx,
			vCol: col,
			vMat: mat,
			vNorm: norm,
			verts: nitroRender._vecPos.length / 3,
			mode: modes[nitroRender._vecMode]
		})
	}

	static _pushVector() {
		if (nitroRender._vecMode == 1 && nitroRender._vecNum % 4 == 3) { //quads - special case
			nitroRender._vecPos = nitroRender._vecPos.concat(nitroRender._vecPos.slice(nitroRender._vecPos.length - 9, nitroRender._vecPos.length - 6)).concat(nitroRender._vecPos.slice(nitroRender._vecPos.length - 3));
			nitroRender._vecNorm = nitroRender._vecNorm.concat(nitroRender._vecNorm.slice(nitroRender._vecNorm.length - 9, nitroRender._vecNorm.length - 6)).concat(nitroRender._vecNorm.slice(nitroRender._vecNorm.length - 3));
			nitroRender._vecTx = nitroRender._vecTx.concat(nitroRender._vecTx.slice(nitroRender._vecTx.length - 6, nitroRender._vecTx.length - 4)).concat(nitroRender._vecTx.slice(nitroRender._vecTx.length - 2));
			nitroRender._vecCol = nitroRender._vecCol.concat(nitroRender._vecCol.slice(nitroRender._vecCol.length - 12, nitroRender._vecCol.length - 8)).concat(nitroRender._vecCol.slice(nitroRender._vecCol.length - 4));
			nitroRender._vecMat = nitroRender._vecMat.concat(nitroRender._vecMat.slice(nitroRender._vecMat.length - 3, nitroRender._vecMat.length - 2)).concat(nitroRender._vecMat.slice(nitroRender._vecMat.length - 1));
		}

		if (nitroRender._optimiseTriangles && (nitroRender._vecMode > 1) && (nitroRender._vecNum > 2)) { //convert tri strips to individual triangles so we get one buffer per polygon
			var b = nitroRender._vecMat.length - (((nitroRender._stripAlt % 2) == 0) ? 1 : 3);
			var s2 = nitroRender._vecMat.length - (((nitroRender._stripAlt % 2) == 0) ? 2 : 1);
			nitroRender._vecPos = nitroRender._vecPos.concat(nitroRender._vecPos.slice(b * 3, b * 3 + 3)).concat(nitroRender._vecPos.slice(s2 * 3, s2 * 3 + 3));
			nitroRender._vecNorm = nitroRender._vecNorm.concat(nitroRender._vecNorm.slice(b * 3, b * 3 + 3)).concat(nitroRender._vecNorm.slice(s2 * 3, s2 * 3 + 3));
			nitroRender._vecTx = nitroRender._vecTx.concat(nitroRender._vecTx.slice(b * 2, b * 2 + 2)).concat(nitroRender._vecTx.slice(s2 * 2, s2 * 2 + 2));
			nitroRender._vecCol = nitroRender._vecCol.concat(nitroRender._vecCol.slice(b * 4, b * 4 + 4)).concat(nitroRender._vecCol.slice(s2 * 4, s2 * 4 + 4));
			nitroRender._vecMat = nitroRender._vecMat.concat(nitroRender._vecMat.slice(b, b + 1)).concat(nitroRender._vecMat.slice(s2, s2 + 1));
			nitroRender._stripAlt++;
		}

		nitroRender._vecNum++;

		nitroRender._vecPos = nitroRender._vecPos.concat(nitroRender._cVec);
		nitroRender._vecTx = nitroRender._vecTx.concat(nitroRender._texCoord);
		nitroRender._vecCol = nitroRender._vecCol.concat(nitroRender._color);
		nitroRender._vecNorm = nitroRender._vecNorm.concat(nitroRender._norm);
		nitroRender._vecMat.push(nitroRender._curMat);
	}

	static _tenBitSign(val: number) {
		val &= 1023;
		if (val & 512) return (val - 1024) / 64;
		else return val / 64;
	}

	static _relativeSign(val: number) {
		val &= 1023;
		if (val & 512) return (val - 1024) / 4096;
		else return val / 4096;
	}
};


