//
// narc.js
//--------------------
// Reads narc archives and provides access to files by directory structure.
// by RHY3756547
//

import { MKSUtils } from "./utils";

type NarcFileRange = {
	start: number;
	end: number;
};

type NarcEntry = {
	dir: boolean;
	id: number;
	name: string;
};

type NarcDirectory = {
	firstFile: number;
	numDir?: number;
	parent?: number;
	entries: NarcEntry[];
};

type HandlerObj = {
	type: string;
	size: number;
	nextOff: number;
	directories?: NarcDirectory[];
	baseOff?: number;
	numFiles?: number;
	reserved?: number;
	files?: NarcFileRange[];
};

type NarcSection = HandlerObj;

export class narc implements MKJSDataFormator {
	input: MKJSDataInput;
	private _handlers: {
		[x: string]: (view: DataView, off: number, obj: HandlerObj) => void;
	};
	stamp!: string;
	byteOrder!: number;
	version!: number;
	size!: number;
	headSize!: number;
	numBlocks!: number;
	sections!: {
		[x: string]: NarcSection;
	};

	constructor(input: MKJSDataInput | string) {
		this.input = undefined!;

		this._handlers = {};
		this._handlers["BTAF"] = (view: DataView, off: number, obj: HandlerObj) => {
			obj.numFiles = view.getUint16(off, true);
			obj.reserved = view.getUint16(off + 0x2, true);
			obj.files = [];
			off += 4;
			for (let i = 0; i < obj.numFiles; i++) {
				obj.files.push({
					start: view.getUint32(off, true),
					end: view.getUint32(off + 4, true),
				});
				off += 8;
			}
		};

		this._handlers["BTNF"] = (view: DataView, off: number, obj: HandlerObj) => {
			//filename table - includes directories and filenames.
			const soff = off;
			obj.directories = [];
			//read root dir, then we know number of directories to read.

			const dirOff = soff + view.getUint32(off, true);
			const firstFile = view.getUint16(off + 4, true);

			const numDir = view.getUint16(off + 6, true);

			const root: NarcDirectory = {
				firstFile,
				numDir,
				entries: [],
			};

			this._populateDir(view, dirOff, root);

			off += 8;
			obj.directories.push(root);

			const n = numDir - 1;
			for (let i = 0; i < n; i++) {
				const dirOff = soff + view.getUint32(off, true);
				const firstFile = view.getUint16(off + 4, true);
				const parent = view.getUint16(off + 6, true);

				const dir: NarcDirectory = {
					firstFile,
					parent,
					entries: [],
				};

				this._populateDir(view, dirOff, dir);

				off += 8;
				obj.directories.push(dir);
			}
		};

		this._handlers["GMIF"] = (view: DataView, off: number, obj: HandlerObj) => {
			obj.baseOff = off;
		};

		if (input != null) {
			if (typeof input == "string") {
				const xml = new XMLHttpRequest();
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

	load(buffer: MKJSDataInput) {
		buffer = MKSUtils.prepareInput(buffer);
		this.input = buffer; //we will use this data in the future.

		const view = new DataView(buffer);
		this.stamp =
			MKSUtils.asciireadChar(view, 0x0) +
			MKSUtils.asciireadChar(view, 0x1) +
			MKSUtils.asciireadChar(view, 0x2) +
			MKSUtils.asciireadChar(view, 0x3);
		if (this.stamp != "NARC") throw `File provided is not a NARC archive! Expected NARC, found ${this.stamp}.`;

		this.byteOrder = view.getUint16(0x4, true); //todo: check byte order and flip to little endian when necessary
		this.version = view.getUint16(0x6, true);
		this.size = view.getUint32(0x8, true);
		this.headSize = view.getUint16(0xc, true);
		this.numBlocks = view.getUint16(0xe, true);

		let off = this.headSize;

		this.sections = {};
		for (let i = 0; i < this.numBlocks; i++) {
			const section = this._readSection({ view, off });
			this.sections[section.type] = section;
			off = 4 * Math.ceil(section.nextOff / 4);
		}
	}

	private _readSection({ view, off }: { view: DataView; off: number }): NarcSection {
		const type =
			MKSUtils.asciireadChar(view, off + 0x0) +
			MKSUtils.asciireadChar(view, off + 0x1) +
			MKSUtils.asciireadChar(view, off + 0x2) +
			MKSUtils.asciireadChar(view, off + 0x3);
		const size = view.getUint32(off + 0x4, true);
		const nextOff = off + size;
		const obj = {
			type,
			size,
			nextOff,
		};

		if (this._handlers[type] == null) throw `Unknown NARC section ${type}!`;
		this._handlers[type](view, off + 0x8, obj);
		return obj;
	}

	getFile(name: string): ArrayBuffer | null {
		const file = this.tryGetFile(name);
		if (file == null) console.error(`File not found: ${name}`);
		return file;
	}

	tryGetFile(name: string): ArrayBuffer | null {
		this._assertLoaded();

		const path = name.split("/");
		const start = path[0] == "" ? 1 : 0; //fix dirs relative to root (eg "/hi/test.bin")

		const table = this.sections["BTNF"].directories!;
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
			if (!found) return null;
		}
		return null; //incomplete path; we ended on a directory, not a file!
	}

	list(files: string[] = [], curDir?: NarcEntry[], path = "/"): string[] {
		this._assertLoaded();

		const table = this.sections["BTNF"].directories!;
		const dir = curDir || table[0].entries!; //root

		for (let i = 0; i < dir.length; i++) {
			if (dir[i].dir) {
				this.list(files, table[dir[i].id - 0xf000].entries, `${path + dir[i].name}/`);
			} else {
				files.push(path + dir[i].name);
			}
		}
		return files;
	}

	private _readFileWithID(id: number): ArrayBuffer | null {
		this._assertLoaded();

		const table = this.sections["BTAF"].files!;
		const file = table[id];
		const off = this.sections["GMIF"].baseOff!;
		if (file == null) {
			console.error(`File ID invalid: ${id}`);
			return null;
		}
		return this.input.slice(file.start + off, file.end + off);
	}

	private _populateDir(view: DataView, off: number, dir: NarcDirectory): void {
		let curFile = dir.firstFile;
		dir.entries = [];
		while (true) {
			const flag = view.getUint8(off++);
			const len = flag & 127;
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
				const dirID = view.getUint16(off + len, true);
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
			throw new Error("NARC archive is not loaded yet.");
		}
	}
}

// for reading from multiple narcs as one. (eg. Race.narc, Racethis._us.narc)
export class narcGroup {
	files: narc[];
	constructor(files: narc[]) {
		this.files = files;
	}

	tryGetFile(name: string): ArrayBuffer | null {
		for (let i = 0; i < this.files.length; i++) {
			const file = this.files[i].tryGetFile(name);
			if (file != null) return file;
		}
		return null;
	}

	getFile(name: string): ArrayBuffer | null {
		const file = this.tryGetFile(name);
		if (file == null) console.error(`File not found: ${name}`);
		return file;
	}

	list(): string[] {
		const result: string[] = [];
		for (let i = 0; i < this.files.length; i++) {
			this.files[i].list(result);
		}
		return result;
	}
}
