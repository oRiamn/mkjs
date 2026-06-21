import { getMobileControlVisualState, MOBILE_CONTROL_ZONES, type MobileControlId } from "./mobileControlLayout";

let overlayEl: HTMLElement | null = null;
let controlEls: Partial<Record<MobileControlId, HTMLElement>> = {};
let steerLeftEl: HTMLElement | null = null;
let steerRightEl: HTMLElement | null = null;
let visible = false;

function isManualMobileControl(): boolean {
	if (!window.mobile) return false;
	return (localStorage.getItem("CONTROLTYPE") || "cpu").toUpperCase() === "MAN";
}

function shouldShow(): boolean {
	return document.body.classList.contains("state-playing") && isManualMobileControl();
}

export function setupMobileControlsOverlay() {
	if (!window.mobile || overlayEl) return;

	overlayEl = document.createElement("div");
	overlayEl.id = "mobile-controls";
	overlayEl.setAttribute("aria-hidden", "true");

	for (const zone of MOBILE_CONTROL_ZONES) {
		const el = document.createElement("div");
		el.className = `mob-ctrl mob-ctrl--${zone.id}`;
		el.dataset.control = zone.id;

		const rect = zone.rect;
		el.style.left = `${rect[0] * 100}%`;
		el.style.top = `${rect[1] * 100}%`;
		el.style.width = `${(rect[2] - rect[0]) * 100}%`;
		el.style.height = `${(rect[3] - rect[1]) * 100}%`;

		if (zone.id === "steer") {
			const arrows = document.createElement("div");
			arrows.className = "mob-ctrl__steer-arrows";
			steerLeftEl = document.createElement("span");
			steerLeftEl.className = "mob-ctrl__steer-dir";
			steerLeftEl.textContent = "◀";
			const separator = document.createElement("span");
			separator.className = "mob-ctrl__steer-separator";
			separator.setAttribute("aria-hidden", "true");
			steerRightEl = document.createElement("span");
			steerRightEl.className = "mob-ctrl__steer-dir";
			steerRightEl.textContent = "▶";
			arrows.appendChild(steerLeftEl);
			arrows.appendChild(separator);
			arrows.appendChild(steerRightEl);
			el.appendChild(arrows);
		} else {
			const label = document.createElement("span");
			label.className = "mob-ctrl__label";
			label.textContent = zone.label;
			el.appendChild(label);
		}

		controlEls[zone.id] = el;
		overlayEl.appendChild(el);
	}

	document.body.appendChild(overlayEl);
	syncMobileControlsVisibility();
}

export function syncMobileControlsLayout(fit: { offsetX: number; offsetY: number; width: number; height: number }) {
	if (!overlayEl) return;
	overlayEl.style.left = `${fit.offsetX}px`;
	overlayEl.style.top = `${fit.offsetY}px`;
	overlayEl.style.width = `${fit.width}px`;
	overlayEl.style.height = `${fit.height}px`;
}

export function syncMobileControlsVisibility() {
	if (!overlayEl) return;
	const show = shouldShow();
	overlayEl.classList.toggle("visible", show);
	visible = show;
	if (!show) {
		clearMobileControlsActiveState();
	}
}

export function updateMobileControlsOverlay() {
	if (!overlayEl || !visible) return;

	const state = getMobileControlVisualState(window.touches);

	controlEls.accel?.classList.toggle("active", state.accel);
	controlEls.accel?.classList.toggle("reverse", state.reverse);
	controlEls.drift?.classList.toggle("active", state.drift);
	controlEls.item?.classList.toggle("active", state.item);
	controlEls.steer?.classList.toggle("active", state.steer !== 0);
	steerLeftEl?.classList.toggle("active", state.steer < 0);
	steerRightEl?.classList.toggle("active", state.steer > 0);
}

function clearMobileControlsActiveState() {
	for (const el of Object.values(controlEls)) {
		el?.classList.remove("active", "reverse");
	}
	steerLeftEl?.classList.remove("active");
	steerRightEl?.classList.remove("active");
}
