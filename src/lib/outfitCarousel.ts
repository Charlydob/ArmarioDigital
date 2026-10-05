import { type PoseAnchors } from "./labels";

export function wrapCarouselIndex(index: number, length: number) {
  if (length < 1) return 0;
  return ((index % length) + length) % length;
}

export function carouselBandPositions(anchors: PoseAnchors) {
  return {
    HEAD: anchors.head,
    TORSO: anchors.torso,
    LEGS: (anchors.hips + anchors.knees) / 2,
    FEET: anchors.feet,
    ACCESSORY: (anchors.shoulders + anchors.torso) / 2,
  };
}
