import { Solar } from "lunar-javascript";
import holidaysData from "../../data/cn-holidays.json";

export type HolidayMark = { kind: "rest" | "work"; name: string };

const holidayMap = holidaysData.days as Record<string, HolidayMark>;

export function holidayMark(day: string): HolidayMark | null {
  return holidayMap[day] ?? null;
}

/** Lunar day or traditional festival name (offline). */
export function lunarLabel(date: Date): string {
  const solar = Solar.fromYmd(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  const lunar = solar.getLunar();
  const festivals = lunar.getFestivals();
  if (festivals.length > 0) {
    return festivals[0];
  }
  return lunar.getDayInChinese();
}

/** Sub-line under the Gregorian number; prefers statutory holiday short name on rest days. */
export function dayCellSubLabel(day: string, date: Date): string {
  const mark = holidayMark(day);
  if (mark?.kind === "rest") {
    return mark.name;
  }
  return lunarLabel(date);
}

/** Extra culture line for the day panel heading. */
export function dayPanelCultureLine(day: string, date: Date): string {
  const lunar = lunarLabel(date);
  const mark = holidayMark(day);
  if (!mark) {
    return lunar;
  }
  const markTag = mark.kind === "rest" ? "休" : "班";
  return `${lunar} · ${mark.name}（${markTag}）`;
}
