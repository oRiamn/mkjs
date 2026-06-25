//
// ndsFS.js
//--------------------
// Reads nds roms using nitroFS and provides access to files by directory structure.
// by RHY3756547
//

import { MKSUtils } from "./utils";

const NDS_NAME_TABLE_OFFSET = 0x40;
const NDS_FILE_TABLE_OFFSET = 0x48;
/** NitroFS directory IDs in the name table are encoded as 0xF000 + directory index. */
const NITRO_DIR_ID_BASE = 0xf000;

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

type NdsFSSections = {
	BTNF: {
		directories: NitroFSDirectory[];
	};
	BTAF?: {
		files: NitroFSFileRange[];
	};
};

export class ndsFS implements MKJSDataFormator {
	private input: MKJSDataInput;
	private view!: DataView;
	private sections!: NdsFSSections;
	private nameTableOffset!: number;
	private fileTableOffset!: number;

	constructor(input: MKJSDataInput | string) {
		this.input = undefined!;

		if (input != null) {
			if (typeof input === "string") {
				this._loadFromUrl(input);
			} else {
				this.load(input);
			}
		}
	}

	load(input: MKJSDataInput): void {
		input = MKSUtils.prepareInput(input);
		this.input = input;
		this.view = new DataView(input);
		this.nameTableOffset = this.view.getUint32(NDS_NAME_TABLE_OFFSET, true);
		this.fileTableOffset = this.view.getUint32(NDS_FILE_TABLE_OFFSET, true);
		this.sections = {
			BTNF: {
				directories: this._parseNameTable(this.view, this.nameTableOffset),
			},
		};
	}

	getFile(filepath: string): ArrayBuffer | null {
		this._assertLoaded();

		let entries = this.sections.BTNF.directories[0].entries;
		for (const part of this._splitPath(filepath)) {
			const entry = entries.find((candidate) => candidate.name === part);
			if (entry == null) {
				console.error(`File not found: ${filepath}, could not find ${part}`);
				return null;
			}
			if (entry.dir) {
				entries = this._directoryEntries(entry.id);
			} else {
				return this._readFileById(entry.id);
			}
		}

		console.error(`Path is not a file: ${filepath}`);
		return null;
	}

	list(): string[] {
		return this._list();
	}

	private _list(files: string[] = [], entries?: NitroFSEntry[], currentPath = "/"): string[] {
		this._assertLoaded();

		const dir = entries ?? this.sections.BTNF.directories[0].entries;
		for (const entry of dir) {
			if (entry.dir) {
				this._list(files, this._directoryEntries(entry.id), `${currentPath}${entry.name}/`);
			} else {
				files.push(`${currentPath}${entry.name}`);
			}
		}
		return files;
	}

	private _loadFromUrl(url: string): void {
		const xhr = new XMLHttpRequest();
		xhr.responseType = "arraybuffer";
		xhr.open("GET", url, true);
		xhr.onload = () => {
			this.load(xhr.response);
		};
		xhr.send();
	}

	private _splitPath(name: string): string[] {
		const parts = name.split("/");
		return parts[0] === "" ? parts.slice(1) : parts;
	}

	private _directoryIndex(dirId: number): number {
		return dirId - NITRO_DIR_ID_BASE;
	}

	private _directoryEntries(dirId: number): NitroFSEntry[] {
		return this.sections.BTNF.directories[this._directoryIndex(dirId)].entries;
	}

	private _readFileById(id: number): ArrayBuffer {
		const off = this.fileTableOffset + id * 8;
		const start = this.view.getUint32(off, true);
		const end = this.view.getUint32(off + 4, true);
		return (this.input as ArrayBuffer).slice(start, end);
	}

	/** Parses the NitroFS name table (BTNF): directory headers plus entry lists. */
	private _parseNameTable(view: DataView, offset: number): NitroFSDirectory[] {
		const tableStart = offset;
		const directories: NitroFSDirectory[] = [];

		const rootDirOffset = tableStart + view.getUint32(offset, true);
		const rootFirstFile = view.getUint16(offset + 4, true);
		const numDirectories = view.getUint16(offset + 6, true);

		const root: NitroFSDirectory = {
			firstFile: rootFirstFile,
			numDir: numDirectories,
			entries: [],
		};
		this._populateDirectory(view, rootDirOffset, root);
		directories.push(root);

		offset += 8;
		for (let i = 1; i < numDirectories; i++) {
			const dirOffset = tableStart + view.getUint32(offset, true);
			const firstFile = view.getUint16(offset + 4, true);
			const parent = view.getUint16(offset + 6, true);

			const dir: NitroFSDirectory = {
				firstFile,
				parent,
				entries: [],
			};
			this._populateDirectory(view, dirOffset, dir);
			directories.push(dir);
			offset += 8;
		}

		return directories;
	}

	private _populateDirectory(view: DataView, offset: number, dir: NitroFSDirectory): void {
		let fileId = dir.firstFile;
		dir.entries = [];

		while (true) {
			const flag = view.getUint8(offset++);
			const nameLength = flag & 0x7f;

			if (!(flag & 0x80)) {
				if (nameLength === 0) return;

				dir.entries.push({
					dir: false,
					id: fileId++,
					name: this._readString(view, offset, nameLength),
				});
				offset += nameLength;
			} else {
				const dirId = view.getUint16(offset + nameLength, true);
				dir.entries.push({
					dir: true,
					id: dirId,
					name: this._readString(view, offset, nameLength),
				});
				offset += nameLength + 2;
			}
		}
	}

	private _readString(view: DataView, offset: number, length: number): string {
		let str = "";
		for (let i = 0; i < length; i++) {
			str += MKSUtils.asciireadChar(view, offset++);
		}
		return str;
	}

	private _assertLoaded(): void {
		if (this.sections == null) {
			throw new Error("NDS filesystem is not loaded yet.");
		}
	}
}
