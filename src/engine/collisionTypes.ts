//
// collisionTypes.js
//--------------------
// Includes enums for collision types.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
// /formats/kcl.js
//

import { MKDS_COLSOUNDS } from "./collisionSounds";


const ROAD = 0x00;
const OFFROADMAIN = 0x01;
const OFFROAD3 = 0x02;
const OFFROAD2 = 0x03;
const OFFROAD4 = 0x00;
const RAINBOWFALL = 0x04;
const OFFROAD1 = 0x05;
const SLIPPERY = 0x06;
const BOOST = 0x07;
const WALL = 0x08;
const WALL2 = 0x09;
const OOB = 0x0A; //voids out the player, returns to lakitu checkpoint.
const FALL = 0x0B; //like out of bounds, but you fall through it.
const JUMP_PAD = 0x0C; //jump pads on GBA levels
const STICKY = 0x0D; //sets gravity to negative this plane's normal until the object hasn't collided for a few frames.
const SMALLJUMP = 0x0E; //choco island 2's disaster ramps
const CANNON = 0x0F; //activates cannon. basic effect id is the cannon to use.
const WALLOOB = 0x10; //like a wall. normally only appears oob, but doesn't seem to have any special behaviour apart from maybe slowing you down more.
const FALLSWATER = 0x11; //points to falls object in nkm, gets motion parameters from there.
const BOOST2 = 0x12;
const LOOP = 0x13; //like sticky but with boost applied. see rainbow road ds
const SOUNDROAD = 0x14;
const RR_SPECIAL_WALL = 0x15;

const KNOCKBACK_DAMAGE = 0x1F;

const GROUP_ROAD = [
	ROAD,
	OFFROAD1,
	OFFROAD2,
	OFFROAD3,
	OFFROAD4,
	SLIPPERY,
	BOOST,
	JUMP_PAD,
	STICKY,
	SMALLJUMP,
	FALLSWATER,
	BOOST2,
	LOOP,
	SOUNDROAD,
	OOB,
	OFFROADMAIN
]

const GROUP_SOLID = [
	ROAD,
	OFFROAD1,
	OFFROAD2,
	OFFROAD3,
	OFFROAD4,
	SLIPPERY,
	BOOST,
	JUMP_PAD,
	STICKY,
	SMALLJUMP,
	FALLSWATER,
	BOOST2,
	LOOP,
	SOUNDROAD,
	OOB,
	OFFROADMAIN,
	WALL,
	WALL2,
	WALLOOB,
	RR_SPECIAL_WALL,
	KNOCKBACK_DAMAGE
]

const GROUP_WALL = [
	WALL,
	WALL2,
	WALLOOB,
	RR_SPECIAL_WALL,
	KNOCKBACK_DAMAGE
]

const GROUP_BOOST = [
	BOOST,
	BOOST2,
	LOOP
]

const GROUP_OOB = [
	OOB,
	FALL
]

const PHYS_MAP = new Array(31);
PHYS_MAP[ROAD] = 0;
PHYS_MAP[OFFROAD3] = 2;
PHYS_MAP[OFFROAD2] = 3;
PHYS_MAP[OFFROAD1] = 4;
PHYS_MAP[OFFROADMAIN] = 5;
PHYS_MAP[SLIPPERY] = 6;
PHYS_MAP[BOOST] = 8;
PHYS_MAP[BOOST2] = 8;
PHYS_MAP[FALLSWATER] = 10;
PHYS_MAP[LOOP] = 11;

//collision sound handlers
//26 is blue water, 30 is white
//28 and 15 might be sand/dirt 

var waterRoad = {
	drift: MKDS_COLSOUNDS.DRIFT_WATER,
	brake: MKDS_COLSOUNDS.BRAKE_WATER,
	land: MKDS_COLSOUNDS.LAND_WATER,
	drive: MKDS_COLSOUNDS.DRIVE_WATER,
	particle: 30
};

