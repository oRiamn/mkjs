//
// largeSphereCollider.js
//--------------------
// Provides functions to detect collision against sets of triangles for swept ellipsoids and small rays (low cost, used for green shells).
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
// /formats/kcl.js
//

import { kcl } from "../formats/kcl";
import { courseScene } from "./scenes/courseScene";

type tri_lsc = {
	Vertices: [vec3, vec3, vec3];
	Normal: vec3;
	CollisionType: any;
}

export class lsc {

	static t: number = undefined;
	static colPlane: { Normal: any; } = undefined;
	static colPoint: vec3 = undefined;
	static emb: boolean = undefined;
	static edge: boolean = undefined;
	static colO: any = undefined;
	static planeNormal: any = undefined;

	static raycast(pos: vec3, dir: vec3, scn: courseScene, error: any, ignoreList: any): lscraycast { //used for shells, bananas and spammable items. Much faster than sphere sweep. Error used to avoid falling through really small seams between tris.
		var error = (error == null) ? 0 : error;
		lsc.t = 1;
		var tris = lsc._getTriList(pos, dir, scn.kcl);
		lsc.colPlane = null;
		lsc.colPoint = null; //can be calculated from t, but we calculate it anyway so why not include
		lsc.colO = null;

		lsc._rayVTris(pos, dir, tris, null, ignoreList, null, error);

		for (var i = 0; i < scn.colEnt.length; i++) {
			var c = scn.colEnt[i];
			var col = c.getCollision();

			if (vec3.distance(pos, c.pos) < c.colRad) {
				lsc._rayVTris(pos, dir, col.tris, col.mat, ignoreList, c, error, col.frame);
			}
		}

		/*
		for (var i=0; i<tris.length; i++) {
			//first, check if we intersect the plane within reasonable t.
			//only if this happens do we check if the point is in the triangle.
			//we would also only do sphere sweep if this happens.

			var tri = tris[i];

			if (ignoreList.indexOf(tri) != -1) continue;

			var planeConst = -vec3.dot(tri.Normal, tri.Vertices[0]);
			var dist = vec3.dot(tri.Normal, pos) + planeConst;
			var modDir = vec3.dot(tri.Normal, dir);
			if (dist < 0 || modDir == 0) continue; //can't collide with back side of polygons! also can't intersect plane with ray perpendicular to plane
			var newT = -dist/modDir;
			if (newT>0 && newT<t) {
				//we have a winner! check if the plane intersecion point is in the triangle.
				var pt = vec3.add([], pos, vec3.scale([], dir, newT))
				if (pointInTriangle(tri, pt, error)) {
					t = newT;
					colPlane = tri;
					colPoint = pt; //result!
				}
			}
		}
		*/

		if (lsc.colPlane != null) {
			return {
				t: lsc.t,
				plane: lsc.colPlane,
				colPoint: lsc.colPoint,
				object: lsc.colO,
				normal: lsc.colPlane.Normal
			}
		} else return null;
	}

	static sweepEllipse(pos: vec3, dir: vec3, scn: courseScene, eDimensions: vec3, ignoreList: any): {
        t: number,
        plane: any
        colPoint: vec3,
        normal: vec3,
        pNormal: any,
        embedded: boolean,
        object: lsc_taget
    } { //used for karts or things that need to occupy physical space.
		lsc.t = 1;

		var ed = vec3.divide([0, 0, 0], [1, 1, 1], eDimensions);

		var tris = lsc._getTriList(pos, dir, scn.kcl);

		var oPos = pos;
		var oDir = dir;

		var pos = vec3.divide([0, 0, 0], pos, eDimensions); //need to rescale position to move into ellipsoid space
		var dir = vec3.divide([0, 0, 0], dir, eDimensions);

		lsc.colPlane = null;
		lsc.colPoint = null; //can be calculated from t, but we calculate it anyway so why not include
		lsc.emb = false;
		lsc.edge = false;

		lsc._ellipseVTris(pos, dir, tris, eDimensions, ignoreList, true);

		for (var i = 0; i < scn.colEnt.length; i++) {
			var c = scn.colEnt[i];
			var col = c.getCollision();

			if (vec3.distance(oPos, c.pos) < c.colRad) {
				lsc._ellipseVTris(pos, dir, col.tris, mat4.mul(
					mat4.create(),
					mat4.scale(mat4.create(), mat4.create(), ed),
					col.mat
				), ignoreList, false, c);
			}
		}

		if (lsc.colPlane != null) {
			var norm = vec3.scale([0, 0, 0], dir, lsc.t)
			vec3.add(norm, pos, norm);
			vec3.sub(norm, norm, lsc.colPoint);

			if (Math.sqrt(vec3.dot(norm, norm)) < 0.98) lsc.emb = true;

			vec3.mul(lsc.colPoint, lsc.colPoint, eDimensions);

			return {
				t: lsc.t,
				plane: lsc.colPlane,
				colPoint: lsc.colPoint,
				normal: norm,
				pNormal: lsc.planeNormal,
				embedded: lsc.emb,
				object: lsc.colO
			}
		} else return null;
	}

