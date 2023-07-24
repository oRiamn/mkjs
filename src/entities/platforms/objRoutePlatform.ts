import { nkm_section_OBJI, nkm_section_POIT } from "../../formats/nkm";
import { Item } from "../item";

export class ObjRoutePlatform implements SceneEntityObject, lsc_taget {
    collidable: boolean;
    colMode: number;
    colRad: number;
    _obji: nkm_section_OBJI;
    _res: ProvidedRes;
    _genCol: any;
    _scene: Scene;
    _movVel: vec3;
    pos: vec3;
    scale: vec3;
    statDur: number;
    route: nkm_section_POIT[];
    routeSpeed: number;
    routePos: number;
    nextNode: nkm_section_POIT;
    prevPos: vec3;
    elapsedTime: number;
    mode: number;
    colFrame: number;
    constructor(obji: nkm_section_OBJI, scene: Scene) {
        console.log('ObjRoutePlatform');

        this.collidable = true;
        this.colMode = 0;
        this.colRad = 512;

        this._obji = obji;
        this._res = undefined;
        this._genCol = undefined;
        this._scene = scene;
        this._movVel = undefined;


        this.pos = vec3.clone(this._obji.pos);
        //this.angle = vec3.clone(obji.angle);
        this.scale = vec3.clone(this._obji.scale);

        this._generateCol();

        this.statDur = (this._obji.setting1 & 0xFFFF);
        this.route = this._scene.paths[this._obji.routeID];
        this.routeSpeed = 1 / 6;
        this.routePos = 0;
        this.nextNode = this.route[this.routePos];
        this.prevPos = this.pos;
        this.elapsedTime = 0;

        this.mode = 0;
        this.colFrame = 0;

        //this.speed = (obji.setting1&0xFFFF)/8192;
    }
    update(_scene: Scene) {
        this.colFrame++;
        if (this.mode == 0) {
            this.elapsedTime += this.routeSpeed;
            this._movVel = vec3.sub([0, 0, 0], this.nextNode.pos, this.prevPos);
            //vec3.normalize(movVel, movVel);
            vec3.scale(this._movVel, this._movVel, this.routeSpeed / this.nextNode.duration);
            vec3.add(this.pos, this.pos, this._movVel);
            if (this.elapsedTime >= this.nextNode.duration) {
                this.elapsedTime = 0;
                this.prevPos = this.nextNode.pos;
                this.routePos = (this.routePos + 1) % this.route.length;
                this.nextNode = this.route[this.routePos];
                this.mode = 1;
            }
        } else {
            this.elapsedTime += 1;
            this._movVel = [0, 0, 0];
            if (this.elapsedTime > this.statDur) {
                this.mode = 0;
                this.elapsedTime = 0;
            }
        }
    }

    draw(view: mat4, pMatrix: mat4) {
        var mat = mat4.translate(mat4.create(), view, this.pos);

        mat4.scale(mat, mat, vec3.scale([0, 0, 0], this.scale, 16));

        this._res.mdl[0].draw(mat, pMatrix);
    }

    requireRes() { //scene asks what resources to load
        return { mdl: [ { nsbmd: "koopa_block.nsbmd" } ] };	//25x, 11y
    }

    provideRes(r: ProvidedRes) {
        this._res = r; //...and gives them to us. :)
    }

    _generateCol() {
        this._genCol = {
            dat: [
                {
                    Vertices: [[25, 0, 11], [25, 0, -11], [-25, 0, -11]],
                    Normal: [0, 1, 0]
                },
                {
                    Vertices: [[-25, 0, -11], [-25, 0, 11], [25, 0, 11]],
                    Normal: [0, 1, 0]
                },
            ], scale: 1
        };
    }

    getCollision() {
        var inf = this._genCol;//res.mdl[0].getCollisionModel(0, 0);
        const tris = inf.dat;

        var mat = mat4.translate(mat4.create(), mat4.create(), this.pos);
        mat4.scale(mat, mat, vec3.mul([0, 0, 0], [16 * inf.scale, 16 * inf.scale, 16 * inf.scale], this.scale));

        const frame = this.colFrame;
        return {
            mat,
            frame,
            tris
        };
    }

    moveWith(obj: Item){ //used for collidable objects that move. 
        /*var p = vec3.sub([], obj.pos, t.pos);
        vec3.transformMat4(p, p, mat4.rotateY([], mat4.create(), dirVel));
        vec3.add(obj.pos, t.pos, p);
        obj.physicalDir -= dirVel;*/
        vec3.add(obj.pos, obj.pos, this._movVel);
    }
}