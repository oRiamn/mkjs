//
// controlRaceCPU.js
//--------------------
// Provides AI control for default races
// by RHY3756547
//
// includes: main.js
//
import { Kart } from "../../entities/kart";
import { nkm, nkm_Section, nkm_section_CPAT, nkm_section_EPOI, nkm_section_MEPA, nkm_section_MEPO } from "../../formats/nkm";


type controlRaceCPU_path = nkm_section_CPAT | nkm_section_MEPA;
type controlRaceCPU_point = nkm_section_EPOI | nkm_section_MEPO;

export class controlRaceCPU implements Controls {
	local: boolean;
	kart: Kart;
	battleMode: boolean;
	paths: controlRaceCPU_path[];
	points: controlRaceCPU_point[];
	ePath: controlRaceCPU_path;
	ePoiInd: number;
	ePoi: controlRaceCPU_point;
	posOffset: vec3;
	destOff: vec3;
	offTrans: number;
	destNorm: vec3;
	destConst: number;
	destPoint: vec3;
	item: boolean;

	constructor(nkm: nkm) {
		
		this.local = false;
		this.kart = null;
		this.battleMode = (nkm.sections["EPAT"] == null);

		this.paths = [];
		this.points = [];

		let aPath: nkm_Section["MEPA"] | nkm_Section["EPAT"];
		let aPoint: nkm_Section["MEPO"] | nkm_Section["EPOI"];

		if (this.battleMode) { //MEEPO!!
			aPath = nkm.sections["MEPA"];
			aPoint = nkm.sections["MEPO"];
		} else {
			aPath = nkm.sections["EPAT"];
			aPoint = nkm.sections["EPOI"];
		}


		this.points = aPoint.entries;
		this.paths = aPath.entries;

		this.ePath = this.paths[0]
		this.ePoiInd = this.ePath.startInd;
		this.ePoi = this.points[this.ePath.startInd];

		this.posOffset = [0, 0, 0];
		this.destOff = [0, 0, 0];
		this.offTrans = 0;
		this.chooseNewOff();

		this.destNorm = null;
		this.destConst = null;
		this.destPoint = null;

		this.item = false;
	}


	setKart(k: Kart) {
		this.kart = k;
		this.calcDestNorm();
	}

	fetchInput() {
		//basically as a cpu, we're really dumb and need a constant supply of points to drive to.
		//battle mode AI is a lot more complex, but since we're only going in one direction it can be kept simple.

		const item = this.kart.local && !!(window as any).keysArray[65];
		var accel = true; //currently always driving forward. should change for sharp turns and when we get stuck on a wall 
		//(drive in direction of wall? we may need to reverse, "if stuck for too long we can just call lakitu and the players won't even notice" - Nintendo)

		var dist = vec3.dot(this.destNorm, this.kart.pos) + this.destConst;
		if (dist < this.ePoi.pointSize) this.advancePoint();
		// if (this.ePath.loop) debugger;

		this.destPoint = vec3.add([0, 0, 0], this.ePoi.pos, vec3.scale([0, 0, 0], vec3.lerp([0, 0, 0], this.posOffset, this.destOff, this.offTrans), this.ePoi.pointSize));
		var dirToPt = Math.atan2(this.destPoint[0] - this.kart.pos[0], this.kart.pos[2] - this.destPoint[2]);

		var physDir = this.kart.physicalDir;
		if (this.kart.physBasis) {
			if (this.kart.physBasis.loop) {
				return {
					accel: true, //x
					decel: false, //z
					drift: false, //s
					item, //a

					//-1 to 1, intensity.
					turn: 0,
					airTurn: 0 //air excitebike turn, doesn't really have much function
				};
			}
			var forward = [
				Math.sin(physDir),
				0,
				-Math.cos(physDir)
			] as vec3;

			vec3.transformMat4(forward, forward, this.kart.physBasis.mat);
			var physDir = Math.atan2(forward[0], -forward[2]);
		}
		var diff = this.dirDiff(dirToPt, physDir);
		var turn = Math.min(Math.max(-1, (diff * 3)), 1);

		this.offTrans += 1 / 240;

		if (this.offTrans >= 1) this.chooseNewOff();
		this.item = !this.item;

		return {
			accel: accel, //x
			decel: false, //z
			drift: false, //s
			item, //a

			//-1 to 1, intensity.
			turn: turn,
			airTurn: 0 //air excitebike turn, doesn't really have much function
		};
	}

	chooseNewOff() {
		this.posOffset = this.destOff;
		var ang = Math.random() * Math.PI * 2;
		var strength = Math.random();
		this.destOff = [Math.sin(ang) * strength, 0, Math.cos(ang) * strength];
		this.offTrans = 0;
	}

	calcDestNorm() {
		var norm = vec3.sub([0, 0, 0], this.kart.pos, this.ePoi.pos);
		vec3.normalize(norm, norm);

		this.destNorm = norm;
		this.destConst = -vec3.dot(this.ePoi.pos, norm)

	}

	setRouteID(routeID: number) {
		this.ePoiInd = routeID - 1
		this.advancePoint();
	}

	advancePoint() {
		if (++this.ePoiInd < this.ePath.startInd + this.ePath.pathLen) {
			//next within this path
			this.ePoi = this.points[this.ePoiInd];
		} else {
			//advance to one of next possible paths

			if (this.battleMode) {
				var loc = (Math.random() > 0.5 && this.ePath.source.length > 0) ? this.ePath.source : this.ePath.dest;
				var pathInd = loc[Math.floor(Math.random() * loc.length)];
				this.ePoiInd = pathInd;
				var pt = this.points[this.ePoiInd];
				if (pt != null) {
					this.ePoi = pt;
					this.recomputePath();
				}
			} else {
				var pathInd = this.ePath.dest[Math.floor(Math.random() * this.ePath.dest.length)];
				this.ePath = this.paths[pathInd];
				this.ePoi = this.points[this.ePath.startInd];
				this.ePoiInd = this.ePath.startInd;
			}
		}
		this.calcDestNorm();
	}

	recomputePath() { //use if point is set by anything but the path system, eg. respawn
		for (var i = 0; i < this.paths.length; i++) {
			var rel = (this.ePoiInd - this.paths[i].startInd);
			if (rel >= 0 && rel < this.paths[i].pathLen) {
				this.ePath = this.paths[i];
			}
		}
	}

	fixDir(dir: number) {
		return this.posMod(dir, Math.PI * 2);
	}

	dirDiff(dir1: number, dir2: number) {
		var d = this.fixDir(dir1 - dir2);
		return (d > Math.PI) ? (-2 * Math.PI + d) : d;
	}

	posMod(i: number, n: number) {
		return (i % n + n) % n;
	}
}