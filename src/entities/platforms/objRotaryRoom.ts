import { nkm_section_OBJI } from "../../formats/nkm";
import { Item } from "../item";

export class ObjRotaryRoom implements SceneEntityObject, lsc_taget {
    _obji: nkm_section_OBJI;
    _dirVel: number;
    collidable: boolean;
    colMode: number;
    colRad: number;
    pos: vec3;
    scale: vec3;
    speed: number;
    angle: number;
    _res: ProvidedRes;
    constructor(obji: nkm_section_OBJI, _scene: Scene) {
        console.log('ObjRotaryRoom');

        this._obji = obji;
        this._res = undefined;
        this._dirVel = 0;

        this.collidable = true;
        this.colMode = 0;
        this.colRad = 512;


        this.pos = vec3.clone(this._obji.pos);
        //this.angle = vec3.clone(obji.angle);
        this.scale = vec3.clone(this._obji.scale);

        this.speed = (this._obji.setting1 & 0xFFFF) / 8192;
        this.angle = 0;

    }

    update(_scene: Scene) {
        this._dirVel = this.speed;
        this.angle += this._dirVel;
    }

    draw(view: mat4, pMatrix: mat4) {
        var mat = mat4.translate(mat4.create(), view, this.pos);

        mat4.scale(mat, mat, vec3.scale([0, 0, 0], this.scale, 16));

        mat4.rotateY(mat, mat, this.angle);
        this._res.mdl[0].draw(mat, pMatrix);
    }

    requireRes() { //scene asks what resources to load
        return { mdl: [{ nsbmd: "rotary_room.nsbmd" }] };
    }

    provideRes(r: ProvidedRes) {
        this._res = r; //...and gives them to us. :)
    }

    getCollision() {
        var inf = this._res.mdl[0].getCollisionModel(0, 0, 0);
        const tris = inf.dat;

        var mat = mat4.translate(mat4.create(), mat4.create(), this.pos);
        mat4.scale(mat, mat, vec3.mul([0, 0, 0], [16 * inf.scale, 16 * inf.scale, 16 * inf.scale], this.scale));
        mat4.rotateY(mat, mat, this.angle);

        return {
            tris,
            mat
        };
    }

    moveWith(obj: Item) { //used for collidable objects that move. 
        var p = vec3.sub([0, 0, 0], obj.pos, this.pos);
        vec3.transformMat4(p, p, mat4.rotateY(mat4.create(), mat4.create(), this._dirVel));
        vec3.add(obj.pos, this.pos, p);
       // obj.physicalDir -= this._dirVel;
    }

}