import { createHash } from "node:crypto";

export type TryOnHashInput = {
  poseMediaId: string;
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
