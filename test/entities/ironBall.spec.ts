import { describe, expect, it } from "vitest";
import { Bound } from "../../src/entities/objDecor/Bound";
import { IRON_BALL_DEFAULT_DIAMETER, IronBall, ironBallTargetDiameter } from "../../src/entities/objDecor/IronBall";
import { MKDSCONST } from "../../src/engine/mkdsConst";
import { nkm } from "../../src/formats/nkm";
import { nsbmd } from "../../src/formats/nsbmd";
import { modelPolyLocalBounds, modelWorldYExtent } from "../../src/utils/modelLocalBounds";
import { loadCourseCarc, romExists } from "../helpers/rom";

function stubObji(overrides: Partial<nkm_section_OBJI> & Pick<nkm_section_OBJI, "ID">): nkm_section_OBJI {
	return {
		routeID: 65535,
		setting1: 0,
		setting2: 0,
		setting3: 0,
		setting4: 0,
		timeTrials: 0,
		nextOff: 0,
		scale: [1, 1, 1],
		pos: [0, 0, 0],
		angle: [0, 0, 0],
		...overrides,
	};
}

describe("ironBallTargetDiameter", () => {
	it("uses setting1 low word when set", () => {
		expect(ironBallTargetDiameter(stubObji({ ID: 0x01b0, setting1: 110 }))).toBe(110);
		expect(ironBallTargetDiameter(stubObji({ ID: 0x01b0, setting1: (3300 << 16) | 105 }))).toBe(105);
	});

	it("defaults static mounts (0x01b3) when setting1 is zero", () => {
		expect(ironBallTargetDiameter(stubObji({ ID: 0x01b3 }))).toBe(IRON_BALL_DEFAULT_DIAMETER);
	});

	it("leaves route balls without diameter unscaled", () => {
		expect(ironBallTargetDiameter(stubObji({ ID: 0x01b0 }))).toBe(0);
	});
});

describe.skipIf(!romExists)("IronBall pinball_course OBJI", () => {
	it("static mounts have setting1 zero in retail NKM", () => {
		const nkmData = new nkm(loadCourseCarc("pinball_course").getFile("/course_map.nkm")!);
		const staticMounts = nkmData.sections.OBJI.entries.filter((o) => o.ID === 0x01b3);
		expect(staticMounts.length).toBeGreaterThan(0);
		for (const obji of staticMounts) {
			expect(obji.setting1 & 0xffff).toBe(0);
			expect(ironBallTargetDiameter(obji)).toBe(IRON_BALL_DEFAULT_DIAMETER);
		}
	});

	it("static mounts use OBJI pos as ball center (no route bottom offset)", () => {
		const nkmData = new nkm(loadCourseCarc("pinball_course").getFile("/course_map.nkm")!);
		const obji = nkmData.sections.OBJI.entries.find((o) => o.ID === 0x01b3)!;
		const scene = { paths: [], nkm: nkmData, getRoute: () => [] } as Scene;
		const ball = new IronBall(obji, scene);

		const bmd = new nsbmd(loadCourseCarc("pinball_course").getFile("/MapObj/IronBall.nsbmd")!);
		const poly = bmd.modelData.objectData[0].polys.objectData[0];
		const bounds = modelPolyLocalBounds(poly.disp);
		const fit = IRON_BALL_DEFAULT_DIAMETER / (Math.max(bounds.width, bounds.height) * 16);
		const world = modelWorldYExtent(bounds.min[1], bounds.max[1], fit);

		ball.provideRes({ mdl: [{ bmd, getBoundingCollisionModel: () => ({ dat: [], scale: 1 }) } as never], other: [] });

		expect((ball as unknown as { _yOffset: number })._yOffset).toBe(0);
		expect(world.height / 2).toBeGreaterThan(50);
	});
});
