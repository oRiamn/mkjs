import { MKDSCONST } from "../../../engine/mkdsConst";
import { Item } from "../../item";
import { Kart } from "../../kart";
export class BombC implements KartItemEntity {
    item: Item;
    canBeHeld: boolean;
    canBeDropped: boolean;
    isDestructive: boolean;
    explodeTime: number;
    isSolid: boolean;
    constructor(item: Item, scene: Scene, _type: string) {
        this.item = item;
        this.canBeHeld = true;
        this.canBeDropped = true;
        this.isDestructive = true;
        this.explodeTime = 0;
    }
    
    collideKart(kart: Kart) {
        this.item.deadTimer = 1;
        kart.damage(MKDSCONST.DAMAGE_EXPLODE);
    }

    onRest(_normal: vec3) {
    }

    update(_scene: Scene) {
        if (this.item.deadTimer > 0 && this.explodeTime == 0) {
            //begin explosion
            this.explodeTime = 1;
        }
        if (!this.item.held && this.item.colRadius < 6) {
            this.item.colRadius += 0.2;
            if (this.item.colRadius > 6) this.item.colRadius = 6;
        }
    }
}