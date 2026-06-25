import { describe, expect, it } from "vitest";
import { sbnk } from "../../src/formats/sbnk";
import { BinaryWriter } from "../helpers/binary";
import { buildSdatBlock } from "../helpers/fixtures";
import { loadSdat, romExists } from "../helpers/rom";

describe("sbnk", () => {
	it("should load an empty SBNK bank", () => {
		const body = new BinaryWriter();
		body.writeZeros(32);
		body.writeU32(0);
		const file = buildSdatBlock("SBNK", body);
		const bank = new sbnk(file);
		expect(bank.instruments).toHaveLength(0);
	});
});

describe.skipIf(!romExists)("sbnk from ROM", () => {
	it("should load instrument banks from sound_data.sdat", () => {
		const banks = loadSdat().sections.$INFO[2];

		expect(banks[0].bank.instruments.length).toBe(93);
		expect(Math.max(...banks.map((entry) => entry.bank.instruments.length))).toBe(128);
	});
});
