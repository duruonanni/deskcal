import { useEffect, useState } from "react";
import type { CalendarItem } from "../services/tauriCommands";
import {
  itemsComplete,
  itemsDelete,
  itemsListIncomplete,
} from "../services/tauriCommands";

export default function ListApp() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setError(null);
      setItems(await itemsListIncomplete());
    } catch {
      setError("加载未完成事项失败。");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function complete(id: string) {
    setBusy(true);
    try {
      await itemsComplete(id);
      await load();
    } catch {
      setError("标记完成失败。");
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
      setError("删除失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <h1 className="app-title">未完成</h1>
      <p className="app-subtitle">按日期排列的未完成事项</p>
      {error && (
        <p className="widget-error" role="alert">
          {error}
        </p>
      )}
      {items.length === 0 && !error ? (
        <p className="app-subtitle">没有未完成的事项。</p>
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
                  完成
                </button>
                <button
                  type="button"
                  className="widget-btn"
                  disabled={busy}
                  onClick={() => void remove(item.id)}
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
