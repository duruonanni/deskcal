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

/** ISO day-of-week: Monday = 1 … Sunday = 7. */
function isoDayOfWeek(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

/** ISO week number (week containing Thursday; weeks start Monday). */
export function isoWeek(date: Date): number {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = isoDayOfWeek(target);
  target.setDate(target.getDate() + 4 - day);
  const isoYear = target.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const jan4Iso = isoDayOfWeek(jan4);
  const mondayWeek1 = new Date(isoYear, 0, 4 - jan4Iso + 1);
  const diffDays = Math.round((target.getTime() - mondayWeek1.getTime()) / 86_400_000);
  return Math.floor(diffDays / 7) + 1;
}

/** Number of ISO weeks in a calendar year (52 or 53). */
export function isoWeeksInYear(year: number): 52 | 53 {
  return isoWeek(new Date(year, 11, 28)) === 53 ? 53 : 52;
}

/** ISO weeks remaining after the current week (0 in the last ISO week of the year). */
export function weeksRemainingInYear(date: Date): number {
  const y = date.getFullYear();
  return isoWeeksInYear(y) - isoWeek(date);
}

function isoWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = isoDayOfWeek(d);
  d.setDate(d.getDate() + 1 - day);
  return d;
}

export interface RollingWeekGridData {
  start: string;
  end: string;
  weeks: (Date | null)[][];
}

/**
 * Rolling ~4-week Monday-first grid from (today's ISO Monday − 7).
 * Rows split on calendar month change; empty slots are null.
 * Today's week is always row 1 when the span is built from real today.
 */
export function buildRollingWeekGrid(today: Date): RollingWeekGridData {
  const currentMonday = isoWeekMonday(today);
  const walkStart = new Date(currentMonday);
  walkStart.setDate(currentMonday.getDate() - 7);

  const walkEnd = new Date(walkStart);
  walkEnd.setDate(walkStart.getDate() + 27);

  const weeks: (Date | null)[][] = [];
  let currentRow: (Date | null)[] = [];
  let day = new Date(walkStart);
  let prevMonth = day.getMonth();

  while (day <= walkEnd) {
    const month = day.getMonth();
    if (currentRow.length > 0 && month !== prevMonth) {
      while (currentRow.length < 7) {
        currentRow.push(null);
      }
      weeks.push(currentRow);
      currentRow = [];
    }

    if (currentRow.length === 0) {
      const leading = isoDayOfWeek(day) - 1;
      for (let i = 0; i < leading; i++) {
        currentRow.push(null);
      }
    }

    currentRow.push(new Date(day));
    prevMonth = month;
    day.setDate(day.getDate() + 1);

    if (currentRow.length === 7) {
      weeks.push(currentRow);
      currentRow = [];
    }
  }

  if (currentRow.length > 0) {
    while (currentRow.length < 7) {
      currentRow.push(null);
    }
    weeks.push(currentRow);
  }

  let start: string | null = null;
  let end: string | null = null;
  for (const week of weeks) {
    for (const cell of week) {
      if (!cell) continue;
      const dayStr = formatDay(cell);
      if (!start) start = dayStr;
      end = dayStr;
    }
  }

  return {
    start: start ?? formatDay(walkStart),
    end: end ?? formatDay(walkEnd),
    weeks,
  };
}

const HEADER_WEEKDAY_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"] as const;

export function headerDateLabel(date: Date, locale: "zh" | "en"): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (locale === "zh") {
    return `${y}年${m}月${d}日 ${HEADER_WEEKDAY_ZH[date.getDay()]}`;
  }
  const weekday = WEEKDAY_EN_SHORT[date.getDay()];
  const month = MONTHS_EN[date.getMonth()].slice(0, 3);
  return `${weekday}, ${month} ${d}, ${y}`;
}
