import type { CalendarItem } from "../services/tauriCommands";
import type { AppLocale } from "../i18n/messages";
import { t } from "../i18n/messages";
import {
  formatDay,
  truncateTitle,
  weekdayLabels,
  type MonthGridData,
} from "./calendarUtils";
import { dayCellSubLabel, holidayMark } from "./dayCulture";

interface MonthGridProps {
  grid: MonthGridData;
  viewMonth: number;
  today: string;
  selectedDay: string | null;
  itemsByDay: Map<string, CalendarItem[]>;
  showTitlesInCells: boolean;
  locale: AppLocale;
  onDayClick: (day: string) => void;
  onDayDoubleClick: (day: string) => void;
  onWheel: (event: React.WheelEvent) => void;
}

function incompleteItems(items: CalendarItem[]): CalendarItem[] {
  return items.filter((item) => item.completedAt === null);
}

const CELL_TITLE_LIMIT = 4;

export default function MonthGrid({
  grid,
  viewMonth,
  today,
  selectedDay,
  itemsByDay,
  showTitlesInCells,
  locale,
  onDayClick,
  onDayDoubleClick,
  onWheel,
}: MonthGridProps) {
  return (
    <div className="calendar-body" onWheel={onWheel}>
      <div className="weekday-row" aria-hidden="true">
        {weekdayLabels(locale).map((label) => (
          <span key={label} className="weekday-cell">
            {label}
          </span>
        ))}
      </div>

      <div className="month-grid" role="grid" aria-label={t(locale, "monthGridAria")}>
        {grid.weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="month-grid-row" role="row">
            {week.map((date) => {
              const day = formatDay(date);
              const isOtherMonth = date.getMonth() !== viewMonth;
              const isToday = day === today;
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isSelected = day === selectedDay;
              const dayItems = itemsByDay.get(day) ?? [];
              const pending = incompleteItems(dayItems);
              const hasDot = pending.length > 0;
              const mark = holidayMark(day);
              const subLabel = dayCellSubLabel(day, date);
              const ariaParts = [
                locale === "en"
                  ? date.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })
                  : `${date.getMonth() + 1}月${date.getDate()}日`,
                subLabel,
                mark?.kind === "rest"
                  ? t(locale, "restDay")
                  : mark?.kind === "work"
                    ? t(locale, "workDay")
                    : null,
              ].filter(Boolean);

              const tileKind = isToday
                ? "today"
                : mark?.kind === "rest"
                  ? "rest"
                  : mark?.kind === "work"
                    ? "work"
                    : null;

              const cellClass = [
                "day-cell",
                isOtherMonth && "day-cell--other",
                isWeekend && "day-cell--weekend",
                isSelected && "day-cell--selected",
                tileKind && `day-cell--tile-${tileKind}`,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={day}
                  type="button"
                  className={cellClass}
                  role="gridcell"
                  data-no-drag
                  aria-label={ariaParts.join("，")}
                  aria-pressed={isSelected}
                  onClick={() => onDayClick(day)}
                  onDoubleClick={() => onDayDoubleClick(day)}
                >
                  <span className="day-cell-top">
                    <span className="day-cell-number">{date.getDate()}</span>
                    <span className="day-cell-lunar">{subLabel}</span>
                    {mark && (
                      <span
                        className={`day-cell-mark day-cell-mark--${mark.kind}`}
                        aria-hidden="true"
                      >
                        {mark.kind === "rest"
                          ? t(locale, "restMark")
                          : t(locale, "workMark")}
                      </span>
                    )}
                  </span>
                  {showTitlesInCells ? (
                    <span className="day-cell-titles">
                      {pending.slice(0, CELL_TITLE_LIMIT).map((item, index) => (
                        <span key={item.id} className="day-cell-title">
                          {index + 1}、{truncateTitle(item.title)}
                        </span>
                      ))}
                      {pending.length > CELL_TITLE_LIMIT && (
                        <span className="day-cell-more">
                          +{pending.length - CELL_TITLE_LIMIT}
                        </span>
                      )}
                    </span>
                  ) : (
                    hasDot && <span className="day-cell-bar" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
