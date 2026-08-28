import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_UI_SETTINGS,
  itemsComplete,
  itemsCreate,
  itemsDelete,
  itemsListRange,
  onQuickCapture,
  onSettingsChanged,
  settingsGet,
  type CalendarItem,
  type UiSettings,
} from "../services/tauriCommands";
import {
  buildMonthGrid,
  monthTitle,
  todayString,
} from "./calendarUtils";
import DayPanel from "./DayPanel";
import MonthGrid from "./MonthGrid";

function groupItemsByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) {
    if (item.deletedAt !== null) continue;
    const list = map.get(item.day);
    if (list) list.push(item);
    else map.set(item.day, [item]);
  }
  return map;
}

export default function WidgetApp() {
  const today = todayString();
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [focusCapture, setFocusCapture] = useState(false);
  const [ui, setUi] = useState<UiSettings>(DEFAULT_UI_SETTINGS);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const grid = useMemo(
    () => buildMonthGrid(viewDate.year, viewDate.month),
    [viewDate.year, viewDate.month],
  );

  const itemsByDay = useMemo(() => groupItemsByDay(items), [items]);

  const loadItems = useCallback(async () => {
    try {
      setError(null);
      const data = await itemsListRange(grid.start, grid.end);
      setItems(data);
    } catch {
      setError("加载事项失败，请稍后重试。");
    }
  }, [grid.start, grid.end]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    void settingsGet().then(setUi).catch(() => undefined);
    let unlisten: (() => void) | undefined;
    void onSettingsChanged(setUi).then((fn) => {
      unlisten = fn;
    });
    return () => {
      void unlisten?.();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onQuickCapture(() => {
      const now = new Date();
      setViewDate({ year: now.getFullYear(), month: now.getMonth() });
      setSelectedDay(today);
      setFocusCapture(true);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      void unlisten?.();
    };
  }, [today]);

  function goToToday() {
    const now = new Date();
    setViewDate({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDay(today);
  }

  function prevMonth() {
    setViewDate((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }

  function nextMonth() {
    setViewDate((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  function handleDayClick(day: string) {
    setSelectedDay(day);
    setFocusCapture(false);
  }

  function handleDayDoubleClick(day: string) {
    setSelectedDay(day);
    setFocusCapture(true);
  }

  function handleWheel(event: React.WheelEvent) {
    event.preventDefault();
    if (event.deltaY > 0) nextMonth();
    else if (event.deltaY < 0) prevMonth();
  }

  const handleFocusCaptureDone = useCallback(() => setFocusCapture(false), []);

  async function handleCreate(title: string) {
    if (!selectedDay) return;
    try {
      setError(null);
      await itemsCreate({ title, day: selectedDay });
      await loadItems();
    } catch {
      setError("创建失败，请稍后重试。");
    }
  }

  async function handleComplete(id: string) {
    try {
      setError(null);
      await itemsComplete(id);
      await loadItems();
    } catch {
      setError("标记完成失败，请稍后重试。");
    }
  }

  async function handleDelete(id: string) {
    try {
      setError(null);
      await itemsDelete(id);
      await loadItems();
    } catch {
      setError("删除失败，请稍后重试。");
    }
  }

  const selectedItems = selectedDay
    ? (itemsByDay.get(selectedDay) ?? [])
    : [];

  return (
    <main className="widget-shell">
      <div
        className="widget-card"
        style={
          {
            "--card-bg": `rgba(255, 252, 248, ${ui.widgetOpacity})`,
            "--text-shadow": ui.textOutline
              ? "0 0 1px rgba(255, 255, 255, 0.85), 0 1px 2px rgba(0, 0, 0, 0.1)"
              : "none",
          } as React.CSSProperties
        }
      >
        <header className="widget-header" data-tauri-drag-region>
          <h1 className="widget-title" data-tauri-drag-region>
            {monthTitle(viewDate.year, viewDate.month)}
          </h1>
          <div className="widget-header-actions" data-tauri-drag-region="false">
            <button type="button" className="widget-btn" onClick={goToToday}>
              今天
            </button>
            <button
              type="button"
              className="widget-btn widget-btn--icon"
              onClick={prevMonth}
              aria-label="上个月"
            >
              ‹
            </button>
            <button
              type="button"
              className="widget-btn widget-btn--icon"
              onClick={nextMonth}
              aria-label="下个月"
            >
              ›
            </button>
          </div>
        </header>

        {error && (
          <p className="widget-error" role="alert">
            {error}
          </p>
        )}

        <MonthGrid
          grid={grid}
          viewMonth={viewDate.month}
          today={today}
          selectedDay={selectedDay}
          itemsByDay={itemsByDay}
          showTitlesInCells={ui.showTitlesInCells}
          onDayClick={handleDayClick}
          onDayDoubleClick={handleDayDoubleClick}
          onWheel={handleWheel}
        />

        {selectedDay && (
          <DayPanel
            day={selectedDay}
            items={selectedItems}
            focusCapture={focusCapture}
            onFocusCaptureDone={handleFocusCaptureDone}
            onCreate={handleCreate}
            onComplete={handleComplete}
            onDelete={handleDelete}
          />
        )}
      </div>
    </main>
  );
}
