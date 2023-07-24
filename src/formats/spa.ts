//
// spa.js
//--------------------
// Reads spa files. Based off of code from MJDS Course Modifier, which was very incomplete but at least got the textures.
// Reverse engineered most of the emitter stuff.
// by RHY3756547
//

import { MKSUtils } from "./utils";

type spa_particuletexture_infos = {
    pal0trans: boolean;
    format: number;
    height: number;
    width: number;
    repeatX: number;
    repeatY: number;
    flipX: number;
    flipY: number;
}


type spa_particuletexture = {
    stamp: string;
    info: spa_particuletexture_infos;
    flags: number;
    unknown: number;
    unknown2: number,
    unknown3: number,
    unknown4: number,
    texDataLength: number;
    palOff: number,
    palDataLength: number,
    texData: ArrayBuffer,
    palData: ArrayBuffer,
    nextOff: number;
    glTex?: CustomWebGLTexture;
}

type spa_particule_flag = {
    Type0: number,
    Type1: number,
    Type2: number,
    Type3: number,
    Type4: number,
    Type5: number,
    ScaleAnim: number,
    ColorAnimation: number,
    OpacityAnimation: number,
    TextureAnimation: number,
    Unknown: number,
    RandomDirection: number,
    CrashGame: number,
    AttachedToEmitter: number,
    Bit16: number,
    Bit21: number,
    Bit22: number,
    Bit23: number,
    Gravity: number,
    Bit25: number,
    Bit26: number,
    Bit27: number,
    Bit28: number,
    Bit29: number,
}

export type spa_particule = {
    parent: spa;
    nextOff: number,
    ParticleFlags: spa_particule_flag,
    flag: number,
    position: vec3,
    particleChance: number,
    areaSpread: number,
    unknown3: number,
    vector: vec3,
    color: number,
    randomxz: number,
    velocity: number,
    size: number,
    aspect: number,
    delay: number,
    rotVelFrom: number,
    rotVelTo: number,
    scX: number,
    scY: number,
    emitterLifetime: number,
    duration: number,
    varScale: number,
    varDuration: number,
    varUnk1: number,
    varUnk2: number,
    frequency: number,
    opacity: number,
    yOffIntensity: number,
    textureId: number,
    unknown21: number,
    unknown22: number,
    xScaleDelta: number,
    yScaleDelta: number,
    unknown25: number,
    scaleAnim?: {
        unkBase: number
        scaleFrom: number
        scaleTo: number
        fromZeroTime: number
        holdTime: number
        flagParam: number
        unk4b: number
    },
    colorAnim?: {
        colorFrom: number,
        colorTo: number,
        framePct: number,
        unknown: number,
        flags: number,
    },
    opacityAnim?:| {
        intensity: number,
        random: number,
        unk: number,
        startFade: number,
        param: number,
    },
    texAnim?: {
        textures: number[],
        frames: number,
        unknown1: number,
        unknown2: number,
    },
    gravity?: vec4,
    Bit16?: number[],
    Bit25?: number[],
    Bit26?: number[],
    Bit27?: number[],
    Bit28?: number[],
    Bit29?: number[],
}

export class spa implements MKJSDataFormator {
    input: MKJSDataInput;
    colourBuffer: Uint32Array;
    particles: spa_particule[];
    particleTextures: spa_particuletexture[];
    realWidth: number;
    realHeight: number;
    constructor(input: MKJSDataInput) {
        this.input = input;

        this.colourBuffer = new Uint32Array(4);

        if (this.input != null) {
            this.load(this.input);
        }
    }

