import { nitroAudio } from "../../../audio/nitroAudio";
import { MKDSCONST } from "../../../engine/mkdsConst";
import { Item } from "../../item";
import { Kart } from "../../kart";
export class FakeBoxC implements KartItemEntity {
    canBeHeld: boolean;
    scene: Scene;
    item: Item;
    canBeDropped: boolean;
    isDestructive: boolean;
    isSolid: boolean;
    xyScale: number[];
    dir: number;
    constructor(item: Item, scene: Scene, _type: string) {
        this.canBeHeld = true;
        this.scene = scene;
        this.item = item;
        this.canBeDropped = true;
        this.isDestructive = false;
        this.isSolid = false;
        this.item.floorBounce = 0;
        this.item.airResist = 0.98;

        this.xyScale = [1, 1];
        this.dir = 0;
    }

    collideKart(kart: Kart) {
        this.item.deadTimer = 1;
        nitroAudio.playSound(250, { volume: 2 }, 0, this.item);
        kart.damage(MKDSCONST.DAMAGE_FLIP);
    }

    onRest(_normal: vec3) {
        nitroAudio.playSound(251, { volume: 2 }, 0, this.item);
    }

    update(_scene: Scene) {
        if (this.item.held) {
            this.dir = -(this.item.owner.physicalDir + this.item.owner.driftOff / 4);
        }
        if (!this.item.held && this.item.colRadius < 8) {
            this.item.colRadius += 0.2;
            if (this.item.colRadius > 8) this.item.colRadius = 8;
        }
        if (this.item.groundTime < 20) {
            var linear = (1 - this.item.groundTime / 19);
            var s = Math.sin(this.item.groundTime * Math.PI / 8);

            this.xyScale = [1 + s * 0.25 * linear, 1 - s * 0.25 * linear];
        } else {
            this.xyScale = [1, 1];
        }
    }

    draw(mvMatrix: mat4, pMatrix: mat4) {
        var mat = mat4.translate(mat4.create(), mvMatrix, vec3.add(vec3.create(), this.item.pos, [0, this.item.colRadius * 1.5 * this.xyScale[1], 0]));

        var scale = 2 * this.item.colRadius * (1 - this.item.holdTime / 7);
        mat4.scale(mat, mat, [scale * this.xyScale[0], scale * this.xyScale[1], scale * this.xyScale[0]]);
        mat4.rotateY(mat, mat, this.dir);
        mat4.rotateZ(mat, mat, Math.PI / -6);
        mat4.rotateY(mat, mat, Math.PI / 6);
        mat4.rotateX(mat, mat, Math.PI / -6);

        var mdl = this.scene.gameRes.items.fakeBox;
        mdl.draw(mat, pMatrix);
    }
}