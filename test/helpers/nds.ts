import { BinaryWriter } from "./binary";

export type MinimalNdsFile = {
	path: string;
	content: Uint8Array | number[] | string;
};

/** Builds a minimal NitroFS-like buffer for ndsFS (single root directory). */
export function buildMinimalNdsFs(files: MinimalNdsFile[]): ArrayBuffer {
	const fileContents = files.map((file) => {
		if (typeof file.content === "string") {
			return new TextEncoder().encode(file.content);
		}
		return file.content instanceof Uint8Array ? file.content : new Uint8Array(file.content);
	});

	const nameTable = new BinaryWriter();
	const dirStart = 8;
	nameTable.writeU32(dirStart);
	nameTable.writeU16(0);
	nameTable.writeU16(1);

	for (const file of files) {
		const name = file.path.includes("/") ? file.path.split("/").pop()! : file.path;
		nameTable.writeU8(name.length);
		for (const ch of name) {
			nameTable.writeU8(ch.charCodeAt(0));
		}
	}
	nameTable.writeU8(0);

	const nameOff = 0x200;
	const fileOff = nameOff + nameTable.size;
	const dataStart = fileOff + files.length * 8;

	const fileTable = new BinaryWriter();
	let cursor = dataStart;
	for (const content of fileContents) {
		fileTable.writeU32(cursor);
		cursor += content.length;
		fileTable.writeU32(cursor);
	}

	const rom = new BinaryWriter();
	rom.writeZeros(0x40);
	rom.writeU32(nameOff);
	rom.writeZeros(4);
	rom.writeU32(fileOff);
	rom.padToAlignment(nameOff);
	rom.writeBytes(new Uint8Array(nameTable.toArrayBuffer()));
	rom.writeBytes(new Uint8Array(fileTable.toArrayBuffer()));
	for (const content of fileContents) {
		rom.writeBytes(content);
	}

	return rom.toArrayBuffer();
}
