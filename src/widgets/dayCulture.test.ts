import { describe, expect, it } from "vitest";
import { cellBadges, holidayMark, lunarLabel, setHolidayMap } from "./dayCulture";
import { parseDay } from "./calendarUtils";
import holidaysData from "../../data/cn-holidays.json";

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

  it("uses injected map when set", () => {
    setHolidayMap({
      "2099-01-01": { kind: "rest", name: "测试" },
    });
    expect(holidayMark("2099-01-01")).toEqual({ kind: "rest", name: "测试" });
    setHolidayMap(null);
    expect(holidayMark("2026-01-01")).toEqual({ kind: "rest", name: "元旦" });
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

describe("cellBadges", () => {
  it("shows rest badge without duplicating festival name on 春节", () => {
    const badges = cellBadges("2026-02-17", parseDay("2026-02-17"));
    expect(badges.some((b) => b.kind === "rest")).toBe(true);
    expect(badges.some((b) => b.kind === "festival")).toBe(false);
  });

  it("falls back to bundled map after reset", () => {
    setHolidayMap(holidaysData.days as Record<string, { kind: "rest" | "work"; name: string }>);
    expect(holidayMark("2026-01-01")?.name).toBe("元旦");
  });
});
