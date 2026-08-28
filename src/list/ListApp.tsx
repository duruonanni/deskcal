import { useEffect, useState } from "react";
import type { CalendarItem, UiSettings } from "../services/tauriCommands";
import {
  DEFAULT_UI_SETTINGS,
  itemsComplete,
  itemsDelete,
  itemsListIncomplete,
  onItemsChanged,
  onSettingsChanged,
  settingsGet,
} from "../services/tauriCommands";
import { documentLang, t } from "../i18n/messages";

export default function ListApp() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [ui, setUi] = useState<UiSettings>(DEFAULT_UI_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locale = ui.locale ?? "zh";

  async function load() {
    try {
      setError(null);
      setItems(await itemsListIncomplete());
    } catch {
      setError(t(locale, "loadIncompleteFailed"));
    }
  }

  useEffect(() => {
    document.documentElement.lang = documentLang(locale);
  }, [locale]);

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
    void load();
    let unlisten: (() => void) | undefined;
    void onItemsChanged(() => {
      void load();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      void unlisten?.();
    };
  }, [locale]);

  async function complete(id: string) {
    setBusy(true);
    try {
      await itemsComplete(id);
      await load();
    } catch {
      setError(t(locale, "completeFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await itemsDelete(id);
      await load();
    } catch {
      setError(t(locale, "deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <h1 className="app-title">{t(locale, "incompleteTitle")}</h1>
      <p className="app-subtitle">{t(locale, "incompleteSubtitle")}</p>
      {error && (
        <p className="widget-error" role="alert">
          {error}
        </p>
      )}
      {items.length === 0 && !error ? (
        <p className="app-subtitle">{t(locale, "noIncomplete")}</p>
      ) : (
        <ul className="inbox-list">
          {items.map((item) => (
            <li key={item.id} className="inbox-item">
              <div>
                <div className="inbox-day">{item.day}</div>
                <div>{item.title}</div>
              </div>
              <div className="inbox-actions">
                <button
                  type="button"
                  className="widget-btn"
                  disabled={busy}
                  onClick={() => void complete(item.id)}
                >
                  {t(locale, "complete")}
                </button>
                <button
                  type="button"
                  className="widget-btn"
                  disabled={busy}
                  onClick={() => void remove(item.id)}
                >
                  {t(locale, "delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
