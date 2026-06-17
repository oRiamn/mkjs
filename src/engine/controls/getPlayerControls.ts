import { controlDefault } from "./controlDefault";
import { controlMobile } from "./controlMobile";

export function getPlayerControls(): typeof Controls {
	if (window.mobile) {
		return controlMobile;
	} else {
		return controlDefault;
	}
}
