import { describe, expect, it } from "vitest";
import { createTryOnInputHash, createTryOnProviderInputHash } from "./hash";

describe("createTryOnInputHash", () => {
  const input = {
    poseMediaId: "pose",
    garments: [{ mediaId: "top", zone: "TORSO", layerOrder: 0, x: 1, y: 2, scaleX: 1, scaleY: 1, rotation: 0 }],
  };
  it("separates model and category", () => {
    expect(createTryOnInputHash({ ...input, category: "tops" })).not.toBe(createTryOnInputHash({ ...input, category: "one-pieces" }));
    expect(createTryOnInputHash({ ...input, provider: "next-model" })).not.toBe(createTryOnInputHash(input));
  });
  it("is stable", () => expect(createTryOnInputHash(input)).toBe(createTryOnInputHash(structuredClone(input))));
  it("changes with relevant transforms", () => expect(createTryOnInputHash(input)).not.toBe(createTryOnInputHash({ ...input, garments: [{ ...input.garments[0], x: 3 }] })));
});

describe("provider input hash", () => {
  const input = { personImage: Buffer.from("person"), garmentImage: Buffer.from("garment"), category: "tops" as const };
  it("uses exact image bytes, model and category", () => {
    const base = createTryOnProviderInputHash(input, "fashn-v1.5");
    expect(base).toBe(createTryOnProviderInputHash({ ...input }, "fashn-v1.5"));
    expect(base).not.toBe(createTryOnProviderInputHash({ ...input, personImage: Buffer.from("different") }, "fashn-v1.5"));
    expect(base).not.toBe(createTryOnProviderInputHash({ ...input, garmentImage: Buffer.from("different") }, "fashn-v1.5"));
    expect(base).not.toBe(createTryOnProviderInputHash({ ...input, category: "one-pieces" }, "fashn-v1.5"));
    expect(base).not.toBe(createTryOnProviderInputHash(input, "other-model"));
  });
});
