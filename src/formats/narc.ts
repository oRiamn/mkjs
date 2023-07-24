//
// narc.js
//--------------------
// Reads narc archives and provides access to files by directory structure.
// by RHY3756547
//

import { MKSUtils } from "./utils";

type HandlerObj = {
	type: string;
	size: number;
	nextOff: number;
	directories?: any[];
	baseOff?: number;
	numFiles?: number;
	reserved?: number;
	files?: {}[];
}

export class narc implements MKJSDataFormator {
	input: MKJSDataInput;
	_handlers: {
		[x: string]: (view: DataView, off: number, obj: HandlerObj) => void;
	};
	stamp: string;
	byteOrder: number;
	version: number;
	size: number;
	headSize: number;
	numBlocks: number;
	sections: {
		[x: string]: any
	};

	constructor(input: MKJSDataInput) {

		this.input = input;

		this._handlers = {};
		this._handlers["BTAF"] = (view: DataView, off: number, obj: HandlerObj) => {
			obj.numFiles = view.getUint16(off, true);
			obj.reserved = view.getUint16(off + 0x2, true);
			obj.files = [];
			off += 4;
			for (var i = 0; i < obj.numFiles; i++) {
				obj.files.push({
					start: view.getUint32(off, true),
					end: view.getUint32(off + 4, true)
				});
				off += 8;
			}
		}

		this._handlers["BTNF"] = (view: DataView, off: number, obj: HandlerObj) => { //filename table - includes directories and filenames.
			var soff = off;
			obj.directories = [];
			//read root dir, then we know number of directories to read.

			var dirOff = soff + view.getUint32(off, true);
			var firstFile = view.getUint16(off + 4, true);

			var numDir = view.getUint16(off + 6, true);

			var root = {
				firstFile,
				numDir
			};

			this._populateDir(view, dirOff, root);

			off += 8;
			obj.directories.push(root);

			var n = root.numDir - 1;
			for (var i = 0; i < n; i++) {
				var dirOff = soff + view.getUint32(off, true);
				var firstFile = view.getUint16(off + 4, true);
				var parent = view.getUint16(off + 6, true);

				var dir = {
					firstFile,
					parent
				};

				this._populateDir(view, dirOff, dir);

				off += 8;
				obj.directories.push(dir);
			}
		}

		this._handlers["GMIF"] = (view: DataView, off: number, obj: HandlerObj) => {
			obj.baseOff = off;
		}

		if (this.input != null) {
			if (typeof this.input == "string") {
				var xml = new XMLHttpRequest();
				xml.responseType = "arraybuffer";
				xml.open("GET", this.input, true);
				xml.onload = () => {
					this.load(xml.response);
				}
				xml.send();
			} else {
				this.load(this.input);
			}
		}
	}

	load(buffer: MKJSDataInput) {
		this.input = buffer; //we will use this data in the future.

		var view = new DataView(buffer);
		this.stamp = MKSUtils.asciireadChar(view, 0x0) + MKSUtils.asciireadChar(view, 0x1) + MKSUtils.asciireadChar(view, 0x2) + MKSUtils.asciireadChar(view, 0x3);
		if (this.stamp != "NARC") throw "File provided is not a NARC archive! Expected NARC, found " + this.stamp + ".";

		this.byteOrder = view.getUint16(0x4, true); //todo: check byte order and flip to little endian when necessary
		this.version = view.getUint16(0x6, true);
		this.size = view.getUint32(0x8, true);
		this.headSize = view.getUint16(0xC, true);
		this.numBlocks = view.getUint16(0xE, true);

		var off = this.headSize;

		this.sections = {};
		for (var i = 0; i < this.numBlocks; i++) {
			var section = this._readSection({ view, off });
			this.sections[section.type] = section;
			off = 4 * Math.ceil(section.nextOff / 4);
		}
	}

	_readSection({ view, off }: { view: DataView; off: number; }): { type: string; size: number; nextOff: number; } {
		const type = MKSUtils.asciireadChar(view, off + 0x0) + MKSUtils.asciireadChar(view, off + 0x1) + MKSUtils.asciireadChar(view, off + 0x2) + MKSUtils.asciireadChar(view, off + 0x3);
		const size = view.getUint32(off + 0x4, true);
		const nextOff = off + size;
		const obj = {
			type,
			size,
			nextOff
		};

		if (this._handlers[type] == null) throw "Unknown NARC section " + type + "!";
		this._handlers[type](view, off + 0x8, obj);
		return obj;
	}

	getFile(name: string): ArrayBuffer {
		var path = name.split("/");
		var start = (path[0] == "") ? 1 : 0; //fix dirs relative to root (eg "/hi/test.bin")

		var table = this.sections["BTNF"].directories;
		var curDir = table[0].entries; //root
		for (var i = start; i < path.length; i++) {
			var found = false;
			for (var j = 0; j < curDir.length; j++) {
				if (curDir[j].name == path[i]) {
					if (curDir[j].dir) {
						found = true;
						curDir = table[curDir[j].id - 0xF000].entries;
						break;
					} else {
						return this._readFileWithID(curDir[j].id);
					}

				}
			}
			if (!found) {
				console.error("File not found: " + name + ", could not find " + path[i]);
				return null;
			}
		}
		console.error("Path is not a file: " + name);
		return null; //incomplete path; we ended on a directory, not a file!
	}

	list(files?: any[], curDir?: string | any[], path?: string): any[] {
		path = path || "/";
		files = files || [];
		var table = this.sections["BTNF"].directories;
		curDir = curDir || table[0].entries; //root

		for (var i = 0; i < curDir.length; i++) {
			if (curDir[i].dir) {
				this.list(files, table[curDir[i].id - 0xF000].entries, path + curDir[i].name + "/");
			} else {
				files.push(path + curDir[i].name);
			}
		}
		return files;
	}

	_readFileWithID(id: string): ArrayBuffer {
		var table = this.sections["BTAF"].files;
		var file = table[id];
		var off = this.sections["GMIF"].baseOff;
		if (file == null) {
			console.error("File ID invalid: " + id);
			return null;
		}
		return this.input.slice(file.start + off, file.end + off);
	}

	_populateDir(view: DataView, off: number, dir: { firstFile?: any; entries?: any; }): void {
		let curFile = dir.firstFile;
		dir.entries = [];
		while (true) {
			var flag = view.getUint8(off++);
			var len = flag & 127;
			if (!(flag & 128)) { //file or end of dir
				if (len == 0) return;
				else {
					dir.entries.push({
						dir: false,
						id: curFile++,
						name: this._readString(view, off, len)
					})
					off += len;
				}
			} else {
				var dirID = view.getUint16(off + len, true);
				dir.entries.push({
					dir: true,
					id: dirID,
					name: this._readString(view, off, len)
				});
				off += len + 2;
			}
		}
	}

	_readString(view: DataView, off: number, length: number): string {
		var str = "";
		for (var i = 0; i < length; i++) {
			str += MKSUtils.asciireadChar(view, off++);
		}
		return str;
	}
}

// for reading from multiple narcs as one. (eg. Race.narc, Racethis._us.narc)
export class narcGroup {
	files: narc[];
	constructor(files: narc[]) {
		this.files = files;
	}

	getFile(name: string): ArrayBuffer {
		for (var i = 0; i < this.files.length; i++) {
			var file = this.files[i].getFile(name);
			if (file != null) return file;
		}
		console.error("File not found: " + name);
		return null;
	}

	list(): any[] {
		var result: any[] = [];
		for (var i = 0; i < this.files.length; i++) {
			this.files[i].list(result);
		}
		return result;
	}
}


