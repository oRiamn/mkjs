//
// ndsFS.js
//--------------------
// Reads nds roms using nitroFS and provides access to files by directory structure.
// by RHY3756547
//

import { MKSUtils } from "./utils";

type HandlerObj = {
	files: any[];
	numFiles: number;
	directories: any[];

}

export class ndsFS  implements MKJSDataFormator {
	input: MKJSDataInput;
	handlers: {
		[x: string]: (view: DataView, off: number, obj: HandlerObj) => void;
	};
	view: DataView;
	sections: {
		[x: string]: any
	};
	nameOff: number;
	fileOff: number;
	constructor(input: any) {
		this.input = input;

		this.handlers = {};
		this.handlers["BTAF"] = (view: DataView, off: number, obj: HandlerObj) => {
			obj.files = [];
			for (var i = 0; i < obj.numFiles; i++) {
				const start = view.getUint32(off, true);
				const end = view.getUint32(off + 4, true);
				obj.files.push({ start, end });
				off += 8;
			}
		}

		this.handlers["BTNF"] = (view: DataView, off: number, obj: HandlerObj) => { //filename table - includes directories and filenames.
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

	load(input: MKJSDataInput): void {
		var view = new DataView(input);
		this.view = view;
		this.sections = {};

		this.nameOff = view.getUint32(0x40, true);
		this.fileOff = view.getUint32(0x48, true)

		this.sections["BTNF"] = {};
		this.handlers["BTNF"](view, this.nameOff, this.sections["BTNF"]) //file name table

		/*this.sections["BTAF"] = {};
		this.handlers["BTAF"](view, , this.sections["BTAF"]) //file alloc table */
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

	list(files: any[], curDir: string | any[], path: string): any[] {
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

	_readFileWithID(id: number): ArrayBuffer {
		var off = this.fileOff + id * 8;
		/*var table = this.sections["BTAF"].files;
		var file = table[id];
		if (file == null) {
			console.error("File ID invalid: "+id);
			return null;
		}*/
		return this.input.slice(this.view.getUint32(off, true), this.view.getUint32(off + 4, true));
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