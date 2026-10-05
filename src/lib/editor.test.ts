import { describe,expect,it } from "vitest";
import { clampTransform,moveLayer,normalizeLayers } from "./editor";

describe("layer ordering",()=>{
  const items=[{id:"coat",layerOrder:9},{id:"shirt",layerOrder:2},{id:"pants",layerOrder:5}];
  it("normalizes layers without mutating the source",()=>{expect(normalizeLayers(items).map(x=>[x.id,x.layerOrder])).toEqual([["shirt",0],["pants",1],["coat",2]]);expect(items[0].layerOrder).toBe(9)});
  it("moves one layer and keeps a contiguous order",()=>{expect(moveLayer(items,1,1).map(x=>x.id)).toEqual(["shirt","coat","pants"]);expect(moveLayer(items,0,-1).map(x=>x.id)).toEqual(["shirt","pants","coat"])});
});

describe("editor transforms",()=>{it("clamps unsafe or unusable values",()=>{expect(clampTransform({x:9999,y:-9999,scaleX:0,scaleY:20,rotation:999,opacity:0})).toEqual({x:1800,y:-1200,scaleX:.05,scaleY:8,rotation:180,opacity:.05})})});
