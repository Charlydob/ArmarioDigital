import { describe, expect, it } from "vitest";
import { isoDate, monthGrid, parseCalendarDate } from "./calendar";

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
});
