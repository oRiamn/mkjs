import { BinaryWriter } from "./binary";

export type MinimalNarcFile = {
	path: string;
	content: Uint8Array | number[] | string;
};

function toBytes(content: Uint8Array | number[] | string): Uint8Array {
	if (typeof content === "string") {
		return new TextEncoder().encode(content);
	}
	return content instanceof Uint8Array ? content : new Uint8Array(content);
}

type NarcDirNode = {
	name: string;
	files: { name: string; content: Uint8Array }[];
	children: NarcDirNode[];
};

function buildNarcTree(files: MinimalNarcFile[]): NarcDirNode {
	const root: NarcDirNode = { name: "", files: [], children: [] };

	for (const file of files) {
		const parts = file.path.replace(/^\//, "").split("/");
		const fileName = parts.pop()!;
		let node = root;

		for (const part of parts) {
			let child = node.children.find((entry) => entry.name === part);
			if (child == null) {
				child = { name: part, files: [], children: [] };
				node.children.push(child);
			}
			node = child;
		}

		node.files.push({ name: fileName, content: toBytes(file.content) });
	}

	return root;
}

function collectDirectories(root: NarcDirNode): NarcDirNode[] {
	const directories = [root];
	const visit = (node: NarcDirNode) => {
		for (const child of node.children) {
			directories.push(child);
			visit(child);
		}
	};
	visit(root);
	return directories;
}

/** Builds a minimal valid NARC archive with nested directory paths. */
export function buildNestedMinimalNarc(files: MinimalNarcFile[]): ArrayBuffer {
	const root = buildNarcTree(files);
	const directories = collectDirectories(root);
	const flatFiles: Uint8Array[] = [];

	for (const directory of directories) {
		for (const file of directory.files) {
			flatFiles.push(file.content);
		}
	}

	const gmifBody = new BinaryWriter();
	for (const content of flatFiles) {
		gmifBody.writeBytes(content);
	}

	const btafBody = new BinaryWriter();
	btafBody.writeU16(flatFiles.length);
	btafBody.writeU16(0);
	let cursor = 0;
	for (const content of flatFiles) {
		btafBody.writeU32(cursor);
		cursor += content.length;
		btafBody.writeU32(cursor);
	}

	const tableWriters: BinaryWriter[] = [];
	for (let dirIndex = 0; dirIndex < directories.length; dirIndex++) {
		const directory = directories[dirIndex];
		const tableWriter = new BinaryWriter();

		for (const child of directory.children) {
			const childIndex = directories.indexOf(child);
			tableWriter.writeU8(0x80 | child.name.length);
			for (const ch of child.name) {
				tableWriter.writeU8(ch.charCodeAt(0));
			}
			tableWriter.writeU16(0xf000 + childIndex);
		}

		for (const file of directory.files) {
			tableWriter.writeU8(file.name.length);
			for (const ch of file.name) {
				tableWriter.writeU8(ch.charCodeAt(0));
			}
		}
		tableWriter.writeU8(0);
		tableWriters.push(tableWriter);
	}

	const btnfBody = new BinaryWriter();
	const headerSize = directories.length * 8;
	let tableOffset = headerSize;
	const tableOffsets: number[] = [];

	for (const tableWriter of tableWriters) {
		tableOffsets.push(tableOffset);
		tableOffset += tableWriter.size;
	}

	for (let dirIndex = 0; dirIndex < directories.length; dirIndex++) {
		let firstFile = 0;
		for (let i = 0; i < dirIndex; i++) {
			firstFile += directories[i].files.length;
		}

		btnfBody.writeU32(tableOffsets[dirIndex]);
		btnfBody.writeU16(firstFile);
		if (dirIndex === 0) {
			btnfBody.writeU16(directories.length);
		} else {
			btnfBody.writeU16(0);
		}
	}

	for (const tableWriter of tableWriters) {
		btnfBody.writeBytes(new Uint8Array(tableWriter.toArrayBuffer()));
	}

	const sections = [
		{ type: "BTAF", body: btafBody },
		{ type: "BTNF", body: btnfBody },
		{ type: "GMIF", body: gmifBody },
	];

	const sectionWriter = new BinaryWriter();
	for (const section of sections) {
		const bodyWriter = new BinaryWriter();
		bodyWriter.writeBytes(new Uint8Array(section.body.toArrayBuffer()));
		bodyWriter.padToAlignment(4);
		const body = new Uint8Array(bodyWriter.toArrayBuffer());
		sectionWriter.writeAscii(section.type, 4);
		sectionWriter.writeU32(8 + body.length);
		sectionWriter.writeBytes(body);
	}

	const headSize = 16;
	const totalSize = headSize + sectionWriter.size;
	const writer = new BinaryWriter();
	writer.writeAscii("NARC", 4);
	writer.writeU16(0xfffe);
	writer.writeU16(0x0100);
	writer.writeU32(totalSize);
	writer.writeU16(headSize);
	writer.writeU16(sections.length);
	writer.writeBytes(new Uint8Array(sectionWriter.toArrayBuffer()));

	return writer.toArrayBuffer();
}

/** Builds a minimal valid NARC archive with flat file paths (e.g. "hello.bin"). */
export function buildMinimalNarc(files: MinimalNarcFile[]): ArrayBuffer {
	const fileContents = files.map((file) => toBytes(file.content));

	const gmifBody = new BinaryWriter();
	for (const content of fileContents) {
		gmifBody.writeBytes(content);
	}

	const btafBody = new BinaryWriter();
	btafBody.writeU16(files.length);
	btafBody.writeU16(0);
	let cursor = 0;
	for (const content of fileContents) {
		btafBody.writeU32(cursor);
		cursor += content.length;
		btafBody.writeU32(cursor);
	}

	const btnfBody = new BinaryWriter();
	btnfBody.writeU32(8);
	btnfBody.writeU16(0);
	btnfBody.writeU16(1);
	for (const file of files) {
		const name = file.path.includes("/") ? file.path.split("/").pop()! : file.path;
		btnfBody.writeU8(name.length);
		for (const ch of name) {
			btnfBody.writeU8(ch.charCodeAt(0));
		}
	}
	btnfBody.writeU8(0);

	const sections = [
		{ type: "BTAF", body: btafBody },
		{ type: "BTNF", body: btnfBody },
		{ type: "GMIF", body: gmifBody },
	];

	const sectionWriter = new BinaryWriter();
	for (const section of sections) {
		const bodyWriter = new BinaryWriter();
		bodyWriter.writeBytes(new Uint8Array(section.body.toArrayBuffer()));
		bodyWriter.padToAlignment(4);
		const body = new Uint8Array(bodyWriter.toArrayBuffer());
		sectionWriter.writeAscii(section.type, 4);
		sectionWriter.writeU32(8 + body.length);
		sectionWriter.writeBytes(body);
	}

	const headSize = 16;
	const totalSize = headSize + sectionWriter.size;
	const writer = new BinaryWriter();
	writer.writeAscii("NARC", 4);
	writer.writeU16(0xfffe);
	writer.writeU16(0x0100);
	writer.writeU32(totalSize);
	writer.writeU16(headSize);
	writer.writeU16(sections.length);
	writer.writeBytes(new Uint8Array(sectionWriter.toArrayBuffer()));

	return writer.toArrayBuffer();
}
