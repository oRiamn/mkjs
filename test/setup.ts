import { mat2, mat3, mat4, vec2, vec3, vec4 } from "gl-matrix";

Object.assign(globalThis, { mat2, mat3, mat4, vec2, vec3, vec4 });

if (typeof globalThis.window === "undefined") {
	Object.assign(globalThis, { window: { debugParticle: false } });
}
