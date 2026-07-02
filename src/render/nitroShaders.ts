//
// nitroShaders._js
//--------------------
// Dynamically compiles all shader modes of the nitro renderer.
// by RHY3756547
//
interface compiled_shader<T extends shader_config> {
	program: WebGLProgram;
	attributes: {
		[a in keyof T["attributes"]]: number;
	};
	uniforms: {
		[u in keyof T["uniforms"]]: WebGLUniformLocation;
	};
}

type shader_config = {
	frag: string;
	vert: string;
	attributes: {
		[x: string]: string;
	};
	uniforms: {
		[x: string]: string;
	};
};

export type nitroShaders_defaultShader = {
	program: WebGLProgram;
	attributes: {
		vertexPositionAttribute: number;
		textureCoordAttribute: number;
		colorAttribute: number;
		matAttribute: number;
		normAttribute: number;
	};
	uniforms: {
		pMatrixUniform: WebGLUniformLocation;
		matStackUniform: WebGLUniformLocation;
		mvMatrixUniform: WebGLUniformLocation;
		texMatrixUniform: WebGLUniformLocation;
		samplerUniform: WebGLUniformLocation;
		colMultUniform: WebGLUniformLocation;
	};
};

export type nitroShaders_shadowShader = {
	program: WebGLProgram;
	attributes: {
		vertexPositionAttribute: number;
		textureCoordAttribute: number;
		colorAttribute: number;
		matAttribute: number;
		normAttribute: number;
	};
	uniforms: {
		pMatrixUniform: WebGLUniformLocation;
		matStackUniform: WebGLUniformLocation;
		mvMatrixUniform: WebGLUniformLocation;
		texMatrixUniform: WebGLUniformLocation;
		samplerUniform: WebGLUniformLocation;
		colMultUniform: WebGLUniformLocation;
		shadowMatUniform: WebGLUniformLocation;
		farShadowMatUniform: WebGLUniformLocation;
		lightIntensityUniform: WebGLUniformLocation;
		shadLightenUniform: WebGLUniformLocation;
		lightDirUniform: WebGLUniformLocation;
		normalFlipUniform: WebGLUniformLocation;
		shadOffUniform: WebGLUniformLocation;
		farShadOffUniform: WebGLUniformLocation;
		lightSamplerUniform: WebGLUniformLocation;
		farLightSamplerUniform: WebGLUniformLocation;
	};
};

export class nitroShaders {
	private static _defaultFrag = `
	precision highp float;
	
	varying vec2 vTextureCoord;
	varying vec4 color;
	
	uniform sampler2D uSampler;
	
	void main(void) {
		gl_FragColor = texture2D(uSampler, vTextureCoord)*color;
		if (gl_FragColor.a < 0.003) discard;
	}
	`;

	private static _defaultVert = `
	attribute vec3 aVertexPosition;
	attribute vec2 aTextureCoord;
	attribute vec4 aColor;
	attribute float matrixID;
	attribute vec3 aNormal;
	
	uniform mat4 uMVMatrix;
	uniform mat4 uPMatrix;
	uniform mat3 texMatrix;
	uniform mat4 matStack[16];
	
	uniform vec4 colMult;
	
	varying vec2 vTextureCoord;
	varying vec4 color;
	
	
	void main(void) {
		gl_Position = uPMatrix * uMVMatrix * matStack[int(matrixID)] * vec4(aVertexPosition, 1.0);
		vTextureCoord = (texMatrix * vec3(aTextureCoord, 1.0)).xy;
		vec3 adjNorm = normalize(vec3(uMVMatrix * matStack[int(matrixID)] * vec4(aNormal, 0.0)));
		float diffuse = 0.7-dot(adjNorm, vec3(0.0, -1.0, 0.0))*0.3;
		
		color = aColor*colMult;
		color = vec4(color.x*diffuse, color.y*diffuse, color.z*diffuse, color.w);
	}
	`;

