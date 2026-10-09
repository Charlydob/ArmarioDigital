import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), garment: vi.fn(), pose: vi.fn(), outfit: vi.fn() }));
vi.mock("@/lib/auth",()=>({getUser:mocks.getUser}));
vi.mock("@/lib/db",()=>({db:{garment:{updateMany:mocks.garment},pose:{updateMany:mocks.pose},outfit:{updateMany:mocks.outfit}}}));
import { PATCH } from "./[kind]/[id]/route";
const request=(body:unknown,origin="http://localhost")=>new Request("http://localhost/api/favorites/garment/item",{method:"PATCH",headers:{"Content-Type":"application/json",origin},body:JSON.stringify(body)});
describe("owned, idempotent favorites",()=>{
  beforeEach(()=>{vi.unstubAllEnvs();vi.resetAllMocks();mocks.getUser.mockResolvedValue({id:"owner"});for(const fn of [mocks.garment,mocks.pose,mocks.outfit])fn.mockResolvedValue({count:1});});
  for(const kind of ["garment","pose","outfit"] as const)it(`${kind}: saves explicit value with owner scope`,async()=>{const response=await PATCH(request({favorite:true}),{params:Promise.resolve({kind,id:"item"})});expect(response.status).toBe(200);expect(mocks[kind]).toHaveBeenCalledWith({where:{id:"item",ownerId:"owner"},data:{favorite:true}});expect(await response.json()).toEqual({favorite:true});});
  it("removes favorites",async()=>{await PATCH(request({favorite:false}),{params:Promise.resolve({kind:"pose",id:"item"})});expect(mocks.pose).toHaveBeenCalledWith(expect.objectContaining({data:{favorite:false}}));});
  it("rejects anonymous calls",async()=>{mocks.getUser.mockResolvedValue(null);expect((await PATCH(request({favorite:true}),{params:Promise.resolve({kind:"pose",id:"item"})})).status).toBe(401);expect(mocks.pose).not.toHaveBeenCalled();});
  it("supports the canonical HTTPS origin behind Caddy", async()=>{vi.stubEnv("NEXT_PUBLIC_APP_URL","https://armario.charlydob.com");expect((await PATCH(request({favorite:true},"https://armario.charlydob.com"),{params:Promise.resolve({kind:"pose",id:"item"})})).status).toBe(200);});
  it("rejects foreign origin",async()=>{expect((await PATCH(request({favorite:true},"https://foreign.example"),{params:Promise.resolve({kind:"pose",id:"item"})})).status).toBe(403);expect(mocks.pose).not.toHaveBeenCalled();});
  it("does not expose another owner's resource",async()=>{mocks.garment.mockResolvedValue({count:0});expect((await PATCH(request({favorite:true}),{params:Promise.resolve({kind:"garment",id:"other"})})).status).toBe(404);});
  it("rejects invalid kind and non-boolean input",async()=>{expect((await PATCH(request({favorite:1}),{params:Promise.resolve({kind:"pose",id:"item"})})).status).toBe(400);expect((await PATCH(request({favorite:true}),{params:Promise.resolve({kind:"user",id:"item"})})).status).toBe(404);});
});
