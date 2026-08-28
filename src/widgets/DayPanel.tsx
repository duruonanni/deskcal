import { useEffect, useRef, useState } from "react";
import type { CalendarItem } from "../services/tauriCommands";
import type { AppLocale } from "../i18n/messages";
import { t } from "../i18n/messages";
import { dayPanelTitle, parseDay } from "./calendarUtils";
import { dayPanelCultureLine } from "./dayCulture";

interface DayPanelProps {
  day: string;
  items: CalendarItem[];
  locale: AppLocale;
  focusCapture: boolean;
  onFocusCaptureDone: () => void;
  onCreate: (title: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function sortItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((a, b) => {
    const aDone = a.completedAt !== null ? 1 : 0;
    const bDone = b.completedAt !== null ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return a.createdAt - b.createdAt;
  });
}

export default function DayPanel({
  day,
  items,
  locale,
  focusCapture,
  onFocusCaptureDone,
  onCreate,
  onComplete,
  onDelete,
}: DayPanelProps) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sorted = sortItems(items);
  const cultureLine = dayPanelCultureLine(day, parseDay(day), locale);

  useEffect(() => {
    if (focusCapture) {
      inputRef.current?.focus();
      onFocusCaptureDone();
    }
  }, [focusCapture, onFocusCaptureDone]);

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

  return (
    <section className="day-panel" aria-label={t(locale, "dayPanelAria")}>
      <h2 className="day-panel-heading">
        <span className="day-panel-heading-main">{dayPanelTitle(day, locale)}</span>
        <span className="day-panel-heading-culture">{cultureLine}</span>
      </h2>

      <form className="day-panel-capture" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="day-panel-input"
          placeholder={t(locale, "newItemPlaceholder")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          aria-label={t(locale, "newItemAria")}
        />
      </form>

      {sorted.length > 0 && (
        <ul className="day-panel-list">
          {sorted.map((item) => {
            const done = item.completedAt !== null;
            return (
              <li
                key={item.id}
                className={`day-panel-item${done ? " day-panel-item--done" : ""}`}
              >
                <label className="day-panel-item-main">
                  <input
                    type="checkbox"
                    className="day-panel-checkbox"
                    checked={done}
                    disabled={done || busy}
                    onChange={() => void onComplete(item.id)}
                    aria-label={done ? t(locale, "alreadyDone") : t(locale, "markDone")}
                  />
                  <span className="day-panel-item-title">{item.title}</span>
                </label>
                <button
                  type="button"
                  className="day-panel-delete"
                  disabled={busy}
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
}
