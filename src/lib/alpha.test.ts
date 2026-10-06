import { describe, expect, it } from "vitest";
import { decontaminateAlphaEdges } from "./alpha";

describe("alpha edge decontamination", () => {
  it("removes a white matte without changing useful alpha", () => {
    const result = decontaminateAlphaEdges(new Uint8ClampedArray([230, 210, 205, 128]));
    expect([...result]).toEqual([205, 165, 155, 128]);
  });

  it("leaves opaque garment pixels untouched", () => {
    const source = new Uint8ClampedArray([240, 240, 240, 255]);
    expect([...decontaminateAlphaEdges(source)]).toEqual([...source]);
  });
});
