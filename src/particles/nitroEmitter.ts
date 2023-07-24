//
// nitroEmitter.js
//--------------------
// Implemtents the generic nitro particle emitter.
// by riperiperi
//

import { spa, spa_particule } from "../formats/spa"
import { NitroParticle } from "./nitroParticle"
import { Kart } from "../entities/kart"

export type NitroEmitter_target = {
    pos: vec3;
    vel: vec3;
    mat: mat4;
}

export class NitroEmitter {
    _scene: Scene
    _targ: NitroEmitter_target
    _emitterID: number
    vector: vec3
    offset: vec3
    _pRes: spa
    _emitter: spa_particule
    attached: NitroEmitter_target
    pctParticle: number
    time: number
    dead: boolean
    curPrio: number
    doNotDelete: boolean
    pause: boolean
    _particleList: number[]
    constructor(scene: Scene, targ: NitroEmitter_target, emitterID: number, vector?: vec3, offset?: vec3) {

        this._scene = scene
        this._targ = targ
        this._emitterID = emitterID
        this.vector = vector
        this.offset = offset

        this._pRes = this._scene.gameRes.RaceEffect;
        this._emitter = (this._emitterID == -1) ? null : this._pRes.particles[this._emitterID];
        this.attached = this._targ; //an entity with pos and vel.

        if (this.vector == null) {
            this.vector = [0, 1, 0];
        }
        if (this.offset == null) {
            this.offset = [0, 0, 0];
        }

        this.pctParticle = 0;
        this.time = 0;
        this.dead = false;
        this.curPrio = 0;
        this.doNotDelete = (this._emitter == null);
        this.pause = false;

        this._particleList = [this._emitterID, -1, -1, -1];

    }
    setEmitter(emitterID: number, prio: number) {
        this._particleList[prio] = emitterID;
        if (this.curPrio <= prio) {
            //activate this emitter immediately.
            this.curPrio = prio;
            this.dead = false;
            this._emitter = this._pRes.particles[emitterID];
            this.time = 0;
        }
    }

    clearEmitter(prio: number) {
        //if (t.curPrio > prio) return; //this emitter cannot be unset
        if (prio == this.curPrio) {
            this._findNextEmitter();
        } else {
            this._particleList[prio] = -1;
        }
    }

    _findNextEmitter() {
        this._particleList[this.curPrio] = -1;
        var em = this.curPrio - 1;
        while (em >= 0) {
            if (this._particleList[em] != -1) {
                this.dead = false;
                this._emitter = this._pRes.particles[this._particleList[em]];
                this.time = 0;
                this.curPrio = em;
                return;
            }
            em--;
        }
        if (em == -1) {
            this.curPrio = 0;
            this._emitter = null;
            this.dead = true;
        }
        this.curPrio = em;
    }

    update(scene: Scene) {
        if (this._emitter == null || this.dead || this.pause) return;
        if ((this.time % (this._emitter.frequency)) == 0 && this.time >= this._emitter.delay) {
            //should we create new particles? fractional logic for doing this
            this.pctParticle += this._emitter.particleChance;
            while (this.pctParticle >= 1) {

                var attach = (this._emitter.flag & 0x8000) > 0;

                this.pctParticle -= 1;
                //create a new particle
                //TODO: make these transform with the target's world matrix
                var pos = vec3.create();
                //add offset
                vec3.add(pos, pos, this.offset);
                //add emitter properties
                vec3.add(pos, pos, this._emitter.position);
                var spread = vec3.clone([
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1
                ]);
                var spreadMode = (this._emitter.flag & 0xF);
                if (spreadMode == 2) {
                    spread[1] = 0; //spread is only in xz direction
                }
                vec3.normalize(spread, spread);
                if (spreadMode == 0) {
                    spread = [0, 0, 0];
                }
                vec3.scale(spread, spread, Math.random() * this._emitter.areaSpread * 2);
                vec3.add(pos, pos, spread);

                vec3.scale(pos, pos, 16);
                if (!attach) {
                    if (this._targ.mat != null) {
                        vec3.transformMat4(pos, pos, this._targ.mat);
                    } else {
                        vec3.add(pos, pos, this._targ.pos);
                    }
                }

                //inherit velocity
                var vel = (attach) ? vec3.create() : vec3.clone(this._targ.vel);
                vec3.scale(vel, vel, 1 / 32);

                var vector = vec3.clone(this.vector);
                if (!attach) {
                    if (this._targ.mat != null) {
                        //tranform our vector by the target matrix
                        var mat = this._targ.mat;
                        var org: vec3 = [0, 0, 0];
                        mat4.getTranslation(org, mat);
                        mat[12] = 0;
                        mat[13] = 0;
                        mat[14] = 0;

                        vec3.transformMat4(vector, vector, mat);

                        mat[12] = org[0];
                        mat[13] = org[1];
                        mat[14] = org[2];
                    }
                }
                vec3.normalize(vector, vector);
                vec3.add(vel, vel, vec3.scale([0, 0, 0], vector, this._emitter.velocity));

                var xz = vec3.clone([
                    Math.random() * 2 - 1,
                    0,
                    Math.random() * 2 - 1
                ]);
                vec3.normalize(xz, xz);
                vec3.scale(xz, xz, Math.random() * this._emitter.randomxz);
                vec3.add(vel, vel, xz);

                var rotVel = ((this._emitter.rotVelFrom + ((Math.random() * this._emitter.rotVelTo - this._emitter.rotVelFrom) | 0)) / 65535) * Math.PI * 2;
                var dir = ((this._emitter.flag & 0x2000) > 0) ? (Math.random() * Math.PI * 2) : 0;
                var duration = this._emitter.duration + this._emitter.duration * this._emitter.varDuration / 0xFF * (Math.random() * 2 - 1);
                var scaleMod = (this._emitter.varScale / 0xFF * (Math.random() * 2 - 1)) + 1;

                var scale: [number, number] = [
                    scaleMod * this._emitter.size,
                    scaleMod * this._emitter.size * this._emitter.aspect
                ];

                const s =  attach ? this.attached : null;
                var particle = new NitroParticle(scene, this._emitter, pos, vel, dir, rotVel, duration, scale, s);
                particle.ovel = (attach) ? vec3.create() : vec3.scale([0, 0, 0], this._targ.vel, 1 / 32);

                scene.particles.push(particle);
            }


            var pos = vec3.clone(this._targ.pos);

        }
        this.time++;

        if (this.time == this._emitter.emitterLifetime) {
            this.dead = true;
            if (!this.doNotDelete) scene.removeParticle(this);
            else {
                this._findNextEmitter();
            }
        }
    }

    draw(_view: mat4, _pMatrix: mat4, _gl: CustomWebGLRenderingContext) {

    }
}