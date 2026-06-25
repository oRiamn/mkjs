import { lz77 } from "./lz77";

export class MKSUtils {
	static prepareInput(input: MKJSDataInput): ArrayBuffer {
		return lz77.maybeDecompress(input);
	}

	static asciiFromCharCode(charcode: number) {
		return charcode < 1 || charcode > 127 ? "" : String.fromCharCode(charcode);
	}
	static asciireadChar(view: DataView, offset: number) {
		const charcode = view.getUint8(offset);
		return MKSUtils.asciiFromCharCode(charcode);
	}
	static readAsciiTag(view: DataView, offset: number): string {
		return <string>Array.from({ length: 4 }).reduce((acc, curr, i) => `${acc}${MKSUtils.asciireadChar(view, offset + i)}`, "");
	}
}
