//
// ndsFS.js
//--------------------
// Reads nds roms using nitroFS and provides access to files by directory structure.
// by RHY3756547
//

import { MKSUtils } from "./utils";

type NitroFSFileRange = {
	start: number;
	end: number;
};

type NitroFSEntry = {
	dir: boolean;
	id: number;
	name: string;
};

type NitroFSDirectory = {
	firstFile: number;
	numDir?: number;
	parent?: number;
	entries: NitroFSEntry[];
};

type HandlerObj = {
	files?: NitroFSFileRange[];
	numFiles?: number;
	directories?: NitroFSDirectory[];
};

type NdsFSSections = {
	BTNF: {
		directories: NitroFSDirectory[];
	};
	BTAF?: {
		files: NitroFSFileRange[];
	};
};

export class ndsFS implements MKJSDataFormator {
	input: MKJSDataInput;
	handlers: {
		[x: string]: (view: DataView, off: number, obj: HandlerObj) => void;
	};
	view!: DataView;
	sections!: NdsFSSections;
	nameOff!: number;
	fileOff!: number;
	constructor(input: MKJSDataInput | string) {
		this.input = undefined!;

		this.handlers = {};
		this.handlers["BTAF"] = (view: DataView, off: number, obj: HandlerObj) => {
			obj.files = [];
			for (let i = 0; i < obj.numFiles!; i++) {
				const start = view.getUint32(off, true);
				const end = view.getUint32(off + 4, true);
				obj.files.push({ start, end });
				off += 8;
			}
		};

		this.handlers["BTNF"] = (view: DataView, off: number, obj: HandlerObj) => {
			//filename table - includes directories and filenames.
			let soff = off;
			obj.directories = [];
			//read root dir, then we know number of directories to read.

			let dirOff = soff + view.getUint32(off, true);
			let firstFile = view.getUint16(off + 4, true);

			let numDir = view.getUint16(off + 6, true);

			let root: NitroFSDirectory = {
				firstFile,
				numDir,
				entries: [],
			};

			this._populateDir(view, dirOff, root);

			off += 8;
			obj.directories.push(root);

			let n = numDir - 1;
			for (let i = 0; i < n; i++) {
				let dirOff = soff + view.getUint32(off, true);
				let firstFile = view.getUint16(off + 4, true);
				let parent = view.getUint16(off + 6, true);

				let dir: NitroFSDirectory = {
					firstFile,
					parent,
					entries: [],
				};

				this._populateDir(view, dirOff, dir);

				off += 8;
				obj.directories.push(dir);
			}
		};

		if (input != null) {
			if (typeof input == "string") {
				let xml = new XMLHttpRequest();
				xml.responseType = "arraybuffer";
				xml.open("GET", input, true);
				xml.onload = () => {
					this.load(xml.response);
				};
				xml.send();
			} else {
				this.load(input);
			}
		}
	}

	load(input: MKJSDataInput): void {
		this.input = input;
		let view = new DataView(input);
		this.view = view;
		this.sections = { BTNF: { directories: [] } };

		this.nameOff = view.getUint32(0x40, true);
		this.fileOff = view.getUint32(0x48, true);

		this.sections["BTNF"] = { directories: [] };
		this.handlers["BTNF"](view, this.nameOff, this.sections["BTNF"]); //file name table

		/*this.sections["BTAF"] = {};
		this.handlers["BTAF"](view, , this.sections["BTAF"]) //file alloc table */
	}

	getFile(name: string): ArrayBuffer | null {
		this._assertLoaded();

		let path = name.split("/");
		let start = path[0] == "" ? 1 : 0; //fix dirs relative to root (eg "/hi/test.bin")

		let table = this.sections.BTNF.directories;
		let curDir = table[0].entries; //root
		for (let i = start; i < path.length; i++) {
			let found = false;
			for (let j = 0; j < curDir.length; j++) {
				if (curDir[j].name == path[i]) {
					if (curDir[j].dir) {
						found = true;
						curDir = table[curDir[j].id - 0xf000].entries;
						break;
					} else {
						return this._readFileWithID(curDir[j].id);
					}
				}
			}
			if (!found) {
				console.error(`File not found: ${name}, could not find ${path[i]}`);
				return null;
			}
		}
		console.error(`Path is not a file: ${name}`);
		return null; //incomplete path; we ended on a directory, not a file!
	}

	private list(files: string[] = [], curDir?: NitroFSEntry[], path = "/"): string[] {
		this._assertLoaded();

		let table = this.sections.BTNF.directories;
		const dir = curDir || table[0].entries; //root

		for (let i = 0; i < dir.length; i++) {
			if (dir[i].dir) {
				this.list(files, table[dir[i].id - 0xf000].entries, `${path + dir[i].name}/`);
			} else {
				files.push(path + dir[i].name);
			}
		}
		return files;
	}

	private _readFileWithID(id: number): ArrayBuffer {
		this._assertLoaded();

		let off = this.fileOff + id * 8;
		/*var table = this.sections["BTAF"].files;
		var file = table[id];
		if (file == null) {
			console.error(`File ID invalid: ${id}`);
			return null;
		}*/
		return this.input.slice(this.view.getUint32(off, true), this.view.getUint32(off + 4, true));
	}

	private _populateDir(view: DataView, off: number, dir: NitroFSDirectory): void {
		let curFile = dir.firstFile;
		dir.entries = [];
		while (true) {
			let flag = view.getUint8(off++);
			let len = flag & 127;
			if (!(flag & 128)) {
				//file or end of dir
				if (len == 0) return;
				else {
					dir.entries.push({
						dir: false,
						id: curFile++,
						name: this._readString(view, off, len),
					});
					off += len;
				}
			} else {
				let dirID = view.getUint16(off + len, true);
				dir.entries.push({
					dir: true,
					id: dirID,
					name: this._readString(view, off, len),
				});
				off += len + 2;
			}
		}
	}

	private _readString(view: DataView, off: number, length: number): string {
		let str = "";
		for (let i = 0; i < length; i++) {
			str += MKSUtils.asciireadChar(view, off++);
		}
		return str;
	}

	private _assertLoaded(): void {
		if (this.sections == null) {
			throw new Error("NDS filesystem is not loaded yet.");
		}
	}
}