const SOUNDMAP = {
	0x00: //road
		[
			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{ drift: MKDS_COLSOUNDS.DRIFT_SAND, brake: MKDS_COLSOUNDS.BRAKE_SAND, land: MKDS_COLSOUNDS.LAND_SAND, drive: MKDS_COLSOUNDS.DRIVE_SAND },
			{ drift: MKDS_COLSOUNDS.DRIFT_STONE, brake: MKDS_COLSOUNDS.BRAKE_STONE, land: MKDS_COLSOUNDS.LAND_ASPHALT, drive: MKDS_COLSOUNDS.DRIVE_STONE },
			{ drift: MKDS_COLSOUNDS.DRIFT_CONCRETE, brake: MKDS_COLSOUNDS.BRAKE_CONCRETE, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{ drift: MKDS_COLSOUNDS.DRIFT_BOARD, brake: MKDS_COLSOUNDS.BRAKE_BOARD, land: MKDS_COLSOUNDS.LAND_ASPHALT },

			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_SNOW }, //snow?

			{ drift: MKDS_COLSOUNDS.DRIFT_METALGAUZE, brake: MKDS_COLSOUNDS.BRAKE_METALGAUZE, land: MKDS_COLSOUNDS.LAND_METALGAUZE },
			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_ASPHALT },
		],

	0x01: //road 2 the roadening
		[
			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{ drift: MKDS_COLSOUNDS.DRIFT_WATER, brake: MKDS_COLSOUNDS.BRAKE_WATER, land: MKDS_COLSOUNDS.LAND_WATERDEEP, drive: MKDS_COLSOUNDS.DRIVE_WATER, particle: 30 },
			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{},
			{},
			{}
		],

	0x02: //road 3
		[
			{ drift: MKDS_COLSOUNDS.DRIFT_SAND, brake: MKDS_COLSOUNDS.BRAKE_SAND, land: MKDS_COLSOUNDS.LAND_SAND, drive: MKDS_COLSOUNDS.DRIVE_SAND },
			waterRoad,

			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_SNOW }, //snow

			{ drift: MKDS_COLSOUNDS.DRIFT_SAND, brake: MKDS_COLSOUNDS.BRAKE_SAND, land: MKDS_COLSOUNDS.LAND_SAND, drive: MKDS_COLSOUNDS.DRIVE_SAND },
			{},
			{},
			{},
			{}
		],

	0x03: //road 4
		[
			{ drift: MKDS_COLSOUNDS.DRIFT_SAND, brake: MKDS_COLSOUNDS.BRAKE_SAND, land: MKDS_COLSOUNDS.LAND_SAND, drive: MKDS_COLSOUNDS.DRIVE_SAND, particle: 28 },
			{ drift: MKDS_COLSOUNDS.DRIFT_DIRT, brake: MKDS_COLSOUNDS.BRAKE_DIRT, land: MKDS_COLSOUNDS.LAND_DIRT, drive: MKDS_COLSOUNDS.DRIVE_DIRT, particle: 15 },

			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_GRASS, drive: MKDS_COLSOUNDS.DRIVE_GRASS, particle: 32 },

			{ drift: MKDS_COLSOUNDS.DRIFT_SAND, brake: MKDS_COLSOUNDS.BRAKE_SAND, land: MKDS_COLSOUNDS.LAND_SAND, drive: MKDS_COLSOUNDS.DRIVE_SAND, particle: 40 }, //sky garden cloud
			{ drift: MKDS_COLSOUNDS.DRIFT_SAND, brake: MKDS_COLSOUNDS.BRAKE_SAND, land: MKDS_COLSOUNDS.LAND_SAND, drive: MKDS_COLSOUNDS.DRIVE_SAND, particle: 28 },
			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_SNOW, particle: 112 }, //snow
			{},
			{}
		],

	0x05: //road 5
		[
			{ drift: MKDS_COLSOUNDS.DRIFT_SAND, brake: MKDS_COLSOUNDS.BRAKE_SAND, land: MKDS_COLSOUNDS.LAND_SAND, drive: MKDS_COLSOUNDS.DRIVE_SAND, particle: 28 },
			{ drift: MKDS_COLSOUNDS.DRIFT_DIRT, brake: MKDS_COLSOUNDS.BRAKE_DIRT, land: MKDS_COLSOUNDS.LAND_DIRT, drive: MKDS_COLSOUNDS.DRIVE_DIRT, particle: 15 },

			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_GRASS, drive: MKDS_COLSOUNDS.DRIVE_GRASS, particle: 32 },

			{ drift: MKDS_COLSOUNDS.DRIFT_SAND, brake: MKDS_COLSOUNDS.BRAKE_SAND, land: MKDS_COLSOUNDS.LAND_SAND, drive: MKDS_COLSOUNDS.DRIVE_SAND, particle: 28 },
			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_GRASS, drive: MKDS_COLSOUNDS.DRIVE_GRASS, particle: 32 },
			{},
			{},
			{}
		],

	0x06: //slippery
		[
			{ drift: MKDS_COLSOUNDS.DRIFT_ICE, brake: MKDS_COLSOUNDS.BRAKE_ICE, land: MKDS_COLSOUNDS.LAND_ICE },
			{ drift: MKDS_COLSOUNDS.DRIFT_MARSH, brake: MKDS_COLSOUNDS.BRAKE_MARSH, land: MKDS_COLSOUNDS.LAND_MARSH, drive: MKDS_COLSOUNDS.DRIVE_MARSH, particle: 24 },
			{},
			{},
			{},
			{},
			{},
			{}
		],

	0x07: //bo0st
		[
			{ drift: MKDS_COLSOUNDS.BRAKE_PLASTIC, brake: MKDS_COLSOUNDS.BRAKE_PLASTIC, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{ drift: MKDS_COLSOUNDS.BRAKE_PLASTIC, brake: MKDS_COLSOUNDS.BRAKE_PLASTIC, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{},
			{},
			{},
			{},
			{},
			{}
		],

	0x08: //wall
		[//placeholders
			{ hit: MKDS_COLSOUNDS.HIT_CONCRETE },
			{ hit: MKDS_COLSOUNDS.HIT_CLIFF },
			{ hit: MKDS_COLSOUNDS.HIT_SIGN }, //cliff
			{ hit: MKDS_COLSOUNDS.HIT_WOOD },
			{ hit: MKDS_COLSOUNDS.HIT_BUSH },
			{},
			{ hit: MKDS_COLSOUNDS.HIT_JELLY },
			{ hit: MKDS_COLSOUNDS.HIT_ICE },
		],

	0x09: //wall 2
		[
			{ hit: MKDS_COLSOUNDS.HIT_CONCRETE },
			{ hit: MKDS_COLSOUNDS.HIT_STONE },
			{ hit: MKDS_COLSOUNDS.HIT_METAL },
			{ hit: MKDS_COLSOUNDS.HIT_WOOD },
			{ hit: MKDS_COLSOUNDS.HIT_BUSH },
			{},
			{ hit: MKDS_COLSOUNDS.HIT_JELLY },
			{ hit: MKDS_COLSOUNDS.HIT_ICE },
		],

	0x10: //wall oob
		[
			{ hit: MKDS_COLSOUNDS.HIT_CONCRETE },
			{},
			{},
			{},
			{},
			{},
			{},
			{},
		],

	0x15: //wall with sound effect
		[
			{ hit: MKDS_COLSOUNDS.HIT_CONCRETE },
			{ hit: MKDS_COLSOUNDS.HIT_STONE },
			{ hit: MKDS_COLSOUNDS.HIT_RAINBOW }, //only diff i think
			{ hit: MKDS_COLSOUNDS.HIT_WOOD },
			{ hit: MKDS_COLSOUNDS.HIT_BUSH },
			{},
			{ hit: MKDS_COLSOUNDS.HIT_JELLY },
			{ hit: MKDS_COLSOUNDS.HIT_ICE },
		],

	0x11: [ //yoshi falls water
		waterRoad,
		waterRoad,
		waterRoad,
		waterRoad,
		waterRoad,
		waterRoad,
		waterRoad,
		waterRoad
	],

	0x12: //boost
		[
			{ drift: MKDS_COLSOUNDS.BRAKE_PLASTIC, brake: MKDS_COLSOUNDS.BRAKE_PLASTIC, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{},
			{},
			{},
			{},
			{},
			{},
			{}
		],

	0x13: //looping
		[
			{ drift: MKDS_COLSOUNDS.DRIFT_ASPHALT, brake: MKDS_COLSOUNDS.BRAKE, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{ drift: MKDS_COLSOUNDS.DRIFT_RAINBOW, brake: MKDS_COLSOUNDS.BRAKE_RAINBOW, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{},
			{},
			{},
			{},
			{},
			{}
		],

	0x14: //road with sfx
		[
			{},
			{ drift: MKDS_COLSOUNDS.DRIFT_CARPET, brake: MKDS_COLSOUNDS.BRAKE_CARPET, land: MKDS_COLSOUNDS.LAND_CARPET, drive: MKDS_COLSOUNDS.DRIVE_CARPET },
			{ drift: MKDS_COLSOUNDS.DRIFT_RAINBOW, brake: MKDS_COLSOUNDS.BRAKE_RAINBOW, land: MKDS_COLSOUNDS.LAND_ASPHALT },
			{},
			{}, //stairs
			{},
			{},
			{}
		]
}





export const MKDS_COLTYPE = {
	ROAD,
	OFFROADMAIN,
	OFFROAD3,
	OFFROAD2,
	RAINBOWFALL,
	OFFROAD1,
	SLIPPERY,
	BOOST,
	WALL,
	WALL2,
	OOB,
	FALL,
	JUMP_PAD,
	STICKY,
	SMALLJUMP,
	CANNON,
	WALLOOB,
	FALLSWATER,
	BOOST2,
	LOOP,
	SOUNDROAD,
	RR_SPECIAL_WALL,
	KNOCKBACK_DAMAGE,
	GROUP_ROAD,
	GROUP_SOLID,
	GROUP_WALL,
	GROUP_BOOST,
	GROUP_OOB,
	PHYS_MAP,
	SOUNDMAP
}
