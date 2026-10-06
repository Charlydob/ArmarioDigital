import { describe, expect, it } from "vitest";
import {
  appendUniqueGarment,
  applyPosePlacements,
  placementRenderSize,
  resolveGarmentPlacement,
  serializeOutfitItems,
} from "./placement";

const anchors = {
  head: 0.1,
  shoulders: 0.22,
  torso: 0.38,
  hips: 0.54,
  knees: 0.76,
  feet: 0.95,
};
const garment = {
  id: "coat",
  zone: "TORSO",
  placements: [
    { poseId: "front", x: 421, y: 438, scaleX: 0.68, scaleY: 0.58, rotation: 3, opacity: 0.9 },
    { poseId: "side", x: 510, y: 450, scaleX: 0.52, scaleY: 0.61, rotation: -7, opacity: 1 },
  ],
};

describe("garment placement", () => {
  it("uses the exact saved garment + pose placement", () => {
    expect(resolveGarmentPlacement(garment, "front", anchors)).toEqual(garment.placements[0]);
  });

  it("renders scale against the canonical 900px canvas, not PNG dimensions", () => {
    const size = placementRenderSize(486, 800, { scaleX: 0.57, scaleY: 0.55 });
    expect(size.width).toBe(513);
    expect(size.height).toBeCloseTo(814.8148, 4);
  });

  it("does not append a garment that is already in the outfit", () => {
    const current = [{ garmentId: "coat", value: 1 }];
    expect(appendUniqueGarment(current, { garmentId: "coat", value: 2 })).toBe(current);
    expect(appendUniqueGarment(current, { garmentId: "pants", value: 3 })).toHaveLength(2);
  });

  it("switching pose applies the placement saved for the new pose", () => {
    const item = { garmentId: "coat", zone: "TORSO", layerOrder: 0, instanceId: "one", ...garment.placements[0] };
    expect(applyPosePlacements([item], [garment], "side", anchors)[0]).toMatchObject(garment.placements[1]);
  });

  it("serialization preserves transforms and layer order across reload", () => {
    const items = [
      { garmentId: "pants", zone: "LEGS", layerOrder: 8, instanceId: "two", ...garment.placements[1] },
      { garmentId: "coat", zone: "TORSO", layerOrder: 2, instanceId: "one", ...garment.placements[0] },
    ];
    const persisted = JSON.parse(JSON.stringify(serializeOutfitItems(items)));
    expect(persisted.map((item: { garmentId: string; layerOrder: number }) => [item.garmentId, item.layerOrder])).toEqual([
      ["coat", 0],
      ["pants", 1],
    ]);
    expect(persisted[0]).toMatchObject({ x: 421, y: 438, scaleX: 0.68, scaleY: 0.58, rotation: 3 });
  });
});