	private static _shadFrag = `
	precision highp float;
	
	varying vec2 vTextureCoord;
	varying vec4 color;
	varying vec4 lightDist;
	varying vec4 fLightDist;
	varying vec3 normal;
	
	uniform float shadOff; 
	uniform float farShadOff; 
	uniform sampler2D lightDSampler;
	uniform sampler2D farLightDSampler;
	uniform float shadLighten; 
	
	uniform sampler2D uSampler;
	uniform vec3 lightDir;
	
	float shadowCompare(sampler2D map, vec2 pos, float compare, float so) {
		float depth = texture2D(map, pos).r;
		return smoothstep(compare-so, compare, depth);
	}
	
	float shadowLerp(sampler2D depths, vec2 size, vec2 uv, float compare, float so){
		vec2 texelSize = vec2(1.0)/size;
		vec2 f = fract(uv*size+0.5);
		vec2 centroidUV = floor(uv*size+0.5)/size;
		
		float lb = shadowCompare(depths, centroidUV+texelSize*vec2(0.0, 0.0), compare, so);
		float lt = shadowCompare(depths, centroidUV+texelSize*vec2(0.0, 1.0), compare, so);
		float rb = shadowCompare(depths, centroidUV+texelSize*vec2(1.0, 0.0), compare, so);
		float rt = shadowCompare(depths, centroidUV+texelSize*vec2(1.0, 1.0), compare, so);
		float a = mix(lb, lt, f.y);
		float b = mix(rb, rt, f.y);
		float c = mix(a, b, f.x);
		return c;
	}
	
	void main(void) {
		vec4 colorPM = vec4(color.rgb * color.a, color.a);
		vec4 col = texture2D(uSampler, vTextureCoord)*colorPM;
		
		vec2 ldNorm = abs((lightDist.xy)-vec2(0.5, 0.5));
		float dist = max(ldNorm.x, ldNorm.y);
		float shadIntensity;
		
		if (dist > 0.5) {
			shadIntensity = shadowLerp(farLightDSampler, vec2(4096.0, 4096.0), fLightDist.xy, fLightDist.z-farShadOff, farShadOff*0.5);
		} else if (dist > 0.4) {
			float lerp1 = shadowLerp(farLightDSampler, vec2(4096.0, 4096.0), fLightDist.xy, fLightDist.z-farShadOff, farShadOff*0.5);
			float lerp2 = shadowLerp(lightDSampler, vec2(2048.0, 2048.0), lightDist.xy, lightDist.z-shadOff, shadOff*0.5);
			
			shadIntensity = mix(lerp2, lerp1, (dist-0.4)*10.0);
		} else {
			shadIntensity = shadowLerp(lightDSampler, vec2(2048.0, 2048.0), lightDist.xy, lightDist.z-shadOff, shadOff*0.5);
		}
		shadIntensity = min(shadIntensity, max(0.0, dot(normalize(normal), lightDir) * 5.0));
		gl_FragColor = col*mix(vec4(0.5, 0.5, 0.7, 1.0), vec4(1.0, 1.0, 1.0, 1.0), min(1.0, shadIntensity + shadLighten));
		
		if (gl_FragColor.a == 0.0) discard;
	}
	`;

	private static _shadVert = `
	attribute vec3 aVertexPosition;
	attribute vec2 aTextureCoord;
	attribute vec4 aColor;
	attribute float matrixID;
	attribute vec3 aNormal;
	
	uniform mat4 uMVMatrix;
	uniform mat4 uPMatrix;
	uniform mat3 texMatrix;
	uniform mat4 matStack[16];
	uniform float normalFlip;
	
	uniform vec4 colMult;
	
	uniform mat4 shadowMat;
	uniform mat4 farShadowMat;
	uniform float lightIntensity; 
	
	varying vec2 vTextureCoord;
	varying vec4 color;
	varying vec4 lightDist;
	varying vec4 fLightDist;
	varying vec3 normal;
	
	
	void main(void) {
		vec4 pos = uMVMatrix * matStack[int(matrixID)] * vec4(aVertexPosition, 1.0);
		gl_Position = uPMatrix * pos;
		vTextureCoord = (texMatrix * vec3(aTextureCoord, 1.0)).xy;
		
		lightDist = (shadowMat*pos + vec4(1, 1, 1, 0)) / 2.0;
		fLightDist = (farShadowMat*pos + vec4(1, 1, 1, 0)) / 2.0;
		vec3 adjNorm = normalize(vec3(uMVMatrix * matStack[int(matrixID)] * vec4(aNormal, 0.0))) * normalFlip;
		normal = adjNorm; 
		float diffuse = (1.0-lightIntensity)-dot(adjNorm, vec3(0.0, -1.0, 0.0))*lightIntensity;
		
		color = aColor*colMult;
		color = vec4(color.x*diffuse, color.y*diffuse, color.z*diffuse, color.w);
	}
	`;

