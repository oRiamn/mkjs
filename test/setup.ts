import { mat2, mat3, mat4, vec2, vec3, vec4 } from "gl-matrix";
import { installDomMocks } from "./helpers/dom";

Object.assign(globalThis, { mat2, mat3, mat4, vec2, vec3, vec4 });
installDomMocks();

Object.assign(globalThis, {
	localStorage: {
		getItem: () => null,
		setItem: () => {},
		removeItem: () => {},
	},
});

if (typeof globalThis.window === "undefined") {
	Object.assign(globalThis, { window: { debugParticle: false } });
}
