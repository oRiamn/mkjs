//
// tileFlattener.js
//--------------------
// Renders screens or cells to 2d canvas. Useful for drawing UI elements from the ROM.
// by RHY3756547
//
// includes: main.js
//

import { ncer, NcerCebkImage } from "../../formats/2d/ncer";
import { ncgr } from "../../formats/2d/ncgr";
import { NclrPaletteColor, nclr } from "../../formats/2d/nclr";

const BASE_VERTEX_SHADER = `
attribute vec4 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;

varying vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = a_texcoord;
}
`;

const BASE_FRAGMENT_SHADER = `
precision mediump float;

varying vec2 v_texcoord;

uniform sampler2D u_texture;

void main() {
  gl_FragColor = texture2D(u_texture, v_texcoord);
}
`;
export class TileFlattener {

    cellMode: boolean;
    tileCache: Map<string, HTMLCanvasElement>;
    zero: NclrPaletteColor;
    emptyTile: Uint8ClampedArray;
    texture: CustomWebGLTexture;
    textures: Map<number, CustomWebGLTexture>;
    program: WebGLProgram;
    positionLocation: number;
    texcoordLocation: number;
    matrixLocation: WebGLUniformLocation;
    textureLocation: WebGLUniformLocation;
    positionBuffer: WebGLBuffer;
    texcoordBuffer: WebGLBuffer;
    proj: mat4;
    pos: vec3;
    palette: nclr;
    tiles: ncgr;
    map: ncer;

    constructor(palette: nclr, tiles: ncgr, map: ncer) {
        this.palette = palette;
        this.tiles = tiles;
        this.map = map;
        this.cellMode = this.map.cebk != null;

        this.tileCache = new Map();
        this.zero = [0, 0, 0, 0];
        this.emptyTile = new Uint8ClampedArray(64);


        this.texture = gl.createTexture() as CustomWebGLTexture;
        this.textures = new Map();

        this.program = gl.createProgram();
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (vertexShader && fragmentShader) {
            gl.shaderSource(vertexShader, BASE_VERTEX_SHADER);
            gl.compileShader(vertexShader);

            gl.shaderSource(fragmentShader, BASE_FRAGMENT_SHADER);
            gl.compileShader(fragmentShader);

            gl.attachShader(this.program, vertexShader);
            gl.attachShader(this.program, fragmentShader);
            gl.linkProgram(this.program);
        }

        // look up where the vertex data needs to go.
        this.positionLocation = gl.getAttribLocation(this.program, "a_position");
        this.texcoordLocation = gl.getAttribLocation(this.program, "a_texcoord");

        // lookup uniforms
        this.matrixLocation = gl.getUniformLocation(this.program, "u_matrix");
        this.textureLocation = gl.getUniformLocation(this.program, "u_texture");

        // Create a buffer.
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

        // Put a unit quad in the buffer
        var positions = [
            0, 0,
            0, 1,
            1, 0,
            1, 0,
            0, 1,
            1, 1,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);


        // Create a buffer for texture coords
        this.texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);

        // Put texcoords in the buffer
        var texcoords = [
            0, 0,
            0, 1,
            1, 0,
            1, 0,
            0, 1,
            1, 1,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

        this.proj = mat4.create();
        this.pos = vec3.clone([0, 0, 0]);

    }

    getTileImg(pal0trans: boolean, tile: number, pal: number) {
        var cacheID = tile + ":" + pal;
        if (this.tileCache.has(cacheID)) {
            return this.tileCache.get(cacheID);
        }
        //make the tile
        var canvas = document.createElement("canvas");
        canvas.width = 8;
        canvas.height = 8;
        var ctx = canvas.getContext("2d");

        if (canvas !== null && ctx !== null) {
            var d = new Uint8ClampedArray(8 * 8 * 4);
            var data = new ImageData(d, 8, 8);
            var targ = 0;
            var colors = this.palette.pltt.palettes[pal] || [];
            var tileData = this.tiles.char.tiles[tile] || this.emptyTile;
            for (var i = 0; i < 64; i++) {
                var colID = tileData[i];
                let col: NclrPaletteColor;
                if (pal0trans && colID == 0) {
                    col = this.zero;
                } else {
                    col = colors[colID] || this.zero
                }

                d[targ++] = col[0];
                d[targ++] = col[1];
                d[targ++] = col[2];
                d[targ++] = col[3];
            }

            ctx.putImageData(data, 0, 0);

            this.tileCache.set(cacheID, canvas)
        }
        return canvas;
    }