	static compileDefaultShader(): nitroShaders_defaultShader {
		const conf = {
			frag: nitroShaders._defaultFrag,
			vert: nitroShaders._defaultVert,
			attributes: {
				vertexPositionAttribute: "aVertexPosition",
				textureCoordAttribute: "aTextureCoord",
				colorAttribute: "aColor",
				matAttribute: "matrixID",
				normAttribute: "aNormal",
			},
			uniforms: {
				pMatrixUniform: "uPMatrix",
				matStackUniform: "matStack",
				mvMatrixUniform: "uMVMatrix",
				texMatrixUniform: "texMatrix",
				samplerUniform: "uSampler",
				colMultUniform: "colMult",
			},
		};

		const shader: compiled_shader<typeof conf> = nitroShaders._compileShader(conf);
		return shader;
	}

	static compileShadowShader(): nitroShaders_shadowShader {
		const conf = {
			frag: nitroShaders._shadFrag,
			vert: nitroShaders._shadVert,
			attributes: {
				vertexPositionAttribute: "aVertexPosition",
				textureCoordAttribute: "aTextureCoord",
				colorAttribute: "aColor",
				matAttribute: "matrixID",
				normAttribute: "aNormal",
			},
			uniforms: {
				pMatrixUniform: "uPMatrix",
				matStackUniform: "matStack",
				mvMatrixUniform: "uMVMatrix",
				texMatrixUniform: "texMatrix",
				samplerUniform: "uSampler",
				colMultUniform: "colMult",
				shadowMatUniform: "shadowMat",
				farShadowMatUniform: "farShadowMat",
				lightIntensityUniform: "lightIntensity",
				shadLightenUniform: "shadLighten",
				lightDirUniform: "lightDir",
				normalFlipUniform: "normalFlip",
				shadOffUniform: "shadOff",
				farShadOffUniform: "farShadOff",
				lightSamplerUniform: "lightDSampler",
				farLightSamplerUniform: "farLightDSampler",
			},
		};

		const shader: compiled_shader<typeof conf> = nitroShaders._compileShader(conf);
		return shader;
	}

	private static _compileShader<Type extends shader_config>(conf: Type): compiled_shader<Type> {
		const frag = nitroShaders._getShader(gl, conf.frag, gl.FRAGMENT_SHADER)!;
		const vert = nitroShaders._getShader(gl, conf.vert, gl.VERTEX_SHADER)!;

		const program = gl.createProgram()!;
		gl.attachShader(program, vert);
		gl.attachShader(program, frag);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			alert("Could not initialise shaders");
		}

		const ret: compiled_shader<Type> = {
			program,
			attributes: {} as compiled_shader<Type>["attributes"],
			uniforms: {} as compiled_shader<Type>["uniforms"],
		};

		for (const attrName in conf.attributes) {
			if (Object.hasOwnProperty.call(conf.attributes, attrName)) {
				const attr = attrName as keyof Type["attributes"];
				const value = conf.attributes[attrName];
				const attributeLocation = gl.getAttribLocation(program, value);
				ret.attributes[attr] = attributeLocation;
				gl.enableVertexAttribArray(attributeLocation);
			}
		}

		for (const uniformName in conf.uniforms) {
			if (Object.hasOwnProperty.call(conf.uniforms, uniformName)) {
				const uniform = uniformName as keyof Type["uniforms"];
				const name = conf.uniforms[uniformName];
				const uniformLocation = gl.getUniformLocation(program, name)!;
				ret.uniforms[uniform] = uniformLocation;
			}
		}

		return ret;
	}

	private static _getShader(gl: CustomWebGLRenderingContext, str: string, type: GLint) {
		const shader = gl.createShader(type)!;

		gl.shaderSource(shader, str);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(shader));
			return null;
		}

		return shader;
	}
}
