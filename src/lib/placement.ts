import { defaultAnchors, type PoseAnchors } from "./labels";
import { normalizeLayers } from "./editor";

export const PLACEMENT_CANVAS_WIDTH = 900;
export const PLACEMENT_CANVAS_HEIGHT = 1200;

export type PlacementTransform = {
  poseId: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
};

export type PlacementGarment = {
  id: string;
  zone: string;
  placements: PlacementTransform[];
};

const fallbackScale: Record<string, number> = {
  HEAD: 0.3,
  TORSO: 0.5,
  LEGS: 0.55,
  FEET: 0.35,
  ACCESSORY: 0.32,
};

function fallbackY(zone: string, anchors: PoseAnchors) {
  if (zone === "HEAD") return anchors.head * PLACEMENT_CANVAS_HEIGHT;
  if (zone === "TORSO") return anchors.torso * PLACEMENT_CANVAS_HEIGHT;
  if (zone === "LEGS")
    return ((anchors.hips + anchors.knees) / 2) * PLACEMENT_CANVAS_HEIGHT;
  if (zone === "FEET") return anchors.feet * PLACEMENT_CANVAS_HEIGHT;
  return ((anchors.shoulders + anchors.torso) / 2) * PLACEMENT_CANVAS_HEIGHT;
}

export function resolveGarmentPlacement(
  garment: PlacementGarment,
  poseId: string,
  anchors: PoseAnchors = defaultAnchors,
): PlacementTransform {
  const saved = garment.placements.find((placement) => placement.poseId === poseId);
  if (saved) return { ...saved };
  const scale = fallbackScale[garment.zone] ?? fallbackScale.ACCESSORY;
  return {
    poseId,
    x: PLACEMENT_CANVAS_WIDTH / 2,
    y: fallbackY(garment.zone, anchors),
    scaleX: scale,
    scaleY: scale,
    rotation: 0,
    opacity: 1,
  };
}

const flatLayout: Record<string, { x: number; y: number; scale: number }> = {
  HEAD: { x: 220, y: 150, scale: 0.2 },
  TORSO: { x: 450, y: 330, scale: 0.34 },
  LEGS: { x: 450, y: 720, scale: 0.32 },
  FEET: { x: 450, y: 1060, scale: 0.25 },
  ACCESSORY: { x: 700, y: 250, scale: 0.2 },
};

export function resolveFlatPlacement(garment: Pick<PlacementGarment, "id" | "zone">) {
  const layout = flatLayout[garment.zone] ?? flatLayout.ACCESSORY;
  return {
    poseId: "",
    x: layout.x,
    y: layout.y,
    scaleX: layout.scale,
    scaleY: layout.scale,
    rotation: 0,
    opacity: 1,
  } satisfies PlacementTransform;
}

export function placementRenderSize(
  sourceWidth: number,
  sourceHeight: number,
  placement: Pick<PlacementTransform, "scaleX" | "scaleY">,
) {
  const aspect = sourceWidth > 0 ? sourceHeight / sourceWidth : 1;
  return {
    width: PLACEMENT_CANVAS_WIDTH * placement.scaleX,
    height: PLACEMENT_CANVAS_WIDTH * aspect * placement.scaleY,
  };
}

export function appendUniqueGarment<T extends { garmentId: string }>(
  items: T[],
  item: T,
) {
  return items.some((candidate) => candidate.garmentId === item.garmentId)
    ? items
    : [...items, item];
}

export function applyPosePlacements<
  T extends PlacementTransform & { garmentId: string },
>(
  items: T[],
  garments: PlacementGarment[],
  poseId: string,
  anchors: PoseAnchors = defaultAnchors,
) {
  return items.map((item) => {
    const garment = garments.find((candidate) => candidate.id === item.garmentId);
    if (!garment) return { ...item, poseId };
    return {
      ...item,
      ...(poseId
        ? resolveGarmentPlacement(garment, poseId, anchors)
        : resolveFlatPlacement(garment)),
    };
  });
}

export function serializeOutfitItems<
  T extends PlacementTransform & {
    garmentId: string;
    zone: string;
    layerOrder: number;
  },
>(items: T[]) {
  return normalizeLayers(items).map(
    ({ garmentId, zone, layerOrder, x, y, scaleX, scaleY, rotation, opacity }) => ({
      garmentId,
      zone,
      layerOrder,
      x,
      y,
      scaleX,
      scaleY,
      rotation,
      opacity,
    }),
  );
}
