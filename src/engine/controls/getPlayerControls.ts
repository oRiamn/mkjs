import { controlDefault } from "./controlDefault";
import { controlMobile } from "./controlMobile";

export function getPlayerControls(): typeof Controls {
    const w = window as any
    if (w.mobile) {
        return controlMobile;
    } else {
        return controlDefault;
    }
}