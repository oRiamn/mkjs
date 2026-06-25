import { describe, expect, it } from "vitest";
import { nsbca } from "../../src/formats/nsbca";
import { nsbmd } from "../../src/formats/nsbmd";
import { nsbtp } from "../../src/formats/nsbtp";
import { loadLz77Narc, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("rom map objects", () => {
	it("should load every MapObj.carc asset", () => {
		const mapObj = loadLz77Narc("/data/Main/MapObj.carc");

		for (const path of mapObj.list()) {
			const file = mapObj.getFile(path);
			expect(file).not.toBeNull();
			expect(file!.byteLength).toBeGreaterThan(0);
		}
	});

	it("should load the item box model and animation used on tracks", () => {
		const mapObj = loadLz77Narc("/data/Main/MapObj.carc");
		const model = new nsbmd(mapObj.getFile("/itembox.nsbmd")!);
		const animation = new nsbca(mapObj.getFile("/itembox.nsbca")!);

		expect(model.modelData.names).toEqual(["itembox"]);
		expect(animation.animData.numObjects).toBe(1);
		expect(animation.speeds).toEqual([1, 0.5, 0.25]);
	});

	it("should load item texture pattern animations from MainRace", () => {
		const mainRace = loadLz77Narc("/data/MainRace.carc");
		const bomb = new nsbtp(mainRace.getFile("/Item/it_bomb.nsbtp")!);
		const frames = bomb.animData.objectData[0].data.objectData[0].frames;

		expect(bomb.animData.names).toEqual(["it_bomb"]);
		expect(frames).toHaveLength(2);
		expect(frames[0].texName).toBe("it_bomb.1");
		expect(frames[1].texName).toBe("it_bomb.2");
	});
});