    load(input: MKJSDataInput): void {
        var view = new DataView(input);
        var offset = 0;

        var stamp = MKSUtils.asciireadChar(view, 0x0) + MKSUtils.asciireadChar(view, 0x1) + MKSUtils.asciireadChar(view, 0x2) + MKSUtils.asciireadChar(view, 0x3);
        if (stamp != " APS") throw "SPA invalid. Expected 'APS', found " + stamp;
        offset += 4;

        var version = MKSUtils.asciireadChar(view, offset) + MKSUtils.asciireadChar(view, offset + 1) + MKSUtils.asciireadChar(view, offset + 2) + MKSUtils.asciireadChar(view, offset + 3);
        offset += 4;

        var particleCount = view.getUint16(offset, true);
        var particleTexCount = view.getUint16(offset + 2, true);
        var unknown = view.getUint32(offset + 4, true);
        var unknown2 = view.getUint32(offset + 8, true);
        var unknown3 = view.getUint32(offset + 12, true);

        var firstTexOffset = view.getUint32(offset + 16, true);
        var pad = view.getUint32(offset + 20, true);

        offset += 24;
        if (version == "12_1") {
            this.particles = [];
            for (var i = 0; i < particleCount; i++) {
                this.particles[i] = this._readParticle(view, offset);
                this.particles[i].parent = this;
                offset = this.particles[i].nextOff;
            }
        }

        offset = firstTexOffset;
        this.particleTextures = [];
        for (var i = 0; i < particleTexCount; i++) {
            this.particleTextures[i] = this._readParticleTexture(view, offset);
            offset = this.particleTextures[i].nextOff;
        }

        //window.debugParticle = true;
        if (window.debugParticle) {
            for (var i = 0; i < particleCount; i++) {
                var text = document.createElement("textarea");
                var p = this.particles[i];
                p.parent = null;
                text.value = JSON.stringify(p);
                p.parent = this;
                text.style.width = "500px";
                text.style.height = "200px";


                var obj = this.particleTextures[p.textureId];
                if (p.texAnim) obj = this.particleTextures[p.texAnim.textures[0]];
                if (obj == null) {
                    continue;
                }
                var test = this._readTexWithPal(obj.info, obj);
                document.body.appendChild(document.createElement("br"));
                document.body.appendChild(document.createTextNode(i + ":"));
                document.body.appendChild(test);
                document.body.appendChild(text);

            }
        }
    }

