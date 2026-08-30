import { forwardRef, useEffect, useRef, useState } from "react";
import type { CalendarItem } from "../services/tauriCommands";
import type { AppLocale } from "../i18n/messages";
import { t } from "../i18n/messages";
import { dayPanelTitle, parseDay } from "./calendarUtils";
import { dayPanelCultureLine } from "./dayCulture";

interface DayPopoverProps {
  day: string;
  items: CalendarItem[];
  locale: AppLocale;
  style?: React.CSSProperties;
  focusCapture: boolean;
  onFocusCaptureDone: () => void;
  onCreate: (title: string) => Promise<void>;
  onUpdate: (id: string, title: string) => Promise<void>;
  onToggleComplete: (item: CalendarItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (ids: string[]) => Promise<void>;
}

function sortItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((a, b) => a.sort - b.sort || a.createdAt - b.createdAt);
}

const DayPopover = forwardRef<HTMLElement, DayPopoverProps>(function DayPopover(
  {
    day,
    items,
    locale,
    style,
    focusCapture,
    onFocusCaptureDone,
    onCreate,
    onUpdate,
    onToggleComplete,
    onDelete,
    onReorder,
  },
  ref,
) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const sorted = sortItems(items);
  const cultureLine = dayPanelCultureLine(day, parseDay(day), locale);

  useEffect(() => {
    if (focusCapture) {
      inputRef.current?.focus();
      onFocusCaptureDone();
    }
  }, [focusCapture, onFocusCaptureDone]);

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  function handleMouseDown(event: React.MouseEvent) {
    event.stopPropagation();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await onCreate(title);
      setDraft("");
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: CalendarItem) {
    if (busy) return;
    setEditingId(item.id);
    setEditDraft(item.title);
  }

  async function commitEdit(id: string) {
    const title = editDraft.trim();
    setEditingId(null);
    if (!title || busy) return;
    const original = items.find((item) => item.id === id);
    if (!original || original.title === title) return;
    setBusy(true);
    try {
      await onUpdate(id, title);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  function handleDragStart(event: React.DragEvent, id: string) {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(event: React.DragEvent, targetId: string) {
    event.preventDefault();
    setDraggingId(null);
    const sourceId = event.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) return;

    const ids = sorted.map((item) => item.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, sourceId);

    setBusy(true);
    try {
      await onReorder(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      ref={ref}
      className="day-popover"
      style={style}
      aria-label={t(locale, "dayPanelAria")}
      data-no-drag
      onMouseDown={handleMouseDown}
    >
      <h2 className="day-popover-heading">
        <span className="day-popover-heading-main">{dayPanelTitle(day, locale)}</span>
        <span className="day-popover-heading-culture">{cultureLine}</span>
      </h2>

      <form className="day-popover-capture" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="day-popover-input"
          placeholder={t(locale, "newItemPlaceholder")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          aria-label={t(locale, "newItemAria")}
        />
      </form>

      {sorted.length > 0 && (
        <ul className="day-popover-list">
          {sorted.map((item, index) => {
            const done = item.completedAt !== null;
            const isEditing = editingId === item.id;
            const isDragging = draggingId === item.id;

            return (
              <li
                key={item.id}
                className={`day-popover-item${done ? " day-popover-item--done" : ""}${isDragging ? " day-popover-item--dragging" : ""}`}
                onDragOver={handleDragOver}
                onDrop={(event) => void handleDrop(event, item.id)}
              >
                <span className="day-popover-item-index" aria-hidden="true">
                  {index + 1}.
                </span>
                <button
                  type="button"
                  className="day-popover-drag"
                  draggable={!busy && !isEditing}
                  disabled={busy || isEditing}
                  aria-label={t(locale, "dragHandleAria")}
                  title={t(locale, "dragHandleAria")}
                  onDragStart={(event) => handleDragStart(event, item.id)}
                  onDragEnd={handleDragEnd}
                >
                  ⋮⋮
                </button>
                <label className="day-popover-item-main">
                  <input
                    type="checkbox"
                    className="day-popover-checkbox"
                    checked={done}
                    disabled={busy || isEditing}
                    onChange={() => void onToggleComplete(item)}
                    aria-label={done ? t(locale, "markUndone") : t(locale, "markDone")}
                  />
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      className="day-popover-edit-input"
                      value={editDraft}
                      disabled={busy}
                      aria-label={t(locale, "editItem")}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onBlur={() => void commitEdit(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void commitEdit(item.id);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          cancelEdit();
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="day-popover-item-title"
                      disabled={busy}
                      onClick={() => startEdit(item)}
                      aria-label={t(locale, "editItem")}
                    >
                      {item.title}
                    </button>
                  )}
                </label>
                <button
                  type="button"
                  className="day-popover-delete"
                  disabled={busy || isEditing}
                  onClick={() => void onDelete(item.id)}
                  aria-label={t(locale, "delete")}
                  title={t(locale, "delete")}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
});

export default DayPopover;
