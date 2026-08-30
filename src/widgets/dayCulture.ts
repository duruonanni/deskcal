import { Solar } from "lunar-javascript";
import holidaysData from "../../data/cn-holidays.json";

export type HolidayMark = { kind: "rest" | "work"; name: string };

export type CellBadgeKind = "rest" | "work" | "jieqi" | "festival";

export interface CellBadge {
  kind: CellBadgeKind;
  label: string;
}

const bundledHolidayMap = holidaysData.days as Record<string, HolidayMark>;

let holidayMap: Record<string, HolidayMark> = bundledHolidayMap;

export function setHolidayMap(map: Record<string, HolidayMark> | null): void {
  holidayMap = map ?? bundledHolidayMap;
}

export function holidayMark(day: string): HolidayMark | null {
  return holidayMap[day] ?? null;
}

function solarLunar(date: Date) {
  return Solar.fromYmd(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  ).getLunar();
}

/** Lunar day or traditional festival name (offline). */
export function lunarLabel(date: Date): string {
  const lunar = solarLunar(date);
  const festivals = lunar.getFestivals();
  if (festivals.length > 0) {
    return festivals[0];
  }
  return lunar.getDayInChinese();
}

/** Lunar day next to the Gregorian number (not festival / holiday name). */
export function dayCellSubLabel(_day: string, date: Date): string {
  return solarLunar(date).getDayInChinese();
}

/** Header lunar line, e.g. 农历七月十八 */
export function headerLunarLine(date: Date): string {
  const lunar = solarLunar(date);
  return `农历${lunar.getMonthInChinese()}${lunar.getDayInChinese()}`;
}

/** Corner badges: 休/班, jieqi, traditional festival (deduped against rest name). */
export function cellBadges(day: string, date: Date): CellBadge[] {
  const badges: CellBadge[] = [];
  const mark = holidayMark(day);

  if (mark?.kind === "rest") {
    badges.push({ kind: "rest", label: "休" });
  } else if (mark?.kind === "work") {
    badges.push({ kind: "work", label: "班" });
  }

  const lunar = solarLunar(date);
  const jieqi = lunar.getJieQi();
  if (jieqi) {
    badges.push({ kind: "jieqi", label: jieqi });
  }

  const festivals = lunar.getFestivals();
  if (festivals.length > 0) {
    const festName = festivals[0];
    if (!mark || mark.kind !== "rest" || mark.name !== festName) {
      badges.push({ kind: "festival", label: festName });
    }
  }

  return badges;
}

/** Extra culture line for the day panel heading. */
export function dayPanelCultureLine(
  day: string,
  date: Date,
  locale: "zh" | "en" = "zh",
): string {
  const lunar = lunarLabel(date);
  const mark = holidayMark(day);
  if (!mark) {
    return lunar;
  }
  const markTag =
    mark.kind === "rest"
      ? locale === "en"
        ? "Off"
        : "休"
      : locale === "en"
        ? "Work"
        : "班";
  return `${lunar} · ${mark.name}（${markTag}）`;
}