	static pointInTriangle(tri: { Vertices?: any; }, point: vec3, error: number) { //barycentric check
		//compute direction vectors to the other verts and the point
		var v0 = vec3.sub([0, 0, 0], tri.Vertices[2], tri.Vertices[0]);
		var v1 = vec3.sub([0, 0, 0], tri.Vertices[1], tri.Vertices[0]);
		var v2 = vec3.sub([0, 0, 0], point, tri.Vertices[0]);

		//we need to find u and v across the two vectors v0 and v1 such that adding them will result in our point's position
		//where the unit length of both vectors v0 and v1 is 1, the sum of both u and v should not exceed 1 and neither should be negative

		var dot00 = vec3.dot(v0, v0); var dot01 = vec3.dot(v0, v1); var dot02 = vec3.dot(v0, v2);
		var dot11 = vec3.dot(v1, v1); var dot12 = vec3.dot(v1, v2);
		//dot11 and dot00 result in the square of the distance for v0 and v1

		var inverse = 1 / (dot00 * dot11 - dot01 * dot01);
		var u = (dot11 * dot02 - dot01 * dot12) * inverse;
		var v = (dot00 * dot12 - dot01 * dot02) * inverse;

		return (u >= -error && v >= -error && (u + v) < 1 + error);
	}

	static _rayVTris(pos: vec3, dir: vec3, tris: string | any[], mat: mat4, ignoreList: string | any[], targ: null, error: any, colFrame?: number) {
		for (var i = 0; i < tris.length; i++) {
			//first, check if we intersect the plane within reasonable t.
			//only if this happens do we check if the point is in the triangle.
			//we would also only do sphere sweep if this happens.
			var tri = tris[i];
			if (mat != null) {
				if (tri.colFrame === colFrame && tri.cache) {
					tri = tri.cache;
				} else {
					var oT = tri;
					tri = lsc._modTri(tris[i], mat);
					oT.cache = tri;
					oT.colFrame = colFrame;
				}
			}

			if (ignoreList.indexOf(tri) != -1) continue;

			var planeConst = -vec3.dot(tri.Normal, tri.Vertices[0]);
			var dist = vec3.dot(tri.Normal, pos) + planeConst;
			var modDir = vec3.dot(tri.Normal, dir);
			if (dist < 0 || modDir == 0) continue; //can't collide with back side of polygons! also can't intersect plane with ray perpendicular to plane
			var newT = -dist / modDir;
			if (newT > 0 && newT < lsc.t) {
				//we have a winner! check if the plane intersecion point is in the triangle.
				var pt = vec3.add([0, 0, 0], pos, vec3.scale([0, 0, 0], dir, newT))
				if (lsc.pointInTriangle(tri, pt, error)) {
					lsc.t = newT;
					lsc.colPlane = tri;
					lsc.colPoint = pt; //result!
					lsc.colO = targ;
				}
			}
		}
	}

	static _transformMat3Normal(out: vec3, a: vec3, m: mat4): vec3 {
		var x = a[0], y = a[1], z = a[2];
		out[0] = x * m[0] + y * m[4] + z * m[8];
		out[1] = x * m[1] + y * m[5] + z * m[9];
		out[2] = x * m[2] + y * m[6] + z * m[10];
		return out;
	}

	static _modTri(tri: tri_lsc, mat: mat4): tri_lsc {
		const Vertices: [vec3, vec3, vec3] = [
			vec3.transformMat4([0, 0, 0], tri.Vertices[0], mat),
			vec3.transformMat4([0, 0, 0], tri.Vertices[1], mat),
			vec3.transformMat4([0, 0, 0], tri.Vertices[2], mat),
		]

		const Normal = lsc._transformMat3Normal([0, 0, 0], tri.Normal, mat);
		vec3.normalize(Normal, Normal);
		const CollisionType = tri.CollisionType;
		return {
			Vertices,
			Normal,
			CollisionType
		};
	}

	static _scaleTri(tri: tri_lsc, eDim: vec3): tri_lsc {
		const Vertices: [vec3, vec3, vec3] = [
			vec3.divide([0, 0, 0], tri.Vertices[0], eDim),
			vec3.divide([0, 0, 0], tri.Vertices[1], eDim),
			vec3.divide([0, 0, 0], tri.Vertices[2], eDim),
		];

		const Normal = tri.Normal
		const CollisionType = tri.CollisionType;
		return {
			Vertices,
			Normal,
			CollisionType
		};
	}

