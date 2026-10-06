import { describe, expect, it } from "vitest";
import { carouselBandPositions, carouselItemAt, wrapCarouselIndex } from "./outfitCarousel";

describe("outfit carousel", () => {
  it("wraps in both swipe directions", () => {
    expect(wrapCarouselIndex(4, 4)).toBe(0);
    expect(wrapCarouselIndex(-1, 4)).toBe(3);
  });

  it("changes the active garment when the carousel index changes", () => {
    const garments = [{ id: "shirt" }, { id: "coat" }, { id: "pants" }];
    expect(carouselItemAt(garments, 0)?.id).toBe("shirt");
    expect(carouselItemAt(garments, 1)?.id).toBe("coat");
    expect(carouselItemAt(garments, 4)?.id).toBe("coat");
  });

  it("places bands from the selected pose anchors", () => {
    const positions = carouselBandPositions({
      head: 0.08,
      shoulders: 0.2,
      torso: 0.36,
      hips: 0.51,
      knees: 0.73,
      feet: 0.96,
    });
    expect(positions).toEqual({
      HEAD: 0.08,
      TORSO: 0.36,
      LEGS: 0.62,
      FEET: 0.96,
      ACCESSORY: 0.28,
    });
  });
});
