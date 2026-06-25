import { describe, expect, it } from "vitest";
import { nitro } from "../../src/formats/nitro";
import { BinaryWriter } from "../helpers/binary";
import { getRomFile, loadCourseCarc, romExists } from "../helpers/rom";

describe("nitro", () => {
	it("should read a Nitro file header", () => {
		const writer = new BinaryWriter();
		writer.writeAscii("BMD0", 4);
		writer.writeU32(0x12345678);
		writer.writeU32(0x500);
		writer.writeU16(0x18);
		writer.writeU16(2);
		writer.writeU32(0x100);
		writer.writeU32(0x200);

		const header = nitro.readHeader(new DataView(writer.toArrayBuffer()));
		expect(header.stamp).toBe("BMD0");
		expect(header.unknown1).toBe(0x12345678);
		expect(header.filesize).toBe(0x500);
		expect(header.headsize).toBe(0x18);
		expect(header.numSections).toBe(2);
		expect(header.sectionOffsets).toEqual([0x100, 0x200]);
	});

	it("should read ASCII characters through readChar", () => {
		const view = new DataView(new Uint8Array([0x52, 0x4c, 0x43, 0x4e]).buffer);
		expect(nitro.readChar(view, 0)).toBe("R");
		expect(nitro.readChar(view, 3)).toBe("N");
	});
});

describe.skipIf(!romExists)("nitro from ROM", () => {
	it("should parse real NCGR and NSBMD headers from the ROM", () => {
		const ncgrHeader = nitro.readHeader(new DataView(getRomFile("/data/Boot/dbgfont.NCGR")));
		const nsbmdHeader = nitro.readHeader(new DataView(loadCourseCarc().getFile("/course_model.nsbmd")!));

		expect(ncgrHeader.stamp).toBe("RGCN");
		expect(nsbmdHeader.stamp).toBe("BMD0");
		expect(ncgrHeader.filesize).toBeGreaterThan(1000);
		expect(nsbmdHeader.numSections).toBeGreaterThan(0);
	});
});
