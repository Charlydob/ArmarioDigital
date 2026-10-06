import { describe, expect, it } from "vitest";
import { entriesByDate, isoDate, monthGrid, parseCalendarDate } from "./calendar";

describe("calendar helpers", () => {
  it("builds a six-week Monday-first month grid", () => {
    const days = monthGrid(2026, 9);
    expect(days).toHaveLength(42);
    expect(days[0].getUTCDay()).toBe(1);
    expect(isoDate(days[0])).toBe("2026-09-28");
    expect(isoDate(days[41])).toBe("2026-11-08");
  });

  it("accepts real ISO dates and rejects rolled dates", () => {
    expect(isoDate(parseCalendarDate("2026-10-05"))).toBe("2026-10-05");
    expect(() => parseCalendarDate("2026-02-30")).toThrow("Fecha no válida");
  });

  it("exposes an assigned outfit to calendar and weekly consumers", () => {
    const assignment = { date: "2026-10-06T00:00:00.000Z", outfitId: "look-1", type: "PLANNED" };
    const indexed = entriesByDate([assignment]);
    expect(indexed.get("2026-10-06")).toEqual(assignment);
  });
});
