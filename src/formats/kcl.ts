//
// kcl.js
//--------------------
// Loads kcl files and provides a variety of functions for accessing and using the data.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
//
type kcl_cube = {
	leaf: true,
	tris: number[],
	realTris: kcl_plane[]
} | {
	leaf: false,
	items: kcl_cube[]
}


export type kcl_plane = {
	Len: number,
	Vertices: [vec3, vec3, vec3],
	Normal: vec3,
	NormalA: vec3,
	NormalB: vec3,
	NormalC: vec3,
	CollisionType: number,
}

export class kcl {
	input: MKJSDataInput;
	mkwii: boolean;
	vertexOffset: number;
	normalOffset: number;
	planeOffset: number;
	octreeOffset: number;
	unknown1: number;
	topLeftVec: vec3;
	xMask: number;
	yMask: number;
	zMask: number;
	coordShift: number;
	yShift: number;
	zShift: number;
	unknown2: number;
	trisMapped: number;
	planes: kcl_plane[];
	octree: kcl_cube[];
	end: boolean;
	mkwiiMode: boolean;
	sf: number;
	mouseX: number;
	mouseY: number;
	offx: number;
	offz: number;
	loaded: boolean;
	Fixed32Point: number;
	constructor(input: MKJSDataInput, mkwii: boolean) {
		//todo, support versions for other games (MKWii etc)

		this.input = input;
		this.mkwii = mkwii;

		this.vertexOffset = undefined;
		this.normalOffset = undefined;
		this.planeOffset = undefined;
		this.octreeOffset = undefined;
		this.unknown1 = undefined;
		this.topLeftVec = undefined;
		this.xMask = undefined;
		this.yMask = undefined;
		this.zMask = undefined;
		this.coordShift = undefined;
		this.yShift = undefined;
		this.zShift = undefined;
		this.unknown2 = undefined;
		this.trisMapped = 0; //decoded data
		this.planes = undefined;
		this.octree = undefined;
		this.end = undefined;
		this.mkwiiMode = undefined;//little endian for ds, big endian for wii

		this.sf = undefined;
		this.mouseX = 0;
		this.mouseY = 0;
		this.offx = undefined;
		this.offz = undefined;
		this.loaded = false; //for testing
		this.Fixed32Point = 4096;

		if (this.input != null) {
			//handle input, load kcl from data
			if (typeof this.input == "string") {
				var xml = new XMLHttpRequest();
				xml.responseType = "arraybuffer";
				xml.open("GET", this.input, true);
				xml.onload = () => {
					this.load(xml.response, false);
				}
				xml.send();
			} else {
				this.load(this.input, this.mkwii);
			}
		}
	}

	load(buffer: MKJSDataInput, mkwii: boolean): void {
		var mkwii = mkwii;
		if (mkwii == null) mkwii = false;
		this.end = !mkwii;
		this.mkwiiMode = mkwii;
		var time = Date.now();
		//loads kcl from an array buffer.
		var view = new DataView(buffer);
		this.vertexOffset = view.getUint32(0x00, this.end);
		this.normalOffset = view.getUint32(0x04, this.end);
		this.planeOffset = view.getUint32(0x08, this.end);
		this.octreeOffset = view.getUint32(0x0C, this.end);
		this.unknown1 = this._readBigDec(view, 0x10, mkwii);
		var vec = vec3.create();
		vec[0] = this._readBigDec(view, 0x14, mkwii);
		vec[1] = this._readBigDec(view, 0x18, mkwii);
		vec[2] = this._readBigDec(view, 0x1C, mkwii);
		this.topLeftVec = vec;
		this.xMask = view.getUint32(0x20, this.end);
		this.yMask = view.getUint32(0x24, this.end);
		this.zMask = view.getUint32(0x28, this.end);
		this.coordShift = view.getUint32(0x2C, this.end);
		this.yShift = view.getUint32(0x30, this.end);
		this.zShift = view.getUint32(0x34, this.end);
		this.unknown2 = this._readBigDec(view, 0x38, mkwii);

		//read planes, there should be as many as there is 16 byte spaces between planeOffset+0x10 and octreeOffset
		let offset = this.planeOffset + 0x10;
		this.planes = [null]; //0 index is empty
		var minx = 0, maxx = 0, minz = 0, maxz = 0;
		while (offset < this.octreeOffset) {
			const p = this._readPlane(view, offset);
			this.planes.push(p);
			offset += 0x10;
			var vert = this.planes[this.planes.length - 1].Vertices[0];
			if (vert[0] < minx) minx = vert[0];
			if (vert[0] > maxx) maxx = vert[0];
			if (vert[2] < minz) minz = vert[2];
			if (vert[2] > maxz) maxz = vert[2];
		}

		this.octree = []

		var rootNodes = ((~this.xMask >> this.coordShift) + 1) * ((~this.yMask >> this.coordShift) + 1) * ((~this.zMask >> this.coordShift) + 1);

		for (var i = 0; i < rootNodes; i++) {
			var off = this.octreeOffset + i * 4;
			this.octree.push(this._decodeCube(this.octreeOffset, off, view));
		}
		this.loaded = true;
		//alert("process took "+(Date.now()-time)+"ms");
	}

