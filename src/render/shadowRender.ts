//
// shadowRender.js
//--------------------
// Provides a shader to draw a shadowed scene using a depth and color texture. (plus depth texture for light source)
// by RHY3756547
//

export class shadowRender {
	static _shadFrag = `
	precision highp float;
	
	varying vec2 vTextureCoord;
	varying vec4 color;
	
	uniform sampler2D cSampler;
	uniform sampler2D depSampler;
	uniform sampler2D lightDSampler;
	uniform sampler2D farLightDSampler;
	
	uniform mat4 shadowMat;
	uniform mat4 farShadowMat;
	uniform mat4 invViewProj;
	
	
	vec3 positionFromDepth(vec2 vTex)
	{
        float z = texture2D(depSampler, vTex).r * 2.0 - 1.0;
        float x = vTex.x * 2.0 - 1.0;
        float y = vTex.y * 2.0 - 1.0;
        vec4 vProjectedPos = vec4(x, y, z, 1.0);
		
        // Transform by the inverse projection matrix
        vec4 vPositionVS = invViewProj*vProjectedPos;
		
        // Divide by w to get the view-space position
        return vPositionVS.xyz/vPositionVS.w;
	}
	
	void main(void) {
		vec3 pos = positionFromDepth(vTextureCoord);
		vec4 col = texture2D(cSampler, vTextureCoord);
		
		vec4 lightDist = (shadowMat*vec4(pos, 1.0) + vec4(1, 1, 1, 0)) / 2.0;
		if (lightDist.x<0.0 || lightDist.y<0.0 || lightDist.x>1.0 || lightDist.y>1.0) {
			vec4 flightDist = (farShadowMat*vec4(pos, 1.0) + vec4(1, 1, 1, 0)) / 2.0;
			if (texture2D(farLightDSampler, flightDist.xy).r+0.0005 < flightDist.z) {
				gl_FragColor = col*vec4(0.5, 0.5, 0.7, 1);
			} else {
				gl_FragColor = col;
			}
		} else {
			
			if (texture2D(lightDSampler, lightDist.xy).r+0.00005 < lightDist.z) {
				gl_FragColor = col*vec4(0.5, 0.5, 0.7, 1);
			} else {
				gl_FragColor = col;
			}
		}
		
		if (gl_FragColor.a == 0.0) discard;
	}
	`;

	static _shadVert = `
	attribute vec3 aVertexPosition;
	attribute vec2 aTextureCoord;
	
	varying vec2 vTextureCoord;
	
	void main(void) {
		gl_Position = vec4(aVertexPosition, 1.0);
		vTextureCoord = vec3(aTextureCoord, 1.0).xy;
	}
	`

	static _shadowShader: WebGLProgram = null;
	static _vecPosBuffer: WebGLBuffer = null;
	static _vecTxBuffer: WebGLBuffer = null;
	static _vertexPositionAttribute: number = null;
	static textureCoordAttribute: number = null;
	static colTexUniform: WebGLUniformLocation;
	static depTexUniform: WebGLUniformLocation;
	static lightTexUniform: WebGLUniformLocation;
	static lightFarTexUniform: WebGLUniformLocation;
	static lightViewUniform: WebGLUniformLocation;
	static lightFarViewUniform: WebGLUniformLocation;
	static camViewUniform: WebGLUniformLocation;

	static init(ctx: CustomWebGLRenderingContext) {
		const frag = shadowRender._getShader(shadowRender._shadFrag, "frag");
		const vert = shadowRender._getShader(shadowRender._shadVert, "vert");

		shadowRender._shadowShader = ctx.createProgram();
		ctx.attachShader(shadowRender._shadowShader, vert);
		ctx.attachShader(shadowRender._shadowShader, frag);
		ctx.linkProgram(shadowRender._shadowShader);

		if (!ctx.getProgramParameter(shadowRender._shadowShader, ctx.LINK_STATUS)) {
			alert("Could not initialise shaders");
		}

		shadowRender._vertexPositionAttribute = ctx.getAttribLocation(shadowRender._shadowShader, "aVertexPosition");
		ctx.enableVertexAttribArray(shadowRender._vertexPositionAttribute);

		shadowRender.textureCoordAttribute = ctx.getAttribLocation(shadowRender._shadowShader, "aTextureCoord");
		ctx.enableVertexAttribArray(shadowRender.textureCoordAttribute);

		shadowRender.colTexUniform = ctx.getUniformLocation(shadowRender._shadowShader, "cSampler");
		shadowRender.depTexUniform = ctx.getUniformLocation(shadowRender._shadowShader, "depSampler");
		shadowRender.lightTexUniform = ctx.getUniformLocation(shadowRender._shadowShader, "lightDSampler");
		shadowRender.lightFarTexUniform = ctx.getUniformLocation(shadowRender._shadowShader, "farLightDSampler");
		shadowRender.lightViewUniform = ctx.getUniformLocation(shadowRender._shadowShader, "shadowMat");
		shadowRender.lightFarViewUniform = ctx.getUniformLocation(shadowRender._shadowShader, "farShadowMat");
		shadowRender.camViewUniform = ctx.getUniformLocation(shadowRender._shadowShader, "invViewProj");

		this._shadowShader = shadowRender._shadowShader;

		shadowRender._vecPosBuffer = ctx.createBuffer();
		shadowRender._vecTxBuffer = ctx.createBuffer();

		ctx.bindBuffer(ctx.ARRAY_BUFFER, shadowRender._vecPosBuffer);
		ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(
			[-1, -1, 0,
				1, -1, 0,
				1, 1, 0,

				1, 1, 0,
			-1, 1, 0,
			-1, -1, 0,
			]
		), ctx.STATIC_DRAW);

		ctx.bindBuffer(ctx.ARRAY_BUFFER, shadowRender._vecTxBuffer);
		ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(
			[
				0, 0,
				1, 0,
				1, 1,

				1, 1,
				0, 1,
				0, 0,
			]
		), ctx.STATIC_DRAW);

	}

	static _getShader(str: string, type: string) {
		var shader;
		if (type == "frag") {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		} else if (type == "vert") {
			shader = gl.createShader(gl.VERTEX_SHADER);
		} else {
			return null;
		}

		gl.shaderSource(shader, str);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(shader));
			return null;
		}

		return shader;
	}

	static drawShadowed(colTex: WebGLTexture, depTex: WebGLTexture, lightTex: WebGLTexture, lightFarTex: WebGLTexture, camView: mat4, lightView: Float32List, lightFarView: Float32List) {
		gl.useProgram(shadowRender._shadowShader);

		gl.uniformMatrix4fv(shadowRender.lightViewUniform, false, lightView);
		gl.uniformMatrix4fv(shadowRender.lightFarViewUniform, false, lightFarView);
		gl.uniformMatrix4fv(shadowRender.camViewUniform, false, mat4.invert(mat4.create(), camView));

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, lightTex); //load up material texture
		gl.uniform1i(shadowRender.lightTexUniform, 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, colTex); //load up material texture
		gl.uniform1i(shadowRender.colTexUniform, 1);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, depTex); //load up material texture
		gl.uniform1i(shadowRender.depTexUniform, 2);

		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, lightFarTex); //load up material texture
		gl.uniform1i(shadowRender.lightFarTexUniform, 3);


		gl.bindBuffer(gl.ARRAY_BUFFER, shadowRender._vecPosBuffer);
		gl.vertexAttribPointer(shadowRender._vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, shadowRender._vecTxBuffer);
		gl.vertexAttribPointer(shadowRender.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
}