    calcImageSize(image: NcerCebkImage) {
        var xMin = 65536;
        var yMin = 65536;
        var xMax = 0;
        var yMax = 0;
        for (var i = 0; i < image.cells.length; i++) {
            var cell = image.cells[i];
            var size = cell.size;
            var x = cell.x + size[0];
            if (x > xMax) xMax = x;
            x -= size[0];
            if (x < xMin) xMin = x;
            var y = cell.y + size[1];
            if (y > yMax) yMax = y;
            y -= size[1];
            if (y < yMin) yMin = y;
        }
        return [xMin, yMin, xMax, yMax];
    }

    toCanvas(pal0trans: boolean, imageInd: number) {
        var canvas = document.createElement("canvas");
        if (this.cellMode) {
            //essentially a collection of ds sprites
            //render out the image the user has requested
            var image = this.map.cebk.images[imageInd];
            var isize = this.calcImageSize(image);

            canvas.width = isize[2] - isize[0];
            canvas.height = isize[3] - isize[1];
            var ctx = canvas.getContext("2d");

            if (ctx !== null) {
                var tileWidth = this.tiles.char.tilesX as number;
                image.cells.sort(function (a: { priority: number; }, b: { priority: number; }) { return b.priority - a.priority });

                for (var i = image.cells.length - 1; i >= 0; i--) {
                    var cell = image.cells[i];

                    var size = cell.size;
                    var sx2 = size[0] / 2;
                    var sy2 = size[1] / 2;
                    ctx.save();
                    ctx.translate(cell.x + sx2 - isize[0], cell.y + sy2 - isize[1]);
                    ctx.scale(cell.xFlip ? (-1) : 1, cell.yFlip ? (-1) : 1);

                    var tile = cell.tileOffset as number
                    var pal = cell.pal as number
                    ctx.strokeStyle = "white";
                    if (cell.disable) continue;

                    //draw oam sprite
                    var base = tile;
                    for (var y = 0; y < size[1]; y += 8) {
                        for (var x = 0; x < size[0]; x += 8) {
                            var img = this.getTileImg(pal0trans, tile++, pal);
                            if (!!img) {
                                ctx.drawImage(img, x - sx2, y - sy2);
                            }
                        }
                        if (tileWidth != 65535) { //when defined, wrap to the next row when drawing a lower portion of the sprite
                            base += tileWidth;
                            tile = base;
                        }
                    }
                    ctx.restore();
                }
            }

        }
        return canvas;
    }

    toTexture(pal0trans: boolean, imageInd: number): CustomWebGLTexture {
        const image = new Image();
        image.crossOrigin = "Anonymous";
        image.src = this.toCanvas(pal0trans, imageInd).toDataURL();
        const texture = gl.createTexture() as CustomWebGLTexture;
        texture.width = 0;
        texture.height = 0;
        image.onload = () => {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            texture.width = image.width;
            texture.height = image.height;
        };

        return texture;
    }

    loadTextue(i: number) {
        if (this.textures.has(i)) {
            this.texture = this.textures.get(i)
        } else {
            const texture = this.toTexture(true, i);
            this.textures.set(i, texture);
            this.texture = texture;
        }

        return this.texture;
    }

    debugTileSet() {
        for (let i = 0; i < this.map.cebk.imageCount; i++) {
            var render = this.toCanvas(true, i);
            render.setAttribute("tile", `${i}`);
            document.body.appendChild(render);
        }
    }

    draw(x: number, y: number, zoom?: number) {

        if (zoom === undefined) {
            zoom = 1
        }
        this.drawTexture(
            this.texture,
            zoom * this.texture.width,
            zoom * this.texture.height,
            x,
            y);
    }

    drawTexture(tex: CustomWebGLTexture, texWidth: number, texHeight: number, dstX: number, dstY: number) {
        // Tell WebGL to use our shader program pair
        gl.useProgram(this.program);
        gl.bindTexture(gl.TEXTURE_2D, tex);



        // Setup the attributes to pull data from our buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.enableVertexAttribArray(this.texcoordLocation);
        gl.vertexAttribPointer(this.texcoordLocation, 2, gl.FLOAT, false, 0, 0);

        // this matrix will convert from pixels to clip space
        mat4.ortho(this.proj, 0, gl.canvas.width, gl.canvas.height, 0, -1, 1);


        this.pos[0] = dstX;
        this.pos[1] = dstY;


        mat4.translate(this.proj, this.proj, this.pos);


        // this matrix will scale our 1 unit quad
        // from 1 unit to texWidth, texHeight units
        mat4.scale(this.proj, this.proj, [texWidth, texHeight, 1]);

        // Set the matrix.
        gl.uniformMatrix4fv(this.matrixLocation, false, this.proj);

        // Tell the shader to get the texture from texture unit 0
        gl.uniform1i(this.textureLocation, 0);

        // draw the quad (2 triangles, 6 vertices)
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

