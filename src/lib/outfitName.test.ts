import { describe, expect, it } from "vitest";
import { defaultOutfitName } from "./outfitName";

describe("defaultOutfitName", () => {
  it("creates a useful Spanish timestamped name", () => {
    expect(defaultOutfitName(new Date("2026-10-06T07:45:00+02:00"))).toMatch(
      /^Look 6 oct 2026 · \d{2}:45$/,
    );
  });
});
