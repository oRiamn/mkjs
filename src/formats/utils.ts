export class MKSUtils {
    static asciiFromCharCode(charcode: number) {
        return (charcode < 1 || charcode > 127) ? '' : String.fromCharCode(charcode);
    }
    static asciireadChar(view: DataView, offset: number) {
        const charcode = view.getUint8(offset);
        return MKSUtils.asciiFromCharCode(charcode)
    }    
}