    getTexture(id: number, gl: WebGLRenderingContext): CustomWebGLTexture {
        var obj = this.particleTextures[id];
        if (obj == null) {
            return null;
        }
        if (obj.glTex == null) {
            var canvas = this._readTexWithPal(obj.info, obj);
            var m = obj.info;
            if (m.flipX || m.flipY) {
                var fC = document.createElement("canvas");
                var ctx = fC.getContext("2d");
                fC.width = (m.flipX) ? canvas.width * 2 : canvas.width;
                fC.height = (m.flipY) ? canvas.height * 2 : canvas.height;
                ctx.drawImage(canvas, 0, 0);
                ctx.save();
                if (m.flipX) {
                    ctx.translate(2 * canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(canvas, 0, 0);
                    ctx.restore();
                    ctx.save();
                }
                if (m.flipY) {
                    ctx.translate(0, 2 * canvas.height);
                    ctx.scale(1, -1);
                    ctx.drawImage(fC, 0, 0);
                    ctx.restore();
                }
                var t = this._loadTex(fC, gl, !m.repeatX, !m.repeatY);
                t.realWidth = canvas.width;
                t.realHeight = canvas.height;
                obj.glTex = t;
            } else {
                var t = this._loadTex(canvas, gl, !m.repeatX, !m.repeatY);
                t.realWidth = canvas.width;
                t.realHeight = canvas.height;
                obj.glTex = t;
            }
        }
        return obj.glTex;
    }

    _loadTex(img: HTMLCanvasElement, gl: WebGLRenderingContext, clampx: boolean, clampy: boolean): CustomWebGLTexture { //general purpose function for loading an image into a texture.
        var texture = gl.createTexture() as CustomWebGLTexture;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        if (clampx) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        if (clampy) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        texture.width = img.width;
        texture.height = img.height;

        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    _readParticle(view: DataView, off: number): spa_particule {
        var ParticleFlags = {
            Type0: 0,
            //1: random sphere
            //2: random ground
            //3: rotation invariant
            //4+: unpredictable past here
            Type1: 0x10, //spark type
            Type2: 0x20, //3d, makes rotation around billboard axis
            Type3: 0x30, //spark 3d
            Type4: 0x40, //billboard
            Type5: 0x80, //billboard but ignores ground setting? maybe 2d
            ScaleAnim: 0x100,
            ColorAnimation: 0x200,
            OpacityAnimation: 0x400,
            TextureAnimation: 0x800,
            Unknown: 0x1000,
            RandomDirection: 0x2000,
            CrashGame: 0x4000,
            AttachedToEmitter: 0x8000,
            Bit16: 0x10000,
            Bit21: 0x200000,
            Bit22: 0x400000,
            Bit23: 0x800000,
            Gravity: 0x1000000,
            Bit25: 0x2000000, //balloon? perhaps sine rotation (as it flies away)
            Bit26: 0x4000000,
            Bit27: 0x8000000,
            Bit28: 0x10000000,
            Bit29: 0x20000000
        }

        const flag = view.getUint32(off, true);
        const position = vec3.clone([
            view.getInt32(off + 0x4, true) / 4096,
            view.getInt32(off + 0x8, true) / 4096,
            view.getInt32(off + 0xC, true) / 4096
        ]
        );
        //this is just hilarious at this point
        //the best approach here is to look at each particle on a case by case basis, seeing how each particle behaves ingame
        const particleChance = view.getInt32(off + 0x10, true) / 4096;    //if less than 1, pct chance a particle will appear on that frame. >1 means more than one particle will appear.
        const areaSpread = view.getInt32(off + 0x14, true) / 4096;    //x and z
        //^ particle count?
        const unknown3 = view.getInt32(off + 0x18, true) / 4096;   //unknown (does not change anything for grass)

        //not sure what this vector is for. grass it's (0, 1, 0), smoke it's (-0.706787109375, 0, -0.707275390625) billboard alignment vector? (it's a bit crazy for powerslide)
        const vector = vec3.clone([
            view.getInt16(off + 0x1C, true) / 4096,
            view.getInt16(off + 0x1E, true) / 4096,
            view.getInt16(off + 0x20, true) / 4096
        ]);
        const color = view.getUint16(off + 0x22, true); //15 bit, usually 32767 for white.
        const randomxz = view.getUint32(off + 0x24, true) / 4096; //random xz velocity intensity
        const velocity = view.getUint32(off + 0x28, true) / 4096; //initial velocity related (along predefined vector)
        const size = view.getUint32(off + 0x2C, true) / 4096; //size
        const aspect = view.getUint16(off + 0x30, true) / 4096; //aspect

        //frame delay before activation (x2)
        //rotational velocity from (x2)
        //rotational velocity to (x2)
        const delay = view.getUint16(off + 0x32, true);
        const rotVelFrom = view.getInt16(off + 0x34, true);
        const rotVelTo = view.getInt16(off + 0x36, true);

        const scX = view.getInt16(off + 0x38, true) / 0x8000; //??? (0) //scale center offset?
        const scY = view.getInt16(off + 0x3A, true) / 0x8000; //??? (4B) //scale center offset?
        const emitterLifetime = view.getUint16(off + 0x3C, true); //stop emitting particles after this many frames
        const duration = view.getUint16(off + 0x3E, true);

        const varScale = view.getUint8(off + 0x40);
        const varDuration = view.getUint8(off + 0x42);
        const varUnk1 = view.getUint8(off + 0x44); //usually like 1-8
        const varUnk2 = view.getUint8(off + 0x46); //usually like 128 (hahaa)

        const frequency = view.getUint8(off + 0x44); //create particle every n frames
        const opacity = view.getUint8(off + 0x45); //opacity (0-1F)
        const yOffIntensity = view.getUint8(off + 0x46); //y offset intensity (seems to include updraft and gravity. 124 for smoke, 120 for grass. 128 is probably 1x)
        const textureId = view.getUint8(off + 0x47);
        const unknown21 = view.getUint32(off + 0x48, true); //negative number makes grass disappear (1 for grass, smoke)
        const unknown22 = view.getUint32(off + 0x4C, true); //some numbers make grass disappear (0x458d00 for grass, 0x74725f60 for smoke)
        const xScaleDelta = view.getInt16(off + 0x50, true) / 4096; //x scale delta for some reason. usually 0
        const yScaleDelta = view.getInt16(off + 0x52, true) / 4096; //y scale delta for some reason. usually 0
        const unknown25 = view.getUint32(off + 0x54, true); //FFFFFFFF makes run at half framerate. idk? usually 0
        off += 0x58;

        let scaleAnim = undefined
        if ((flag & ParticleFlags.ScaleAnim) != 0) {
            //1.000 (doesn't seem to do anything important, but occasionally is between start and end)
            //start scale
            //end scale
            //???? (seems to affect the interpolation. cubic params?)
            //flags (1: random scale for one frame? everything above it might be cubic params)
            //???? (0x4B)

            scaleAnim = {
                unkBase: view.getUint16(off, true) / 4096,
                scaleFrom: view.getUint16(off + 2, true) / 4096,
                scaleTo: view.getUint16(off + 4, true) / 4096,
                fromZeroTime: view.getUint8(off + 6) / 0xFF, //time to dedicate to an animation from zero size
                holdTime: view.getUint8(off + 7) / 0xFF, //time to dedicate to holding state at the end.
                flagParam: view.getUint16(off + 8, true),
                unk4b: view.getUint16(off + 10, true),
            };
            off += 12;
        }

        let colorAnim = undefined
        if ((flag & ParticleFlags.ColorAnimation) != 0) {
            colorAnim = {
                colorFrom: view.getUint16(off, true), //color from 
                colorTo: view.getUint16(off + 2, true), //color to (seems to be same as base color)
                framePct: view.getUint16(off + 4, true), //frame pct to become color to (FFFF means always from, 8000 is about the middle)
                unknown: view.getUint16(off + 6, true), //unknown, 00FF for fire?
                flags: view.getUint32(off + 8, true), //flags (1: binary select color, 4: smooth blend)
            };
            off += 12;
        }

        let opacityAnim = undefined;
        if ((flag & ParticleFlags.OpacityAnimation) != 0) {
            //opacity

            //intensity x2 (0FFF to 0000. smoke is 0bff. 1000 breaks it, i'm assuming it pushes opacity from 1f to 20 (overflow to 0))
            //random flicker
            //unknown (negative byte breaks it)
            //startfade x2
            //cubic param? x2
            opacityAnim = {
                intensity: view.getUint16(off, true),
                random: view.getUint8(off + 2),
                unk: view.getUint8(off + 3),
                startFade: view.getUint16(off + 4, true), //0-FFFF. seems to be the pct of duration where the anim starts.
                param: view.getUint16(off + 6, true),
            }
            off += 8;
        }
        let texAnim = undefined;
        if ((flag & ParticleFlags.TextureAnimation) != 0) {
            var textures = [];
            for (var i = 0; i < 8; i++) textures[i] = view.getUint8(off + i);
            texAnim = {
                textures: textures,
                frames: view.getUint8(off + 8),
                unknown1: view.getUint8(off + 9), //128 - duration of particle. 37 - blue spark? (7 frames for 7 duration effect)
                unknown2: view.getUint16(off + 10, true), //1 - random frame? 
            }
            off += 12;
        }
        let Bit16 = undefined;
        if ((flag & ParticleFlags.Bit16) != 0) {
            Bit16 = [];
            for (var i = 0; i < 20; i++) Bit16[i] = view.getUint8(off + i);
            off += 20;
        }


        let gravity: vec4 = undefined;
        if ((flag & ParticleFlags.Gravity) != 0) {

            //gravity
            //x wind
            //gravity (signed 16, -1 is down, leaves are FFEA (-22/4096))
            //z wind
            //pad?
            gravity = [
                view.getInt16(off, true) / 4096,
                view.getInt16(off + 2, true) / 4096,
                view.getInt16(off + 4, true) / 4096,
                view.getInt16(off + 6, true) / 4096, //pad, should be ignored by vec3 ops
            ];

            off += 8;
        }
        let Bit25 = undefined;
        if ((flag & ParticleFlags.Bit25) != 0) {
            //seems to be 4 int 16s typically in some kind of pattern.
            Bit25 = [];
            for (var i = 0; i < 8; i++) Bit25[i] = view.getUint8(off + i);
            off += 8;
        }
        let Bit26 = undefined;
        if ((flag & ParticleFlags.Bit26) != 0) {
            Bit26 = [];
            for (var i = 0; i < 16; i++) Bit26[i] = view.getUint8(off + i);
            off += 16;
        }
        let Bit27 = undefined;
        if ((flag & ParticleFlags.Bit27) != 0) {
            Bit27 = [];
            for (var i = 0; i < 4; i++) Bit27[i] = view.getUint8(off + i);
            off += 4;
        }

        let Bit28 = undefined;
        if ((flag & ParticleFlags.Bit28) != 0) {
            Bit28 = [];
            for (var i = 0; i < 8; i++) Bit28[i] = view.getUint8(off + i);
            off += 8;
        }

        let Bit29 = undefined;
        if ((flag & ParticleFlags.Bit29) != 0) {
            Bit29 = [];
            for (var i = 0; i < 16; i++) Bit29[i] = view.getUint8(off + i);
            off += 16;
        }

        return {
            parent: undefined,
            nextOff: off,
            ParticleFlags,
            flag,
            position,
            particleChance,
            areaSpread,
            unknown3,
            vector,
            color,
            randomxz,
            velocity,
            size,
            aspect,
            delay,
            rotVelFrom,
            rotVelTo,
            scX,
            scY,
            emitterLifetime,
            duration,
            varScale,
            varDuration,
            varUnk1,
            varUnk2,
            frequency,
            opacity,
            yOffIntensity,
            textureId,
            unknown21,
            unknown22,
            xScaleDelta,
            yScaleDelta,
            unknown25,
            scaleAnim,
            colorAnim,
            opacityAnim,
            texAnim,
            Bit16,
            gravity,
            Bit25,
            Bit26,
            Bit27,
            Bit28,
            Bit29,
        };
    }

    _readParticleTexture(view: DataView, off: number): spa_particuletexture {
        const stamp = MKSUtils.asciireadChar(view, off + 0x0) + MKSUtils.asciireadChar(view, off + 0x1) + MKSUtils.asciireadChar(view, off + 0x2) + MKSUtils.asciireadChar(view, off + 0x3);
        if (stamp != " TPS") throw "SPT invalid (particle texture in SPA). Expected ' TPS', found " + stamp;

        var flags = view.getUint16(off + 4, true);
        const info = {
            pal0trans: true,//z(flags>>3)&1, //weirdly different format
            format: ((flags) & 7),
            height: 8 << ((flags >> 8) & 0xF),
            width: 8 << ((flags >> 4) & 0xF),
            repeatX: (flags >> 12) & 1,
            repeatY: (flags >> 13) & 1,
            flipX: (flags >> 14) & 1,
            flipY: (flags >> 15) & 1,
        }

        const unknown = view.getUint16(off + 6, true);
        const texDataLength = view.getUint32(off + 8, true);
        const palOff = view.getUint32(off + 0xC, true);
        const palDataLength = view.getUint32(off + 0x10, true);
        const unknown2 = view.getUint32(off + 0x14, true);
        const unknown3 = view.getUint32(off + 0x18, true);
        const unknown4 = view.getUint32(off + 0x1C, true);

        const texData = view.buffer.slice(off + 32, off + 32 + texDataLength);
        off += 32 + texDataLength;
        const palData = view.buffer.slice(off, off + palDataLength);

        const nextOff = off + palDataLength;

        //var test = readTexWithPal(obj.info, obj);
        //document.body.appendChild(test);
        const glTex = null as CustomWebGLTexture;

        const obj = {
            stamp,
            info,
            flags,
            unknown,
            texDataLength,
            palOff,
            palDataLength,
            unknown2,
            unknown3,
            unknown4,
            texData,
            palData,
            nextOff,
            glTex
        }


        return obj;
    }


    //modified from NSBTX.js - should probably refactor to use be generic between both

    _readTexWithPal(tex: spa_particuletexture_infos, data: spa_particuletexture): HTMLCanvasElement {
        var format = tex.format;
        var trans = tex.pal0trans;

        if (format == 5) return this._readCompressedTex(tex); //compressed 4x4 texture, different processing entirely

        var off = 0;//tex.texOffset;
        var palView = new DataView(data.palData);
        var texView = new DataView(data.texData);
        var palOff = 0;//pal.palOffset;

        var canvas = document.createElement("canvas");
        canvas.width = tex.width;
        canvas.height = tex.height;
        var ctx = canvas.getContext("2d");
        var img = ctx.getImageData(0, 0, tex.width, tex.height);

        var total = tex.width * tex.height;
        var databuf;
        for (var i = 0; i < total; i++) {
            var col;
            if (format == 1) { //A3I5 encoding. 3 bits alpha 5 bits pal index
                var dat = texView.getUint8(off++)
                col = this._readPalColour(palView, palOff, dat & 31, trans);
                col[3] = (dat >> 5) * (255 / 7);
                this._premultiply(col);

            } else if (format == 2) { //2 bit pal
                if (i % 4 == 0) databuf = texView.getUint8(off++);
                col = this._readPalColour(palView, palOff, (databuf >> ((i % 4) * 2)) & 3, trans)

            } else if (format == 3) { //4 bit pal
                if (i % 2 == 0) {
                    databuf = texView.getUint8(off++);
                    col = this._readPalColour(palView, palOff, databuf & 15, trans)
                } else {
                    col = this._readPalColour(palView, palOff, databuf >> 4, trans)
                }

            } else if (format == 4) { //8 bit pal
                col = this._readPalColour(palView, palOff, texView.getUint8(off++), trans)

            } else if (format == 6) { //A5I3 encoding. 5 bits alpha 3 bits pal index
                var dat = texView.getUint8(off++)
                col = this._readPalColour(palView, palOff, dat & 7, trans);
                col[3] = (dat >> 3) * (255 / 31);
                this._premultiply(col);

            } else if (format == 7) { //raw color data
                col = texView.getUint16(off, true);
                this.colourBuffer[0] = Math.round(((col & 31) / 31) * 255)
                this.colourBuffer[1] = Math.round((((col >> 5) & 31) / 31) * 255)
                this.colourBuffer[2] = Math.round((((col >> 10) & 31) / 31) * 255)
                this.colourBuffer[3] = Math.round((col >> 15) * 255);
                col = this.colourBuffer;
                this._premultiply(col);
                off += 2;

            } else {
                // console.log("texture format is none, ignoring")
                return canvas;
            }
            img.data.set(col, i * 4);
        }
        ctx.putImageData(img, 0, 0)
        return canvas;
    }

    _premultiply(col: Uint32Array | number[]): void {
        col[0] *= col[3] / 255;
        col[1] *= col[3] / 255;
        col[2] *= col[3] / 255;
    }

    _readCompressedTex(tex: spa_particuletexture_infos): HTMLCanvasElement { //format 5, 4x4 texels. I'll keep this well documented so it's easy to understand.
        throw "compressed tex not supported for particles! (unknowns for tex data offsets and lengths?)";
    }

    _readPalColour(view: DataView, palOff: number, ind: number, pal0trans: boolean): Uint32Array {
        var col = view.getUint16(palOff + ind * 2, true);
        var f = 255 / 31;
        this.colourBuffer[0] = Math.round((col & 31) * f)
        this.colourBuffer[1] = Math.round(((col >> 5) & 31) * f)
        this.colourBuffer[2] = Math.round(((col >> 10) & 31) * f)
        this.colourBuffer[3] = (pal0trans && ind == 0) ? 0 : 255;
        return this.colourBuffer;
    }

    _readFractionalPal(view: DataView, palOff: number, i: number): Uint32Array {
        var col = view.getUint16(palOff, true);
        var col2 = view.getUint16(palOff + 2, true);
        var ni = 1 - i;
        var f = 255 / 31;
        this.colourBuffer[0] = Math.round((col & 31) * f * i + (col2 & 31) * f * ni)
        this.colourBuffer[1] = Math.round(((col >> 5) & 31) * f * i + ((col2 >> 5) & 31) * f * ni)
        this.colourBuffer[2] = Math.round(((col >> 10) & 31) * f * i + ((col2 >> 10) & 31) * f * ni)
        this.colourBuffer[3] = 255;
        return this.colourBuffer;
    }

    //end NSBTX
}