import { describe, expect, it } from "vitest";
import { dayPanelTitle, monthTitle, weekdayLabels } from "./calendarUtils";

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
