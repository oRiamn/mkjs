import { describe, expect, it } from "vitest";
import { getRomFile, loadRomFS, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("rom ghosts", () => {
	it("should store thirty-two built-in ghost replays", () => {
		const rom = loadRomFS();
		const ghostFiles = rom.list().filter((path) => /^\/data\/Ghost\/ghost_\d+\.bin$/.test(path));

		expect(ghostFiles).toHaveLength(32);
	});

	it("should keep a consistent NKDG payload size across built-in ghosts", () => {
		const rom = loadRomFS();

		for (const path of rom.list().filter((p) => /^\/data\/Ghost\/ghost_\d+\.bin$/.test(p))) {
			const ghost = getRomFile(path);
			const stamp = String.fromCharCode(...new Uint8Array(ghost.slice(0, 4)));

			expect(stamp).toBe("NKDG");
			expect(ghost.byteLength).toBe(4096);
		}
	});

	it("should expose course and time metadata in ghost headers", () => {
		const ghost = new DataView(getRomFile("/data/Ghost/ghost_000.bin"));

		expect(String.fromCharCode(...new Uint8Array(ghost.buffer, 0, 4))).toBe("NKDG");
		expect(ghost.getUint16(4, true)).toBe(20480);
		expect(ghost.getUint8(8)).toBe(1);
	});

	it("should keep staff ghost metadata separate from replay payloads", () => {
		const staffGhost = getRomFile("/data/Ghost/staff_ghost_time.bin");

		expect(staffGhost.byteLength).toBe(160);
	});
});
