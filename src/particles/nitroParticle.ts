//
// nitroParticle.js
//--------------------
// Implements a generic nitro particle. Currently positioned and updated in software for debug
// simplicity - but should be moved to vertex shader in future.
// by riperiperi
//

import { spa_particule } from "../formats/spa";
import { nitroRender } from "../render/nitroRender";
import { nitroShaders_shadowShader } from "../render/nitroShaders";
import { NitroEmitter_target } from "./nitroEmitter";

export class NitroParticle {
    _scene: Scene;
    pos: vec3;
    vel: vec3;
    dir: number;
    dirVel: number;
    duration: number;
    scale: [number, number];
    attached: NitroEmitter_target;
    time: number;
    emitter: spa_particule;
    aScale: number;
    baseColor: vec4;
    aColor: vec4;
    frame: number;
    _MAT3I: mat3;
    _MAT4I: mat4;

    ovel: vec3; // in nitroEmitter

    constructor(scene: Scene, emitter: spa_particule, pos: vec3, vel: vec3, dir: number, dirVel: number, duration: number, scale: [number, number], attached: NitroEmitter_target) {
        this._scene = scene;
        this.emitter = emitter;

        this.time = 0;
        this.duration = duration | 0;
        this.pos = vec3.add(pos, pos, [0, 0, 0]);
        this.vel = vel;
        this.dirVel = dirVel; //float
        this.dir = dir; //float
        this.attached = attached;
        this.scale = scale; //vec2

        this.aScale = 1;
        //decode 16 bit color into float
        this.baseColor = this._convertCol(this.emitter.color);
        this.baseColor[3] = this.emitter.opacity / 0x1F;
        this.aColor = vec4.clone(this.baseColor);

        this.frame = this.emitter.textureId;
        if (this.emitter.texAnim) {
            this.frame = this.emitter.texAnim.textures[0];
        }

        this._MAT3I = mat3.create();
        this._MAT4I = mat4.create();
    }

    _convertCol(col: number): vec4 {
        return [
            ((col & 31) / 31),
            (((col >> 5) & 31) / 31),
            (((col >> 10) & 31) / 31),
            1 //Math.round((col>>15)*255);
        ];
    }

    update(scene: Scene) {
        var particlePct = this.time / this.duration;

        this.pos[0] += this.vel[0] * 16;
        this.pos[1] += this.vel[1] * (this.emitter.yOffIntensity / 128) * 16;
        this.pos[2] += this.vel[2] * 16;
        if (this.emitter.gravity) {
            const g = vec3.clone([
                this.emitter.gravity[0],
                this.emitter.gravity[1],
                this.emitter.gravity[2]
            ])
            vec3.add(this.vel, this.vel, g);
        }
        if (this.emitter.colorAnim) {
            var ca = this.emitter.colorAnim;
            var from = this._convertCol(ca.colorFrom);
            var to = this._convertCol(ca.colorTo);
            var pctFloat = (ca.framePct / 0xFFFF);
            vec4.lerp(this.aColor, from, to, Math.max(0, (particlePct - pctFloat) / (1 - pctFloat)));
            this.aColor[3] = this.emitter.opacity / 0x1F;
        } else {
            this.aColor = vec4.clone(this.baseColor);
        }
        if (this.emitter.opacityAnim) {
            var oa = this.emitter.opacityAnim;
            var pctFade = oa.startFade / 0xFFFF;
            var opaMul = 1 - Math.max(0, (particlePct - pctFade) / (1 - pctFade));
            this.aColor[3] = opaMul;// * oa.intensity/0x0FFF;
            //vec4.scale(t.aColor, t.aColor, opaMul);
        }
        if (this.emitter.texAnim) {
            var ta = this.emitter.texAnim;
            var frame = 0;
            if ((ta.unknown1 & 128) > 0) {
                //select frame based on particle duration
                var frame = ta.textures[Math.min((particlePct * ta.frames) | 0, ta.frames - 1)];
            } else {
                //repeating anim with framerate
                //not sure what framerate is, but its likely in the unknowns.
                var frame = ta.textures[(this.time % ta.frames)];
            }
            this.frame = frame;
        }

        this.dir += this.dirVel;

        if (this.time++ >= this.duration) scene.removeParticle(this);
    }

