//
// cameraIngame.js
//--------------------
// The ingame camera that follows the kart from behind.
// by RHY3756547
//
// includes: main.js

import { Kart } from "../../entities/kart";

//
export class cameraIngame implements Camera{
    kart: Kart;
    targetShadowPos: vec3;
    mat: mat4;
    camOffset: vec3;
    lookAtOffset: vec3;
    camNormal: vec3;
    forwardNormal: vec3;
    camAngle: number;
    boostOff: number;
    view: CamView;

    constructor(kart: Kart) {
        this.kart = kart;
        this.targetShadowPos = [0, 0, 0]

        this.mat = mat4.create();

        this.camOffset = [0, 32, -48];
        this.lookAtOffset = [0, 16, 0]

        this.camNormal = [0, 1, 0];
        this.forwardNormal = null;
        this.camAngle = 0;
        this.boostOff = 0;
    }

    _tweenVec3(from: vec3, to: vec3) {
        from[0] += (to[0] - from[0]) * 0.075;
        from[1] += (to[1] - from[1]) * 0.075;
        from[2] += (to[2] - from[2]) * 0.075;
    }

    getView(_scene: Scene): CamView {
        var loop = this.kart.physBasis != null && this.kart.physBasis.loop;
        var basis = this._buildBasis();
        this._tweenVec3(this.camOffset, loop ? [0, 12, -57] : [0, 32, -48]);
        var camPos = vec3.transformMat4([0, 0, 0], this.camOffset, basis);
        var lookAtPos = vec3.transformMat4([0, 0, 0], this.lookAtOffset, basis);

        vec3.scale(camPos, camPos, 1 / 1024);
        vec3.scale(lookAtPos, lookAtPos, 1 / 1024);

        this.mat = mat4.lookAt(
            mat4.create(),
            camPos,
            lookAtPos,
            (this.kart.physBasis) ? this.camNormal : [0, 1, 0]
        );

        var kpos = vec3.clone(this.kart.pos);
        if (this.kart.drifting && !this.kart.driftLanded && this.kart.ylock > 0) kpos[1] -= this.kart.ylock;
        mat4.translate(this.mat, this.mat, vec3.scale([0, 0, 0], kpos, -1 / 1024));

        //interpolate visual normal roughly to target
        this._tweenVec3(this.camNormal, this.kart.kartNormal);
        vec3.normalize(this.camNormal, this.camNormal);

        if (loop) {
            var kartA = this.kart.physicalDir + this.kart.driftOff / 2;
            var forward = [Math.sin(kartA), 0, -Math.cos(kartA)] as vec3;
            vec3.transformMat4(forward, forward, this.kart.physBasis.mat);
            this.camAngle += this._dirDiff(Math.atan2(forward[0], -forward[2]), this.camAngle) * 0.075;
            if (this.forwardNormal == null) {
                this.forwardNormal = [Math.sin(this.camAngle), 0, -Math.cos(this.camAngle)];
            } else {
                this._tweenVec3(this.forwardNormal, forward);
            }
        } else {
            this.camAngle += this._dirDiff(this.kart.physicalDir + this.kart.driftOff / 2, this.camAngle) * 0.075;
            this.forwardNormal = null;
        }
        this.camAngle = this._fixDir(this.camAngle);

        this.boostOff += (((this.kart.boostNorm + this.kart.boostMT > 0) ? 5 : 0) - this.boostOff) * 0.075

        var p = mat4.perspective(mat4.create(), ((70 + this.boostOff) / 180) * Math.PI, gl.viewportWidth / gl.viewportHeight, 0.01, 10000.0);

        var dist = 192;
        this.targetShadowPos = vec3.add([0, 0, 0], this.kart.pos, [Math.sin(this.kart.angle) * dist, 0, -Math.cos(this.kart.angle) * dist])

        this.view = { p: p, mv: this.mat, pos: vec3.scale([0, 0, 0], vec3.transformMat4([0, 0, 0], [0, 0, 0], mat4.invert(mat4.create(), this.mat)), 1024) };

        return this.view;
    }

    _buildBasis(): mat4 {
        //order y, x, z
        var forward = (this.forwardNormal != null) ? this.forwardNormal : [
            Math.sin(this.camAngle),
            0,
            -Math.cos(this.camAngle)
        ] as vec3;
        var side = vec3.cross([0, 0, 0], forward, this.camNormal);
        /*
        if (kart.physBasis != null) {
            vec3.transformMat4(forward, forward, kart.physBasis.mat);
            vec3.transformMat4(side, side, kart.physBasis.mat);
        }
        */
        var basis = this._gramShmidt(this.camNormal, side, forward);
        var temp = basis[0];
        basis[0] = basis[1];
        basis[1] = temp; //todo: cleanup
        return [
            basis[0][0], basis[0][1], basis[0][2], 0,
            basis[1][0], basis[1][1], basis[1][2], 0,
            basis[2][0], basis[2][1], basis[2][2], 0,
            0, 0, 0, 1
        ]
    }

    _gramShmidt(v1: vec3, v2: vec3, v3: vec3) {
        var u1 = v1;
        var u2 = vec3.sub([0, 0, 0], v2, this._project(u1, v2));
        var u3 = vec3.sub([0, 0, 0], vec3.sub([0, 0, 0], v3, this._project(u1, v3)), this._project(u2, v3));
        return [vec3.normalize(u1, u1), vec3.normalize(u2, u2), vec3.normalize(u3, u3)]
    }

    _project(u: vec3, v: vec3) {
        return vec3.scale([0, 0, 0], u, (vec3.dot(u, v) / vec3.dot(u, u)))
    }

    _fixDir(dir: number) {
        return this._posMod(dir, Math.PI * 2);
    }

    _dirDiff(dir1: number, dir2: number) {
        var d = this._fixDir(dir1 - dir2);
        return (d > Math.PI) ? (-2 * Math.PI + d) : d;
    }

    _posMod(i: number, n: number) {
        return (i % n + n) % n;
    }

}