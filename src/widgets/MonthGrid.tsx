import type { CalendarItem, WeekNumberMode } from "../services/tauriCommands";
import type { AppLocale } from "../i18n/messages";
import { t } from "../i18n/messages";
import {
  formatDay,
  isoWeek,
  truncateTitle,
  weekdayLabels,
  weeksRemainingInYear,
  type RollingWeekGridData,
} from "./calendarUtils";
import { cellBadges, dayCellSubLabel } from "./dayCulture";

interface MonthGridProps {
  grid: RollingWeekGridData;
  today: string;
  selectedDay: string | null;
  itemsByDay: Map<string, CalendarItem[]>;
  weekNumberMode: WeekNumberMode;
  locale: AppLocale;
  onDayClick: (day: string, anchorRect: DOMRect) => void;
}

function sortedItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((a, b) => a.sort - b.sort || a.createdAt - b.createdAt);
}

function thursdayOfWeek(week: (Date | null)[]): Date | null {
  return week[3] ?? null;
}

function firstNonNullDate(week: (Date | null)[]): Date | null {
  for (const date of week) {
    if (date) return date;
  }
  return null;
}

function weekNumberLabel(week: (Date | null)[], mode: WeekNumberMode): string {
  const ref = thursdayOfWeek(week) ?? firstNonNullDate(week);
  if (!ref) return "";
  if (mode === "remaining") {
    return String(weeksRemainingInYear(ref));
  }
  return String(isoWeek(ref));
}

export default function MonthGrid({
  grid,
  today,
  selectedDay,
  itemsByDay,
  weekNumberMode,
  locale,
  onDayClick,
}: MonthGridProps) {
  return (
    <div className="calendar-body">
      <div className="weekday-row" aria-hidden="true">
        <span className="week-gutter" />
        {weekdayLabels(locale).map((label) => (
          <span key={label} className="weekday-cell">
            {label}
          </span>
        ))}
      </div>

      <div className="month-grid" role="grid" aria-label={t(locale, "weekGridAria")}>
        {grid.weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="month-grid-row" role="row">
            <span className="week-gutter week-number" aria-hidden="true">
              {weekNumberLabel(week, weekNumberMode)}
            </span>
            {week.map((date, dayIndex) => {
              if (!date) {
                return (
                  <span
                    key={`empty-${weekIndex}-${dayIndex}`}
                    className="day-cell--empty"
                    role="presentation"
                  />
                );
              }

              const day = formatDay(date);
              const isToday = day === today;
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isSelected = day === selectedDay;
              const dayItems = sortedItems(itemsByDay.get(day) ?? []);
              const subLabel = dayCellSubLabel(day, date);
              const badges = cellBadges(day, date);
              const ariaParts = [
                locale === "en"
                  ? date.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })
                  : `${date.getMonth() + 1}月${date.getDate()}日`,
                subLabel,
                ...badges.map((badge) =>
                  badge.kind === "rest"
                    ? t(locale, "restDay")
                    : badge.kind === "work"
                      ? t(locale, "workDay")
                      : badge.label,
                ),
              ].filter(Boolean);

              const cellClass = [
                "day-cell",
                isWeekend && "day-cell--weekend",
                isToday && "day-cell--today",
                isSelected && "day-cell--selected",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={day}
                  type="button"
                  className={cellClass}
                  role="gridcell"
                  data-day={day}
                  data-no-drag
                  aria-label={ariaParts.join("，")}
                  aria-pressed={isSelected}
                  onClick={(event) =>
                    onDayClick(day, event.currentTarget.getBoundingClientRect())
                  }
                >
                  <span className="day-cell-top">
                    <span className="day-cell-date">
                      <span className="day-cell-number">{date.getDate()}</span>
                      <span className="day-cell-lunar">{subLabel}</span>
                    </span>
                    {badges.length > 0 && (
                      <span className="day-cell-badges" aria-hidden="true">
                        {badges.map((badge) => (
                          <span
                            key={`${badge.kind}-${badge.label}`}
                            className={`day-cell-badge day-cell-badge--${badge.kind}`}
                          >
                            {badge.kind === "rest"
                              ? t(locale, "restMark")
                              : badge.kind === "work"
                                ? t(locale, "workMark")
                                : badge.label}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="day-cell-titles">
                    {dayItems.map((item, index) => (
                      <span
                        key={item.id}
                        className={`day-cell-title${item.completedAt !== null ? " day-cell-title--done" : ""}`}
                      >
                        {index + 1}. {truncateTitle(item.title)}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
