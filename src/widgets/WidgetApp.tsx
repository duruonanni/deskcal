import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_UI_SETTINGS,
  isDragExcludedTarget,
  itemsComplete,
  itemsCreate,
  itemsDelete,
  itemsListRange,
  onItemsChanged,
  onQuickCapture,
  onSettingsChanged,
  settingsGet,
  settingsSet,
  widgetStartDragging,
  type CalendarItem,
  type UiSettings,
} from "../services/tauriCommands";
import { documentLang, t } from "../i18n/messages";
import {
  buildMonthGrid,
  monthTitle,
  todayString,
} from "./calendarUtils";
import { useDeskCalTheme } from "../theme/useDeskCalTheme";
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

  const locale = ui.locale ?? "zh";
  useDeskCalTheme(ui);
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
      setError(t(locale, "loadItemsFailed"));
    }
  }, [grid.start, grid.end, locale]);

  useEffect(() => {
    document.documentElement.lang = documentLang(locale);
  }, [locale]);

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
    void onItemsChanged(() => {
      void loadItems();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      void unlisten?.();
    };
  }, [loadItems]);

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

  function handleCardMouseDown(event: React.MouseEvent) {
    if (ui.widgetLocked) return;
    if (event.button !== 0) return;
    if (isDragExcludedTarget(event.target)) return;
    void widgetStartDragging();
  }

  async function persistUi(next: UiSettings) {
    setUi(next);
    try {
      setUi(await settingsSet(next));
    } catch {
      setError(t(locale, "saveSettingsFailed"));
    }
  }

  async function toggleLock() {
    await persistUi({ ...ui, widgetLocked: !ui.widgetLocked });
  }

  async function handleCreate(title: string) {
    if (!selectedDay) return;
    try {
      setError(null);
      await itemsCreate({ title, day: selectedDay });
      await loadItems();
    } catch {
      setError(t(locale, "createFailed"));
    }
  }

  async function handleComplete(id: string) {
    try {
      setError(null);
      await itemsComplete(id);
      await loadItems();
    } catch {
      setError(t(locale, "completeFailed"));
    }
  }

  async function handleDelete(id: string) {
    try {
      setError(null);
      await itemsDelete(id);
      await loadItems();
    } catch {
      setError(t(locale, "deleteFailed"));
    }
  }

  const selectedItems = selectedDay
    ? (itemsByDay.get(selectedDay) ?? [])
    : [];

  const shellClass = [
    "widget-shell",
    ui.widgetLocked ? "widget-shell--locked" : "widget-shell--unlocked",
  ].join(" ");

  return (
    <main className={shellClass} onMouseDown={handleCardMouseDown}>
      <div className="widget-card">
        <header className="widget-header">
          <h1 className="widget-title">
            {monthTitle(viewDate.year, viewDate.month, locale)}
          </h1>
          <div className="widget-header-actions" data-no-drag>
            <button
              type="button"
              className={`widget-btn${ui.widgetLocked ? " widget-btn--active" : ""}`}
              onClick={() => void toggleLock()}
              aria-pressed={ui.widgetLocked}
              title={ui.widgetLocked ? t(locale, "lockedHint") : t(locale, "unlockedHint")}
            >
              {ui.widgetLocked ? t(locale, "unlock") : t(locale, "lock")}
            </button>
            <button type="button" className="widget-btn" onClick={goToToday}>
              {t(locale, "today")}
            </button>
            <button
              type="button"
              className="widget-btn widget-btn--icon"
              onClick={prevMonth}
              aria-label={t(locale, "prevMonth")}
            >
              ‹
            </button>
            <button
              type="button"
              className="widget-btn widget-btn--icon"
              onClick={nextMonth}
              aria-label={t(locale, "nextMonth")}
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
          locale={locale}
          onDayClick={handleDayClick}
          onDayDoubleClick={handleDayDoubleClick}
          onWheel={handleWheel}
        />

        {selectedDay && (
          <div data-no-drag>
            <DayPanel
              day={selectedDay}
              items={selectedItems}
              locale={locale}
              focusCapture={focusCapture}
              onFocusCaptureDone={handleFocusCaptureDone}
              onCreate={handleCreate}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </main>
  );
}