	getPlanesAt(x: number, y: number, z: number): kcl_plane[] {
		x -= this.topLeftVec[0];
		y -= this.topLeftVec[1];
		z -= this.topLeftVec[2];
		if (x < 0 || y < 0 || z < 0) {
			return []; //no collision
		}
		else {
			x = Math.floor(x);
			y = Math.floor(y);
			z = Math.floor(z);
			if ((x & this.xMask) > 0 || (y & this.yMask) > 0 || (z & this.zMask) > 0) return []; //no collision

			var index = (x >> this.coordShift) | ((y >> this.coordShift) << this.yShift) | ((z >> this.coordShift) << this.zShift)
			return this._traverseOctree(this.octree[index], x, y, z, this.coordShift - 1);
		}
	}

	_readBigDec(view: DataView, off: number, mkwii: boolean): number {
		if (mkwii) return view.getFloat32(off);
		else return view.getInt32(off, this.end) / this.Fixed32Point;
	}

	_traverseOctree(node: kcl_cube, x: number, y: number, z: number, shift: number): kcl_plane[] {
		if (node.leaf === false) {
			//otherwise we're a node! find next index and traverse
			var index = ((x >> shift) & 1) | (((y >> shift) & 1) << 1) | (((z >> shift) & 1) << 2);
			return this._traverseOctree(node.items[index], x, y, z, shift - 1);
		}
		else {
			return node.realTris;
		}

	}

	_decodeCube(baseoff: number, off: number, view: DataView): kcl_cube {
		var data = view.getUint32(off, this.end);
		var off2 = baseoff + (data & 0x7FFFFFFF);
		if (off2 >= view.byteLength) {
			return {
				leaf: true,
				tris: [],
				realTris: []
			}
		}
		if (data & 0x80000000) { //is a leaf.
			off2 += 2;
			var tris = [];
			var realTris = [];
			while (true) {
				var read = view.getUint16(off2, this.end);
				if (read == 0) break; //zero terminated
				tris.push(read);
				realTris.push(this.planes[read]);
				this.trisMapped += 1;
				off2 += 2;
			}
			return {
				leaf: true,
				tris: tris,
				realTris: realTris
			}
		} else { //contains 8 more cubes
			var cubes = [];
			var boff = off2;
			for (var i = 0; i < 8; i++) {
				cubes.push(this._decodeCube(boff, off2, view));
				off2 += 4;
			}
			return {
				leaf: false,
				items: cubes
			}
		}
	}

	_readPlane(view: DataView, offset: number): kcl_plane {
		const Len = this._readBigDec(view, offset, this.mkwiiMode);

		const Normal = this._readNormal(view.getUint16(offset + 0x6, this.end), view);
		const NormalA = this._readNormal(view.getUint16(offset + 0x8, this.end), view);
		const NormalB = this._readNormal(view.getUint16(offset + 0xA, this.end), view);
		const NormalC = this._readNormal(view.getUint16(offset + 0xC, this.end), view);
		const CollisionType = view.getUint16(offset + 0xE, this.end);


		var crossA = vec3.cross(vec3.create(), NormalA, Normal);
		var crossB = vec3.cross(vec3.create(), NormalB, Normal);

		const v0 = this._readVert(view.getUint16(offset + 0x4, this.end), view);


		const Vertices: [vec3, vec3, vec3] = [
			v0,
			vec3.scaleAndAdd(vec3.create(), v0, crossB, (Len / vec3.dot(crossB, NormalC))),
			vec3.scaleAndAdd(vec3.create(), v0, crossA, (Len / vec3.dot(crossA, NormalC)))

		];

		return {
			Len,
			Vertices,
			Normal,
			NormalA,
			NormalB,
			NormalC,
			CollisionType,
		};
	}

	_readVert(num: number, view: DataView): vec3 {
		var vec = vec3.create();
		var loc = this.vertexOffset + num * 0xC;
		vec[0] = this._readBigDec(view, loc, this.mkwiiMode);
		vec[1] = this._readBigDec(view, loc + 0x4, this.mkwiiMode);
		vec[2] = this._readBigDec(view, loc + 0x8, this.mkwiiMode);
		return vec;
	}

	_readNormal(num: number, view: DataView): vec3 {
		var mkwii = this.mkwiiMode;
		var vec = vec3.create();
		if (mkwii) {
			var loc = this.normalOffset + num * 0xC;
			vec[0] = view.getFloat32(loc);
			vec[1] = view.getFloat32(loc + 0x4);
			vec[2] = view.getFloat32(loc + 0x8);
		} else {
			var loc = this.normalOffset + num * 0x6;
			vec[0] = view.getInt16(loc, this.end) / 4096; //fixed point 
			vec[1] = view.getInt16(loc + 0x2, this.end) / 4096;
			vec[2] = view.getInt16(loc + 0x4, this.end) / 4096;
		}
		return vec;
	}
}