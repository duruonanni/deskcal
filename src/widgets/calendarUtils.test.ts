import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  buildRollingWeekGrid,
  dayPanelTitle,
  formatDay,
  headerDateLabel,
  isoWeek,
  isoWeeksInYear,
  monthTitle,
  weekdayLabels,
  weeksRemainingInYear,
} from "./calendarUtils";

describe("monthTitle", () => {
  it("formats Chinese year-month", () => {
    expect(monthTitle(2026, 7, "zh")).toBe("2026年8月");
  });

  it("formats English month year", () => {
    expect(monthTitle(2026, 7, "en")).toBe("August 2026");
  });
});

describe("weekdayLabels", () => {
  it("starts Monday in both locales", () => {
    expect(weekdayLabels("zh")[0]).toBe("一");
    expect(weekdayLabels("en")[0]).toBe("Mon");
  });
});

describe("dayPanelTitle", () => {
  it("includes weekday in Chinese", () => {
    expect(dayPanelTitle("2026-08-28", "zh")).toContain("周五");
  });
});

describe("buildMonthGrid", () => {
  it("still produces a six-week grid", () => {
    const grid = buildMonthGrid(2026, 7);
    expect(grid.weeks).toHaveLength(6);
    expect(grid.weeks[0]).toHaveLength(7);
  });
});

describe("isoWeek", () => {
  it("returns 35 for 2026-08-30 (Sunday)", () => {
    expect(isoWeek(new Date(2026, 7, 30))).toBe(35);
  });
});

describe("isoWeeksInYear", () => {
  it("returns 53 for 2026", () => {
    expect(isoWeeksInYear(2026)).toBe(53);
  });
});

describe("weeksRemainingInYear", () => {
  it("returns 18 for 2026-08-30", () => {
    expect(weeksRemainingInYear(new Date(2026, 7, 30))).toBe(18);
  });

  it("returns 0 in the last ISO week of the year", () => {
    const dec28 = new Date(2026, 11, 28);
    expect(isoWeek(dec28)).toBe(53);
    expect(weeksRemainingInYear(dec28)).toBe(0);
  });
});

describe("buildRollingWeekGrid", () => {
  const today = new Date(2026, 7, 30);

  it("places today in row 1", () => {
    const grid = buildRollingWeekGrid(today);
    const row1Days = grid.weeks[1]
      .filter((d): d is Date => d !== null)
      .map(formatDay);
    expect(row1Days).toContain("2026-08-30");
  });

  it("pads month breaks with null cells", () => {
    const grid = buildRollingWeekGrid(today);
    expect(grid.weeks[2]).toEqual([
      new Date(2026, 7, 31),
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(grid.weeks[3]).toEqual([
      null,
      new Date(2026, 8, 1),
      new Date(2026, 8, 2),
      new Date(2026, 8, 3),
      new Date(2026, 8, 4),
      new Date(2026, 8, 5),
      new Date(2026, 8, 6),
    ]);
  });

  it("lays out expected rows for 2026-08-30", () => {
    const grid = buildRollingWeekGrid(today);
    expect(
      grid.weeks[0].map((d) => (d ? formatDay(d) : null)),
    ).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ]);
    expect(
      grid.weeks[1].map((d) => (d ? formatDay(d) : null)),
    ).toEqual([
      "2026-08-24",
      "2026-08-25",
      "2026-08-26",
      "2026-08-27",
      "2026-08-28",
      "2026-08-29",
      "2026-08-30",
    ]);
    expect(
      grid.weeks[4].map((d) => (d ? formatDay(d) : null)),
    ).toEqual([
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
    ]);
    expect(grid.start).toBe("2026-08-17");
    expect(grid.end).toBe("2026-09-13");
  });
});

describe("headerDateLabel", () => {
  it("formats Chinese header without lunar", () => {
    expect(headerDateLabel(new Date(2026, 7, 30), "zh")).toBe("2026年8月30日 星期日");
  });

  it("formats English header", () => {
    expect(headerDateLabel(new Date(2026, 7, 30), "en")).toBe("Sun, Aug 30, 2026");
  });
});