    draw(view: mat4, pMatrix: mat4, gl: CustomWebGLRenderingContext) {
        var particlePct = this.time / this.duration;

        var pos = this.pos;
        var vel = this.vel;

        if (this.attached != null) {
            pos = vec3.transformMat4([0, 0, 0], pos, this.attached.mat);


            //tranform our vector by the target matrix
            var mats = this.attached.mat;
            var org: vec3 = [0, 0, 0]

            mat4.getTranslation(org, mats);
            mats[12] = 0;
            mats[13] = 0;
            mats[14] = 0;

            vel = vec3.transformMat4([0, 0, 0], vel, mats);

            mats[12] = org[0];
            mats[13] = org[1];
            mats[14] = org[2];

        }

        var mat = mat4.translate(mat4.create(), view, pos);

        var bbMode = this.emitter.flag & 0xF0;

        if (bbMode == 0x10) { //spark, billboards towards camera
            var camPos = this._scene.camera.view.pos;

            camPos = vec3.sub([0, 0, 0], camPos, pos);
            vec3.normalize(camPos, camPos);

            var n = vec3.sub([0, 0, 0], vel, this.ovel);
            vec3.normalize(n, n);
            mat4.multiply(mat, mat, mat4.invert(mat4.create(), mat4.lookAt(mat4.create(), [0, 0, 0], camPos, n)));

        } else if (bbMode == 0x20) { //no billboard
            mat4.rotateY(mat, mat, this.dir);
        } else if (bbMode == 0x30) { //spark, no billboard
            var camPos = this._scene.camera.view.pos;

            camPos = vec3.sub([0, 0, 0], camPos, pos);
            vec3.normalize(camPos, camPos);

            var n = vec3.sub([0, 0, 0], vel, this.ovel);
            vec3.normalize(n, n);
            mat4.multiply(mat, mat, mat4.invert(mat4.create(), mat4.lookAt(mat4.create(), [0, 0, 0], camPos, n)));
            mat4.rotateY(mat, mat, this.dir);
        } else { //billboard
            mat4.multiply(mat, mat, nitroRender.billboardMat);
            mat4.rotateZ(mat, mat, this.dir);
        }
        var finalScale = 1;
        if (this.emitter.scaleAnim) {
            var sa = this.emitter.scaleAnim;
            if (particlePct < sa.fromZeroTime) {
                var fzPct = particlePct / sa.fromZeroTime;
                finalScale = sa.scaleFrom * fzPct;
            } else {
                var rescaledPct = Math.min(1, (particlePct - sa.fromZeroTime) / (1 - (sa.fromZeroTime + sa.holdTime * (1 - sa.fromZeroTime))));
                finalScale = sa.scaleFrom * (1 - rescaledPct) + sa.scaleTo * rescaledPct;
            }
        }
        mat4.scale(mat, mat, vec3.scale([0, 0, 0], [this.scale[0], this.scale[1], 1], 12 * finalScale));
        mat4.translate(mat, mat, [this.emitter.xScaleDelta, this.emitter.yScaleDelta, 0]);

        this._drawGeneric(mat, pMatrix, gl);
    }

    _drawGeneric(mv: mat4, project: mat4, gl: CustomWebGLRenderingContext) {
        var shader = nitroRender.nitroShader;
        if (!nitroRender.flagShadow) {
            const s = <nitroShaders_shadowShader>shader;
            gl.uniform1f(s.uniforms.shadOffUniform, 0.001);
            gl.uniform1f(s.uniforms.lightIntensityUniform, 0);
        }
        if (window.VTX_PARTICLE == null) this._genGlobalVtx(gl);
        var obj = window.VTX_PARTICLE;

        nitroRender.setColMult(this.aColor as number[]);

        gl.uniformMatrix4fv(shader.uniforms.mvMatrixUniform, false, mv);
        gl.uniformMatrix4fv(shader.uniforms.pMatrixUniform, false, project);
        //matrix stack unused, just put an identity in slot 0
        gl.uniformMatrix4fv(shader.uniforms.matStackUniform, false, this._MAT4I);

        var frame = this.emitter.parent.getTexture(this.frame, gl);
        gl.bindTexture(gl.TEXTURE_2D, frame);
        //texture matrix not used
        gl.uniformMatrix3fv(shader.uniforms.texMatrixUniform, false, this._MAT3I);
        if (obj != nitroRender.last.obj) {
            gl.bindBuffer(gl.ARRAY_BUFFER, obj.vPos);
            gl.vertexAttribPointer(shader.attributes.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, obj.vTx);
            gl.vertexAttribPointer(shader.attributes.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, obj.vCol);
            gl.vertexAttribPointer(shader.attributes.colorAttribute, 4, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, obj.vMat);
            gl.vertexAttribPointer(shader.attributes.matAttribute, 1, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, obj.vNorm);
            gl.vertexAttribPointer(shader.attributes.normAttribute, 3, gl.FLOAT, false, 0, 0);
            nitroRender.last.obj = obj;
        }

        gl.disable(gl.CULL_FACE);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        nitroRender.setColMult([1, 1, 1, 1]);
        if (!nitroRender.flagShadow) {
            const s = <nitroShaders_shadowShader>shader;
            nitroRender.resetShadOff();
            gl.uniform1f(s.uniforms.lightIntensityUniform, 0.3);
        }
    }

    _genGlobalVtx(gl: CustomWebGLRenderingContext) {
        var vecPos = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0];
        var vecTx = [1, 1, 0, 1, 1, 0, 0, 0];
        var vecCol = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
        var vecMat = [0, 0, 0, 0];
        var vecNorm = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];

        var pos = gl.createBuffer();
        var col = gl.createBuffer();
        var tx = gl.createBuffer();
        var mat = gl.createBuffer();
        var norm = gl.createBuffer();

        var posArray = new Float32Array(vecPos);

        gl.bindBuffer(gl.ARRAY_BUFFER, pos);
        gl.bufferData(gl.ARRAY_BUFFER, posArray, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, tx);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vecTx), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, col);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vecCol), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, mat);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vecMat), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, norm);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vecNorm), gl.STATIC_DRAW);

        window.VTX_PARTICLE = {
            posArray: posArray,
            vPos: pos,
            vTx: tx,
            vCol: col,
            vMat: mat,
            vNorm: norm,
            verts: vecPos.length / 3,
            mode: gl.STATIC_DRAW
        };
    }
}