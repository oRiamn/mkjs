//
// itemboxShard.js
//--------------------
// by RHY3756547
//

import { nitroModel } from "../render/nitroModel";
import { Kart } from "../entities/kart";
export class ItemShard {
    scene: Scene;
    time: number;
    pos: vec3;
    vel: vec3;
    dirVel: vec3;
    dir: vec3;
    scale: vec3;
    model: nitroModel;
    constructor(scene: Scene, targ: Kart, model: nitroModel) {
        this.scene = scene;
        this.time = 0;
        this.pos = vec3.clone(targ.pos);
        this.vel = vec3.add(
            [0, 0, 0],
            targ.vel,
            [
                (Math.random() - 0.5) * 5,
                Math.random() * 7,
                (Math.random() - 0.5) * 5
            ]
        );
        this.dirVel = [
            (Math.random() - 0.5),
            (Math.random() - 0.5),
            (Math.random() - 0.5)
        ];
        this.dir = [
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI
        ];
        const scale = Math.random() + 0.5;
        this.scale = [scale, scale, scale];
        this.model = model;
    }

    update(scene: Scene) {
        vec3.add(this.pos, this.pos, this.vel);
        vec3.add(this.vel, this.vel, [0, -0.17, 0]);
        vec3.add(this.dir, this.dir, this.dirVel);

        if (this.time++ > 30) {
            scene.removeParticle(this);
        }
    }

    draw(view: mat4, pMatrix: mat4, gl: CustomWebGLRenderingContext) {
        var mat = mat4.translate(mat4.create(), view, this.pos);

        mat4.rotateZ(mat, mat, this.dir[2]);
        mat4.rotateY(mat, mat, this.dir[1]);
        mat4.rotateX(mat, mat, this.dir[0]);

        mat4.scale(mat, mat, vec3.scale([0, 0, 0], this.scale, 16));
        this.model.draw(mat, pMatrix);
    }

}