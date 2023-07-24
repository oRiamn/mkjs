//
// ncer.js
//--------------------
// Loads ncer files and provides a variety of functions for accessing and using the data.
// Cell data for nitro 2d graphics. Multiple images made out of multiple cells, sharing an input palette and ncgr.
// by RHY3756547
//

import { nitro } from "../nitro"
import { MKSUtils } from "../utils"

export type NcerCebkImageCell = {
    x: number,
    y: number,
    rsFlag: boolean,
    disable: boolean,
    doubleSize: boolean,
    objMode: number,
    mosaic: boolean,
    depth: boolean,
    shape: number,
    xFlip: boolean,
    yFlip: boolean,
    selectParam: number,
    size: [number, number],
    tileOffset: number,
    priority: number,
    pal: number,
}
export type NcerCebkImage = {
    numCells: number,
    readOnlyInfo: number,
    offset: number,
    xMax?: number,
    yMax?: number,
    xMin?: number,
    yMin?: number,
    cells: NcerCebkImageCell[]

}

type NcerCebk = {
    type: string,
    blockSize: number,
    imageCount: number,
    bankType: number,
    unknown: number,
    boundarySize: number,
    partitionDataOffset: number,
    images: NcerCebkImage[]
}

export class ncer implements MKJSDataFormator {
    input: MKJSDataInput;
    mainOff: number;
    dimensions: number[][][];
    sectionOffsets: number[];
    cebk: NcerCebk;
    constructor(input: MKJSDataInput) {
        this.input = input;
        this.dimensions = [ //indexed by width, then height
            [[8, 8], [16, 8], [8, 16]],
            [[16, 16], [32, 8], [8, 32]],
            [[32, 32], [32, 16], [16, 32]],
            [[64, 64], [64, 32], [32, 64]],
        ]

        this.mainOff = undefined;
        if (this.input != null) {
            this.load(this.input);
        }
        this.load = this.load;
    }

    load(input: MKJSDataInput) {
        var view = new DataView(input);
        var header = null;
        var offset = 0;
        var tex;

        //nitro 3d header
        header = nitro.readHeader(view);
        if (header.stamp != "RECN") throw "NCER invalid. Expected RECN, found " + header.stamp;
        if (header.numSections < 1 || header.numSections > 3) throw "NCER invalid. Too many sections - should have 1-3.";
        //end nitro
        this.sectionOffsets = header.sectionOffsets;
        this.sectionOffsets[0] = 0x18;

        this.mainOff = offset;

        this.cebk = this._loadCEBK(view);
        /* ignore for now
        t.labl = loadLABL(view);
        t.uext = loadUEXT(view); //external data?
        */
    }

    _getSize(shape: number, size: number, double: boolean): [number, number] {
        var dim = this.dimensions[size][shape];
        if (double) return [dim[0] * 2, dim[1] * 2];
        return [dim[0], dim[1]];
    }

    _readOAM(view: DataView, offset: number): NcerCebkImageCell {
        //see ds docs. really, any of them?
        var obj0 = view.getUint16(offset, true);
        var obj1 = view.getUint16(offset + 2, true);
        var obj2 = view.getUint16(offset + 4, true);

        var rsFlag = (obj0 & 0x100) > 0;
        var x = obj1 & 0x01FF;
        var y = obj0 & 0xFF;
        const size = (obj1 >> 14) & 0x3;
        const shape = (obj0 >> 14) & 0x3;  //used in combination with size to determine final x+y tile size.
        const doubleSize = (rsFlag && (obj0 & 0x200) > 0);

        return {
            y: (y > 0x80) ? y - 0x100 : y,
            rsFlag: rsFlag,
            disable: (!rsFlag && (obj0 & 0x200) > 0),
            doubleSize,
            objMode: (obj0 >> 10) & 0x3,
            mosaic: (obj0 & 0x1000) > 0,
            depth: (obj0 & 0x2000) > 0,
            shape,

            x: (x > 0x100) ? x - 0x200 : x,

            xFlip: (!rsFlag && (obj1 & 0x1000) > 0),
            yFlip: (!rsFlag && (obj1 & 0x2000) > 0),

            selectParam: rsFlag ? ((obj1 >> 9) & 0x1F) : 0,
            size: this._getSize(shape, size, doubleSize),

            tileOffset: obj2 & 0x03FF,
            priority: (obj2 >> 10) & 3,
            pal: (obj2 >> 12) & 0xF,
        };
    }

    _loadCEBK(view: DataView) { //cell bank
        var offset = this.sectionOffsets[0] - 8;

        const type = MKSUtils.asciireadChar(view, offset + 0x0) + MKSUtils.asciireadChar(view, offset + 0x1) + MKSUtils.asciireadChar(view, offset + 0x2) + MKSUtils.asciireadChar(view, offset + 0x3);
        if (type != "KBEC") throw "NCER invalid. Expected KBEC, found " + type;
        const blockSize = view.getUint32(offset + 0x4, true);
        const imageCount = view.getUint16(offset + 0x8, true);
        const bankType = view.getUint16(offset + 0xA, true); //type 1 has additional fields
        const unknown = view.getUint32(offset + 0xC, true); //always 0x12
        const boundarySize = view.getUint32(offset + 0x10, true) * 64; //area in which the image can be drawn (pixel height AND width)
        const partitionDataOffset = view.getUint32(offset + 0x14, true);
        //pad 0x18
        //pad 0x1C

        const images = [];

        offset += 0x20;
        var tableEnd = offset + imageCount * (8 + bankType * 8);
        for (var i = 0; i < imageCount; i++) {
            const numCells = view.getUint16(offset, true);
            const readOnlyInfo = view.getUint16(offset + 0x2, true);
            const imageoffset = view.getInt32(offset + 0x4, true);
            let xMax: number;
            let yMax: number;
            let xMin: number;
            let yMin: number;
            offset += 0x8;
            if (bankType == 1) {
                xMax = view.getInt16(offset, true);
                yMax = view.getInt16(offset + 2, true);
                xMin = view.getInt16(offset + 4, true);
                yMin = view.getInt16(offset + 6, true);
                offset += 0x8;
            }

            var offset2 = tableEnd + imageoffset;
            const cells = [];
            for (var j = 0; j < numCells; j++) {
                var cell = this._readOAM(view, offset2);
                offset2 += 6;
                cells.push(cell);
            }
            images.push({
                offset: imageoffset,
                numCells,
                readOnlyInfo,
                xMax,
                yMax,
                xMin,
                yMin,
                cells,
                partitionOffset: <number>undefined,
                partitionSize: <number>undefined,
            });
        }

        let maxPartitionSize: number;
        let firstOffset: number;
        if (partitionDataOffset != 0) { //not sure what this does, just that it's here
            var pOff = this.sectionOffsets[0] + partitionDataOffset;
            maxPartitionSize = view.getUint32(pOff, true);
            firstOffset = view.getUint32(pOff + 4, true);
            pOff += firstOffset;
            for (var i = 0; i < imageCount; i++) {
                images[i].partitionOffset = view.getUint32(pOff, true);
                images[i].partitionSize = view.getUint32(pOff + 4, true);
                pOff += 8;
            }
        }

        return {
            type,
            blockSize,
            imageCount,
            bankType,
            unknown,
            boundarySize,
            partitionDataOffset,
            images,
            maxPartitionSize,
            firstOffset,
        };
    }
}