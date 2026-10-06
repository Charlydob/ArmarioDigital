import { describe,expect,it } from "vitest";
import { garmentSchema,outfitSchema } from "./validation";

describe("sensitive persistence validation",()=>{
  it("accepts multiple garments in the same zone and independent scaling",()=>{const parsed=outfitSchema.parse({name:"Capas",poseId:"pose_1",items:["shirt","knit"].map((garmentId,layerOrder)=>({garmentId,zone:"TORSO",layerOrder,x:450,y:400,scaleX:.5+layerOrder*.1,scaleY:.7,rotation:0,opacity:1}))});expect(parsed.items).toHaveLength(2);expect(parsed.items[1].scaleX).toBe(.6)});
  it("rejects invalid opacity and unknown zones",()=>{expect(outfitSchema.safeParse({name:"x",poseId:"p",items:[{garmentId:"g",zone:"ARMS",layerOrder:0,x:0,y:0,scaleX:1,scaleY:1,rotation:0,opacity:2}]}).success).toBe(false)});
  it("rejects a repeated garment even when layers differ",()=>{const item={garmentId:"coat",zone:"TORSO",x:450,y:430,scaleX:.6,scaleY:.6,rotation:0,opacity:1};expect(outfitSchema.safeParse({name:"Duplicado",poseId:"p",items:[{...item,layerOrder:0},{...item,layerOrder:1}]}).success).toBe(false)});
  it("validates core garment data",()=>{expect(garmentSchema.safeParse({name:"",zone:"TORSO",subtype:"TOP",status:"OWNED"}).success).toBe(false);expect(garmentSchema.safeParse({name:"Top",zone:"TORSO",subtype:"TOP",status:"WISHLIST"}).success).toBe(true)});
  it("accepts an outfit without a pose",()=>{expect(outfitSchema.safeParse({name:"Flat",poseId:null,items:[{garmentId:"top",zone:"TORSO",layerOrder:0,x:450,y:330,scaleX:.34,scaleY:.34,rotation:0,opacity:1}]}).success).toBe(true)});
  it("round-trips an outfit without pose through persisted JSON",()=>{const saved=outfitSchema.parse({name:"Editorial",poseId:null,items:[{garmentId:"top",zone:"TORSO",layerOrder:0,x:450,y:330,scaleX:.34,scaleY:.34,rotation:0,opacity:1},{garmentId:"pants",zone:"LEGS",layerOrder:1,x:450,y:720,scaleX:.32,scaleY:.32,rotation:0,opacity:1}]});const opened=outfitSchema.parse(JSON.parse(JSON.stringify(saved)));expect(opened.poseId).toBeNull();expect(opened.items.map(item=>item.garmentId)).toEqual(["top","pants"])});
});
