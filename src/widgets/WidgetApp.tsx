import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_UI_SETTINGS,
  appOpenSettings,
  holidaysGet,
  isDragExcludedTarget,
  itemsComplete,
  itemsCreate,
  itemsDelete,
  itemsListRange,
  itemsReorder,
  itemsUncomplete,
  itemsUpdate,
  onHolidaysChanged,
  onItemsChanged,
  onQuickCapture,
  onSettingsChanged,
  onWidgetMoving,
  settingsGet,
  settingsSet,
  widgetStartDragging,
  type CalendarItem,
  type UiSettings,
} from "../services/tauriCommands";
import { documentLang, t } from "../i18n/messages";
import {
  buildRollingWeekGrid,
  headerDateLabel,
  parseDay,
  todayString,
} from "./calendarUtils";
import { headerLunarLine, setHolidayMap } from "./dayCulture";
import { useDeskCalTheme } from "../theme/useDeskCalTheme";
import DayPopover from "./DayPopover";
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

interface PopoverState {
  day: string;
  anchorRect: DOMRect;
}

const POPOVER_WIDTH = 280;
const POPOVER_MARGIN = 6;
const POPOVER_ESTIMATED_HEIGHT = 220;

function computePopoverStyle(
  shellRect: DOMRect,
  anchorRect: DOMRect,
  popoverHeight: number,
): React.CSSProperties {
  const relLeft = anchorRect.left - shellRect.left;
  const relTop = anchorRect.top - shellRect.top;

  let left = relLeft;
  let top = relTop + anchorRect.height + POPOVER_MARGIN;

  const maxLeft = shellRect.width - POPOVER_WIDTH - POPOVER_MARGIN;
  if (left > maxLeft) {
    left = Math.max(POPOVER_MARGIN, maxLeft);
  }
  if (left < POPOVER_MARGIN) {
    left = POPOVER_MARGIN;
  }

  const maxTop = shellRect.height - popoverHeight - POPOVER_MARGIN;
  if (top > maxTop) {
    const above = relTop - popoverHeight - POPOVER_MARGIN;
    top = above >= POPOVER_MARGIN ? above : Math.max(POPOVER_MARGIN, maxTop);
  }

  return {
    position: "absolute",
    top,
    left,
    width: POPOVER_WIDTH,
  };
}

