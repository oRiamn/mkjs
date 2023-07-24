import { nitroAudioSound, nitroAudio } from "../../../audio/nitroAudio";
import { Item } from "../../item";
export class ShellGroupC implements KartItemEntity {
    canBeHeld: boolean;
    canBeDropped: boolean;
    rotationPeriod: number;
    item: Item;
    scene: Scene;
    type: string;
    children: any[];
    itemCount: number;
    phase: number;
    spinDist: number;
    remaining: number;
    sound: nitroAudioSound;
    isDestructive: boolean;
    isSolid: boolean;
    constructor(item: Item, scene: Scene, type: string) {

        this.canBeHeld = true;
        this.canBeDropped = true;
        this.rotationPeriod = 45;

        this.item = item;
        this.scene = scene;
        this.type = type;

        this.item.colRadius = -Infinity;

        this.children = [];

        var itemType = "koura_g";
        this.itemCount = 3;

        if (this.type.length > 0) {
            var typeParse = this.type.split("-");
            if (typeParse.length == 1) {
                itemType = this.type;
            } else if (typeParse.length == 2 && !isNaN(+typeParse[1])) {
                itemType = typeParse[0];
                this.itemCount = +typeParse[1];
            }
        }

        this.phase = 0;
        this.spinDist = 6;

        this.remaining = this.itemCount;
        this.item.holdPos = [0, 0, 0];
        //create children
        for (var i = 0; i < this.itemCount; i++) {
            var sub = this.scene.items.createItem(itemType, this.item.owner);
            sub.holdTime = 7;
            this.children.push(sub);
        }
        nitroAudio.playSound(231, { volume: 2 }, 0, this.item);
        this.sound = nitroAudio.playSound(227, { volume: 1.5 }, 0, this.item);
    }

    onDie(_final: boolean) {
        if (this.sound) {
            nitroAudio.instaKill(this.sound);
            this.sound = null;
        }
    }

    update(_scene: Scene) {
        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            if (child == null) continue;
            if (child.deadTimer > 0) {
                this.children[i] = null;
                this.remaining--;
                continue;
            }
            var angle = ((i / this.itemCount + this.phase / this.rotationPeriod) * Math.PI * 2);
            var rad = this.item.owner.params.colRadius;
            var dist = this.spinDist + rad;
            child.holdPos = [-Math.sin(angle) * dist, -this.item.owner.params.colRadius, Math.cos(angle) * dist];
        }
        this.phase++;
        this.phase %= this.rotationPeriod;
    }

    release(forward: 1 | -1) {
        //forward the release to our last child
        var toUse;

        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            if (child == null) continue;
            if (child.deadTimer > 0) {
                this.children[i] = null;
                this.remaining--;
                continue;
            }
            toUse = child;
            this.children[i] = null;
            this.remaining--;
            break;
        }

        if (toUse != null) {
            toUse.release(forward);
        }
        if (this.remaining == 0) {
            this.item.finalize();
        }
    }

    draw(_mvMatrix: mat4, _pMatrix: mat4) {
        //the group itself is invisible - the shells draw individually
    }
}