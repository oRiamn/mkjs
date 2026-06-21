/** DS bottom-screen reference resolution (race HUD). */
export const UI_REF_WIDTH = 256;
export const UI_REF_HEIGHT = 192;
export const GAME_ASPECT_RATIO = UI_REF_WIDTH / UI_REF_HEIGHT;

export function getUiScale(width: number, height: number): number {
	return Math.max(1, Math.floor(Math.min(width / UI_REF_WIDTH, height / UI_REF_HEIGHT)));
}

export function uiPx(value: number, scale: number): number {
	return Math.round(value * scale);
}

export function fitCanvasToWindow(windowWidth: number, windowHeight: number) {
	let width: number;
	let height: number;

	if (windowWidth / windowHeight > GAME_ASPECT_RATIO) {
		height = windowHeight;
		width = Math.floor(height * GAME_ASPECT_RATIO);
	} else {
		width = windowWidth;
		height = Math.floor(width / GAME_ASPECT_RATIO);
	}

	return {
		width,
		height,
		offsetX: Math.floor((windowWidth - width) / 2),
		offsetY: Math.floor((windowHeight - height) / 2),
	};
}
