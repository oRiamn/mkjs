import { describe, expect, it } from "vitest";
import { ssar } from "../../src/formats/ssar";
import { loadSdat, romExists } from "../helpers/rom";

describe("ssar", () => {
	it("should reject invalid magic", () => {
		expect(() => new ssar(new ArrayBuffer(32))).toThrow(/SSAR invalid/);
	});
});

describe.skipIf(!romExists)("ssar from ROM", () => {
	it("should load the first sequence archive from sound_data.sdat", () => {
		const archive = loadSdat().sections.$INFO[1][0].arc;

		expect(archive.entries.length).toBeGreaterThan(500);
		expect(archive.entries[0].vol).toBeGreaterThan(0);
		expect(archive.entries[0].seq.data.length).toBeGreaterThan(0);
	});
});