export default function WidgetApp() {
  const today = todayString();
  const todayDate = useMemo(() => parseDay(today), [today]);
  const shellRef = useRef<HTMLElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const [viewAnchor, setViewAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [focusCapture, setFocusCapture] = useState(false);
  const [pendingTodayOpen, setPendingTodayOpen] = useState(false);
  const [ui, setUi] = useState<UiSettings>(DEFAULT_UI_SETTINGS);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const locale = ui.locale ?? "zh";
  useDeskCalTheme(ui);
  const grid = useMemo(() => buildRollingWeekGrid(viewAnchor), [viewAnchor]);

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

  const repositionPopover = useCallback(() => {
    if (!popover || !shellRef.current) return;
    const shellRect = shellRef.current.getBoundingClientRect();
    const popoverHeight =
      popoverRef.current?.getBoundingClientRect().height ?? POPOVER_ESTIMATED_HEIGHT;
    setPopoverStyle(computePopoverStyle(shellRect, popover.anchorRect, popoverHeight));
  }, [popover]);

  function openPopover(day: string, anchorRect: DOMRect) {
    setSelectedDay(day);
    const shellRect = shellRef.current?.getBoundingClientRect();
    if (shellRect) {
      setPopoverStyle(
        computePopoverStyle(shellRect, anchorRect, POPOVER_ESTIMATED_HEIGHT),
      );
    }
    setPopover({ day, anchorRect });
  }

  useLayoutEffect(() => {
    repositionPopover();
  }, [repositionPopover, items, popover?.day]);

  useEffect(() => {
    if (!popover) return;
    const onResize = () => repositionPopover();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [popover, repositionPopover]);

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
    void holidaysGet()
      .then((payload) => setHolidayMap(payload.days))
      .catch(() => undefined);
    let unlisten: (() => void) | undefined;
    void onHolidaysChanged((days) => setHolidayMap(days)).then((fn) => {
      unlisten = fn;
    });
    return () => {
      void unlisten?.();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onWidgetMoving(setMoving).then((fn) => {
      unlisten = fn;
    });
    return () => {
      void unlisten?.();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onQuickCapture(() => {
      setViewAnchor(new Date());
      setFocusCapture(true);
      setPendingTodayOpen(true);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      void unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!pendingTodayOpen) return;
    const cell = shellRef.current?.querySelector<HTMLElement>(
      `[data-day="${today}"]`,
    );
    if (!cell) return;
    openPopover(today, cell.getBoundingClientRect());
    setPendingTodayOpen(false);
  }, [pendingTodayOpen, today, grid.start, grid.end]);

  const popoverDay = popover?.day;
  useEffect(() => {
    if (!popoverDay) return;
    const cell = shellRef.current?.querySelector<HTMLElement>(
      `[data-day="${popoverDay}"]`,
    );
    if (!cell) {
      setPopover(null);
      return;
    }
    const rect = cell.getBoundingClientRect();
    setPopover((prev) => (prev ? { ...prev, anchorRect: rect } : prev));
  }, [grid.start, grid.end, popoverDay]);

  useEffect(() => {
    if (!popover) return;
    const popoverDay = popover.day;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPopover(null);
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (popoverRef.current?.contains(target)) return;
      const cell = target.closest<HTMLElement>(".day-cell");
      if (cell?.dataset.day === popoverDay) return;
      setPopover(null);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [popover]);

  function goToToday() {
    setViewAnchor(new Date());
    setPendingTodayOpen(true);
  }

  function prevWeek() {
    setViewAnchor((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  }

  function nextWeek() {
    setViewAnchor((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  }

  function handleDayClick(day: string, anchorRect: DOMRect) {
    openPopover(day, anchorRect);
  }

  function handleCardMouseDown(event: React.MouseEvent) {
    if (ui.widgetLocked) return;
    if (event.button !== 0) return;
    if (isDragExcludedTarget(event.target)) return;
    void widgetStartDragging();
  }

  function handleOpenSettings(event: React.MouseEvent) {
    event.stopPropagation();
    void appOpenSettings().catch(() => {
      setError(t(locale, "openSettingsFailed"));
    });
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
    if (!popover) return;
    try {
      setError(null);
      await itemsCreate({ title, day: popover.day });
      await loadItems();
    } catch {
      setError(t(locale, "createFailed"));
    }
  }

  async function handleUpdate(id: string, title: string) {
    try {
      setError(null);
      await itemsUpdate({ id, title });
      await loadItems();
    } catch {
      setError(t(locale, "updateFailed"));
    }
  }

  async function handleToggleComplete(item: CalendarItem) {
    try {
      setError(null);
      if (item.completedAt === null) {
        await itemsComplete(item.id);
      } else {
        await itemsUncomplete(item.id);
      }
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

  async function handleReorder(ids: string[]) {
    if (!popover) return;
    try {
      setError(null);
      await itemsReorder(popover.day, ids);
      await loadItems();
    } catch {
      setError(t(locale, "reorderFailed"));
    }
  }

  const shellClass = [
    "widget-shell",
    ui.widgetLocked ? "widget-shell--locked" : "widget-shell--unlocked",
    moving && !ui.widgetLocked ? "widget-shell--moving" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const popoverItems = popover ? (itemsByDay.get(popover.day) ?? []) : [];

  return (
    <main ref={shellRef} className={shellClass} onMouseDown={handleCardMouseDown}>
      <header className="widget-header">
        <div className="widget-title-block">
          <h1 className="widget-title">{headerDateLabel(todayDate, locale)}</h1>
          <p className="widget-title-lunar">{headerLunarLine(todayDate)}</p>
        </div>
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
            onClick={prevWeek}
            aria-label={t(locale, "prevWeek")}
          >
            ‹
          </button>
          <button
            type="button"
            className="widget-btn widget-btn--icon"
            onClick={nextWeek}
            aria-label={t(locale, "nextWeek")}
          >
            ›
          </button>
          <button
            type="button"
            className="widget-btn widget-btn--icon"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={handleOpenSettings}
            aria-label={t(locale, "openSettings")}
            title={t(locale, "openSettings")}
          >
            ⚙
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
        today={today}
        selectedDay={selectedDay}
        itemsByDay={itemsByDay}
        weekNumberMode={ui.weekNumberMode ?? "iso"}
        locale={locale}
        onDayClick={handleDayClick}
      />

      {popover && (
        <DayPopover
          ref={popoverRef}
          day={popover.day}
          items={popoverItems}
          locale={locale}
          style={popoverStyle}
          focusCapture={focusCapture}
          onFocusCaptureDone={() => setFocusCapture(false)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onToggleComplete={handleToggleComplete}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />
      )}
    </main>
  );
}
