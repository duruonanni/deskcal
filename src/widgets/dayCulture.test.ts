import { describe, expect, it } from "vitest";
import { holidayMark, lunarLabel } from "./dayCulture";
import { parseDay } from "./calendarUtils";

describe("holidayMark", () => {
  it("2026-01-01 is rest 元旦", () => {
    expect(holidayMark("2026-01-01")).toEqual({ kind: "rest", name: "元旦" });
  });

  it("2026-01-04 is work", () => {
    expect(holidayMark("2026-01-04")).toEqual({
      kind: "work",
      name: "元旦调班",
    });
  });

  it("2026-02-17 is rest 春节", () => {
    expect(holidayMark("2026-02-17")).toEqual({ kind: "rest", name: "春节" });
  });
});

describe("lunarLabel", () => {
  it("returns festival name on 春节", () => {
    expect(lunarLabel(parseDay("2026-02-17"))).toBe("春节");
  });

  it("returns lunar day when no festival", () => {
    expect(lunarLabel(parseDay("2026-01-01"))).toBe("十三");
  });
});
