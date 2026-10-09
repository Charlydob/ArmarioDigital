import { createHash } from "node:crypto";

export type TryOnHashInput = {
  poseMediaId: string;
  provider?: string;
  category?: "tops" | "bottoms" | "one-pieces";
  garments: Array<{
    mediaId: string;
    zone: string;
    layerOrder: number;
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  }>;
};

export function createTryOnInputHash(input: TryOnHashInput) {
  const stable = {
    poseMediaId: input.poseMediaId,
    provider: input.provider || "runpod-fashn-vton-1.5",
    category: input.category,
    garments: [...input.garments]
      .sort((a, b) => a.layerOrder - b.layerOrder || a.mediaId.localeCompare(b.mediaId))
      .map((item) => ({
        ...item,
        x: +item.x.toFixed(3),
        y: +item.y.toFixed(3),
        scaleX: +item.scaleX.toFixed(4),
        scaleY: +item.scaleY.toFixed(4),
        rotation: +item.rotation.toFixed(3),
      })),
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

export function createTryOnProviderInputHash(input: import("./provider").TryOnInput, provider: string) {
  return createHash("sha256").update(JSON.stringify({
    provider, category: input.category,
    person: createHash("sha256").update(input.personImage).digest("hex"),
    garment: createHash("sha256").update(input.garmentImage).digest("hex"),
  })).digest("hex");
}
