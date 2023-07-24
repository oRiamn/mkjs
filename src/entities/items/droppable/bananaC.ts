import { nitroAudio } from "../../../audio/nitroAudio";
import { MKDSCONST } from "../../../engine/mkdsConst";
import { Item } from "../../item";
import { Kart } from "../../kart";
export class BananaC implements KartItemEntity {
    item: Item;
    canBeHeld: boolean;
    canBeDropped: boolean;
    isDestructive: boolean;
    isSolid: boolean;

    constructor(item: Item, _scene: Scene, _type: string) {
        this.item = item;
        this.canBeHeld = true;
        this.canBeDropped = true;
        this.isDestructive = false;
        this.item.floorBounce = 0;
    }

    collideKart(kart: Kart) {
        this.item.deadTimer = 1;
        kart.damage(MKDSCONST.DAMAGE_SPIN);
    }

    onRest(_normal: vec3) {
        nitroAudio.playSound(219, { volume: 2 }, 0, this.item);
    }

    update(_scene: Scene) {
        if (!this.item.held && this.item.colRadius < 6) {
            this.item.colRadius += 0.2;
            if (this.item.colRadius > 6) this.item.colRadius = 6;
        }
        if (this.item.groundTime < 30) {
            var t = (1 - this.item.groundTime / 29);
            var s = Math.sin(this.item.groundTime * Math.PI / 14);

            var sprMat = mat4.create();
            mat4.translate(sprMat, sprMat, [0, -1 / 6, 0]);
            mat4.scale(sprMat, sprMat, [1 + s * 0.6 * t, 1 - s * 0.6 * t, 1]);
            mat4.translate(sprMat, sprMat, [0, 1 / 6, 0]);

            this.item.sprMat = sprMat;
        } else {
            this.item.sprMat = null;
        }
    }
}