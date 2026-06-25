function createMockCanvas(): HTMLCanvasElement {
	let width = 0;
	let height = 0;

	return {
		get width() {
			return width;
		},
		set width(w: number) {
			width = w;
		},
		get height() {
			return height;
		},
		set height(h: number) {
			height = h;
		},
		getContext(type: string) {
			if (type !== "2d") return null;
			return {
				fillStyle: "",
				globalAlpha: 1,
				getImageData(_x: number, _y: number, w: number, h: number) {
					return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
				},
				putImageData() {},
				drawImage() {},
				save() {},
				restore() {},
				translate() {},
				scale() {},
				fillRect() {},
			};
		},
	} as unknown as HTMLCanvasElement;
}

export function installDomMocks() {
	if (typeof globalThis.document === "undefined") {
		Object.assign(globalThis, {
			document: {
				createElement(tag: string) {
					if (tag === "canvas") return createMockCanvas();
					throw new Error(`document.createElement(${tag}) is not mocked in tests`);
				},
			},
		});
	}

	if (typeof globalThis.gl === "undefined") {
		Object.assign(globalThis, {
			gl: {
				TEXTURE_2D: 0x0de1,
				RGBA: 0x1908,
				UNSIGNED_BYTE: 0x1401,
				TEXTURE_MIN_FILTER: 0x2801,
				LINEAR: 0x2601,
				TEXTURE_MAG_FILTER: 0x2800,
				NEAREST: 0x2600,
				TEXTURE_WRAP_S: 0x2802,
				TEXTURE_WRAP_T: 0x2803,
				CLAMP_TO_EDGE: 0x812f,
				createTexture: () => ({}),
				bindTexture: () => {},
				texImage2D: () => {},
				texParameteri: () => {},
				generateMipmap: () => {},
			},
		});
	}
}
