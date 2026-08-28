import type { AppLocale } from "../i18n/messages";

const WEEKDAY_LABELS_ZH = ["一", "二", "三", "四", "五", "六", "日"] as const;
const WEEKDAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"] as const;
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const WEEKDAY_EN_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function weekdayLabels(locale: AppLocale): readonly string[] {
  return locale === "en" ? WEEKDAY_LABELS_EN : WEEKDAY_LABELS_ZH;
}

export function formatDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayString(): string {
  return formatDay(new Date());
}

export function monthTitle(year: number, month: number, locale: AppLocale = "zh"): string {
  if (locale === "en") {
    return `${MONTHS_EN[month]} ${year}`;
  }
  return `${year}年${month + 1}月`;
}

export function dayPanelTitle(day: string, locale: AppLocale = "zh"): string {
  const date = parseDay(day);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (locale === "en") {
    return `${WEEKDAY_EN_SHORT[date.getDay()]}, ${MONTHS_EN[date.getMonth()].slice(0, 3)} ${d}`;
  }
  const w = WEEKDAY_ZH[date.getDay()];
  return `${m}月${d}日 周${w}`;
}

export interface MonthGridData {
  start: string;
  end: string;
  weeks: Date[][];
}

/** Six-week Monday-first grid covering the given calendar month. */
export function buildMonthGrid(year: number, month: number): MonthGridData {
  const firstOfMonth = new Date(year, month, 1);
  const jsDay = firstOfMonth.getDay();
  const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;
  const gridStart = new Date(year, month, 1 - mondayOffset);

  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(gridStart);
      cell.setDate(gridStart.getDate() + w * 7 + d);
      week.push(cell);
    }
    weeks.push(week);
  }

  return {
    start: formatDay(weeks[0][0]),
    end: formatDay(weeks[5][6]),
    weeks,
  };
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function truncateTitle(title: string, maxLen = 10): string {
  const trimmed = title.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}
