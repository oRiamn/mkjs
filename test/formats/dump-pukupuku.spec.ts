import { describe, it, expect } from "vitest";
import { nsbmd } from "../../src/formats/nsbmd";
import { nitroModel } from "../../src/render/nitroModel";
import { loadCourseCarc, BEACH_COURSE, romExists } from "../helpers/rom";

describe.skipIf(!romExists)("dump pukupuku", () => {
  it("model has geometry", () => {
    const mdl = new nsbmd(loadCourseCarc(BEACH_COURSE).getFile("/MapObj/pukupuku.nsbmd")!);
    const obj = mdl.modelData.objectData[0];
    expect(obj.head.numTriangles + obj.head.numQuads).toBeGreaterThan(0);
    console.log("tris:", obj.head.numTriangles, "quads:", obj.head.numQuads, "verts:", obj.head.numVerts);
    console.log("materials:", obj.materials.numObjects, "textures:", obj.tex.numObjects);
    const nm = new nitroModel(mdl, null);
    console.log("nitroModel loaded, bmd names:", mdl.modelData.names);
  });
});