	static _ellipseVTris(pos: vec3, dir: vec3, tris: tri_lsc[], mat: vec3 | mat4, ignoreList: tri_lsc[], eDims: boolean, targ?: any) {
		for (var i = 0; i < tris.length; i++) {
			//first, check if we intersect the plane within reasonable t.
			//only if this happens do we check if the point is in the triangle.
			//we would also only do sphere sweep if this happens.

			var oTri = tris[i];
			if (ignoreList.includes(oTri)) continue;

			var tri = (eDims) ? lsc._scaleTri(tris[i], mat as vec3) : lsc._modTri(tris[i], mat as mat4);
			var planeConst = -vec3.dot(tri.Normal, tri.Vertices[0]);
			var dist = vec3.dot(tri.Normal, pos) + planeConst;
			var modDir = vec3.dot(tri.Normal, dir);

			if (dist < 0) continue; //can't collide with back side of polygons! also can't intersect plane with ray perpendicular to plane

			var t0, t1, embedded = false;
			if (modDir == 0) {
				if (Math.abs(dist) < 1) {
					t0 = 0;
					t1 = 1;
					embedded = true;
				} else {
					t0 = 1000;
					t1 = 2000;
				}
			} else {
				t0 = (1 - dist) / modDir;
				t1 = ((-1) - dist) / modDir;
			}

			if (t0 > t1) { //make sure t0 is smallest value
				var temp = t1;
				t1 = t0;
				t0 = temp;
			}

			if (!(t0 > 1 || t1 < 0)) {
				//we will intersect this triangle's plane within this frame.
				//
				// Three things can happen for the earliest intersection: 
				// - sphere intersects plane of triangle (pt on plane projected from new position is inside triangle)
				// - sphere intersects edge of triangle
				// - sphere intersects point of triangle

				if (t0 < 0) { embedded = true; t0 = 0; }
				if (t1 > 1) t1 = 1;

				var newT = t0;

				//sphere intersects plane of triangle
				var pt: vec3 = [0, 0, 0];
				if (embedded) {
					vec3.sub(pt, pos, vec3.scale([0, 0, 0], tri.Normal, dist));
				} else {
					vec3.add(pt, pos, vec3.scale([0, 0, 0], dir, newT))
					vec3.sub(pt, pt, tri.Normal); //project new position onto plane along normal
				}
				if (lsc.pointInTriangle(tri, pt, 0) && newT < lsc.t) {
					lsc.t = newT;
					lsc.colPlane = oTri;
					lsc.colPoint = pt; //result!
					lsc.colO = targ;
					lsc.edge = false;
					lsc.emb = embedded;
					lsc.planeNormal = tri.Normal;
					continue;
				}

				//no inside intersection check vertices:
				for (var j = 0; j <= 2; j++) {
					var vert = vec3.sub([0, 0, 0], pos, tri.Vertices[j]);
					var root = lsc._getSmallestRoot(vec3.dot(dir, dir), 2 * vec3.dot(dir, vert), vec3.dot(vert, vert) - 1, lsc.t);
					if (root != null) {
						lsc.t = root;
						lsc.colPlane = oTri;
						lsc.colO = targ;
						lsc.colPoint = vec3.clone(tri.Vertices[j]); //result!
						lsc.planeNormal = tri.Normal;
						lsc.edge = false;
					}
				}

				//... and lines

				for (var j = 0; j <= 2; j++) {
					var vert = tri.Vertices[j];
					var nextV = tri.Vertices[(j + 1) % 3];

					var distVert = vec3.sub([0, 0, 0], vert, pos);
					var distLine = vec3.sub([0, 0, 0], nextV, vert);

					var edgeDist = vec3.dot(distLine, distLine);
					var edgeDotVelocity = vec3.dot(distLine, dir);
					var edgeDotVert = vec3.dot(distVert, distLine);

					var root = lsc._getSmallestRoot(
						edgeDist * (-1) * vec3.dot(dir, dir) + edgeDotVelocity * edgeDotVelocity,
						edgeDist * 2 * vec3.dot(dir, distVert) - 2 * edgeDotVelocity * edgeDotVert,
						edgeDist * (1 - vec3.dot(distVert, distVert)) + edgeDotVert * edgeDotVert,
						lsc.t
					);

					if (root != null) {
						var edgePos = (edgeDotVelocity * root - edgeDotVert) / edgeDist;

						if (edgePos >= 0 && edgePos <= 1) {
							lsc.t = root;
							lsc.colPlane = oTri;
							lsc.colO = targ;
							lsc.colPoint = vec3.add([0, 0, 0], vert, vec3.scale(distLine, distLine, edgePos)); //result!
							lsc.planeNormal = tri.Normal;
							lsc.edge = true;
						}
					}
				}

			}
		}
	}

	static _getSmallestRoot(a: number, b: number, c: number, upperLimit: number) {
		var det = (b * b) - 4 * (a * c);
		if (det < 0) return null; //no result :'(
		else {
			det = Math.sqrt(det);
			var root1 = ((-b) - det) / (2 * a)
			var root2 = ((-b) + det) / (2 * a)

			if (root1 > root2) { //ensure root1 is smallest
				var temp = root1;
				root1 = root2;
				root2 = temp;
			}

			if (root1 > 0 && root1 < upperLimit) {
				return root1;
			} else if (root2 > 0 && root2 < upperLimit) {
				return root2;
			} else {
				return null;
			}
		}
	}

	static _getTriList(pos: vec3, diff: vec3, kclO: kcl) { //gets tris from kcl around a line. currently only fetches from middle point of line, but should include multiple samples for large differences in future.
		var sample = vec3.add([0, 0, 0], pos, vec3.scale([0, 0, 0], diff, 0.5))
		return kclO.getPlanesAt(sample[0], sample[1], sample[2]);
	}

}