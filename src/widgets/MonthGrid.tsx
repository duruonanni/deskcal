import type { CalendarItem } from "../services/tauriCommands";
import {
  formatDay,
  truncateTitle,
  WEEKDAY_LABELS,
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
  onDayClick: (day: string) => void;
  onDayDoubleClick: (day: string) => void;
  onWheel: (event: React.WheelEvent) => void;
}

function incompleteItems(items: CalendarItem[]): CalendarItem[] {
  return items.filter((item) => item.completedAt === null);
}

export default function MonthGrid({
  grid,
  viewMonth,
  today,
  selectedDay,
  itemsByDay,
  showTitlesInCells,
  onDayClick,
  onDayDoubleClick,
  onWheel,
}: MonthGridProps) {
  return (
    <div className="calendar-body" onWheel={onWheel}>
      <div className="weekday-row" aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="weekday-cell">
            {label}
          </span>
        ))}
      </div>

      <div className="month-grid" role="grid" aria-label="月历">
        {grid.weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="month-grid-row" role="row">
            {week.map((date) => {
              const day = formatDay(date);
              const isOtherMonth = date.getMonth() !== viewMonth;
              const isToday = day === today;
              const isSelected = day === selectedDay;
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const dayItems = itemsByDay.get(day) ?? [];
              const pending = incompleteItems(dayItems);
              const hasDot = pending.length > 0;
              const mark = holidayMark(day);
              const subLabel = dayCellSubLabel(day, date);
              const ariaParts = [
                `${date.getMonth() + 1}月${date.getDate()}日`,
                subLabel,
                mark?.kind === "rest" ? "休息日" : mark?.kind === "work" ? "调班" : null,
              ].filter(Boolean);

              const cellClass = [
                "day-cell",
                isOtherMonth && "day-cell--other",
                isToday && "day-cell--today",
                isSelected && "day-cell--selected",
                isWeekend && "day-cell--weekend",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={day}
                  type="button"
                  className={cellClass}
                  role="gridcell"
                  aria-label={ariaParts.join("，")}
                  aria-pressed={isSelected}
                  onClick={() => onDayClick(day)}
                  onDoubleClick={() => onDayDoubleClick(day)}
                >
                  <span className="day-cell-top">
                    <span className="day-cell-number">{date.getDate()}</span>
                    {mark && (
                      <span
                        className={`day-cell-mark day-cell-mark--${mark.kind}`}
                        aria-hidden="true"
                      >
                        {mark.kind === "rest" ? "休" : "班"}
                      </span>
                    )}
                  </span>
                  <span className="day-cell-lunar">{subLabel}</span>
                  {showTitlesInCells ? (
                    <span className="day-cell-titles">
                      {pending.slice(0, 2).map((item) => (
                        <span key={item.id} className="day-cell-title">
                          {truncateTitle(item.title)}
                        </span>
                      ))}
                      {pending.length > 2 && (
                        <span className="day-cell-more">+{pending.length - 2}</span>
                      )}
                    </span>
                  ) : (
                    hasDot && <span className="day-cell-dot" aria-hidden="true" />
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
