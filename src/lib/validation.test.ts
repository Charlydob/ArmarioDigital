import { describe,expect,it } from "vitest";
import { garmentSchema,outfitSchema } from "./validation";

describe("sensitive persistence validation",()=>{
  it("accepts multiple garments in the same zone and independent scaling",()=>{const parsed=outfitSchema.parse({name:"Capas",poseId:"pose_1",items:["shirt","knit"].map((garmentId,layerOrder)=>({garmentId,zone:"TORSO",layerOrder,x:450,y:400,scaleX:.5+layerOrder*.1,scaleY:.7,rotation:0,opacity:1}))});expect(parsed.items).toHaveLength(2);expect(parsed.items[1].scaleX).toBe(.6)});
  it("rejects invalid opacity and unknown zones",()=>{expect(outfitSchema.safeParse({name:"x",poseId:"p",items:[{garmentId:"g",zone:"ARMS",layerOrder:0,x:0,y:0,scaleX:1,scaleY:1,rotation:0,opacity:2}]}).success).toBe(false)});
  it("validates core garment data",()=>{expect(garmentSchema.safeParse({name:"",zone:"TORSO",subtype:"TOP",status:"OWNED"}).success).toBe(false);expect(garmentSchema.safeParse({name:"Top",zone:"TORSO",subtype:"TOP",status:"WISHLIST"}).success).toBe(true)});
});
