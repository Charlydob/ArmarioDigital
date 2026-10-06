import { describe, expect, it } from "vitest";
import { createTryOnInputHash } from "./hash";

describe("createTryOnInputHash", () => {
  const input = {
    poseMediaId: "pose",
    garments: [{ mediaId: "top", zone: "TORSO", layerOrder: 0, x: 1, y: 2, scaleX: 1, scaleY: 1, rotation: 0 }],
  };
  it("is stable", () => expect(createTryOnInputHash(input)).toBe(createTryOnInputHash(structuredClone(input))));
  it("changes with relevant transforms", () => expect(createTryOnInputHash(input)).not.toBe(createTryOnInputHash({ ...input, garments: [{ ...input.garments[0], x: 3 }] })));
});
