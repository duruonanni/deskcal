import { useEffect, useState } from "react";
import {
  aiRun,
  DEFAULT_UI_SETTINGS,
  onSettingsChanged,
  settingsGet,
  settingsSet,
  syncExport,
  syncImport,
  type UiSettings,
} from "../services/tauriCommands";

export default function SettingsApp() {
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_UI_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [stubMessage, setStubMessage] = useState<string | null>(null);

  useEffect(() => {
    void settingsGet()
      .then(setSettings)
      .catch(() => setError("读取设置失败。"));
    let unlisten: (() => void) | undefined;
    void onSettingsChanged(setSettings).then((fn) => {
      unlisten = fn;
    });
    return () => {
      void unlisten?.();
    };
  }, []);

  async function persist(next: UiSettings) {
    setSettings(next);
    try {
      setError(null);
      setSettings(await settingsSet(next));
    } catch {
      setError("保存设置失败。");
    }
  }

  async function tryStub(action: () => Promise<void>, label: string) {
    try {
      await action();
      setStubMessage(`${label}：即将推出`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStubMessage(
        message.includes("not_implemented") ? `${label}：即将推出` : `${label}失败：${message}`,
      );
    }
  }

  return (
    <main className="app-shell">
      <h1 className="app-title">设置</h1>

      {error && (
        <p className="widget-error" role="alert">
          {error}
        </p>
      )}

      <section className="settings-section">
        <h2>外观</h2>
        <label className="settings-row">
          <span>底板不透明度</span>
          <input
            type="range"
            min={0.35}
            max={1}
            step={0.01}
            value={settings.widgetOpacity}
            onChange={(e) =>
              void persist({
                ...settings,
                widgetOpacity: Number(e.target.value),
              })
            }
          />
          <span>{Math.round(settings.widgetOpacity * 100)}%</span>
        </label>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={settings.textOutline}
            onChange={(e) =>
              void persist({ ...settings, textOutline: e.target.checked })
            }
          />
          <span>文字描边（提高壁纸上的可读性）</span>
        </label>
      </section>

      <section className="settings-section">
        <h2>日历</h2>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={settings.showTitlesInCells}
            onChange={(e) =>
              void persist({
                ...settings,
                showTitlesInCells: e.target.checked,
              })
            }
          />
          <span>格内显示任务标题（最多 2 行）</span>
        </label>
        <p>周起始为一；农历与休/班为离线数据。</p>
      </section>

      <section className="settings-section">
        <h2>AI（即将推出）</h2>
        <p>应用内填写 API Key 的分析助手尚未开放。核心日历不依赖网络。</p>
        <button
          type="button"
          className="widget-btn"
          onClick={() => void tryStub(aiRun, "AI")}
        >
          试用 AI
        </button>
      </section>

      <section className="settings-section">
        <h2>数据同步（即将推出）</h2>
        <p>自选 OneDrive / iCloud Drive 文件夹快照尚未开放。数据库不会放进网盘。</p>
        <div className="settings-row">
          <button
            type="button"
            className="widget-btn"
            onClick={() => void tryStub(syncExport, "导出快照")}
          >
            导出快照
          </button>
          <button
            type="button"
            className="widget-btn"
            onClick={() => void tryStub(syncImport, "导入快照")}
          >
            导入快照
          </button>
        </div>
      </section>

      {stubMessage && <p className="app-subtitle">{stubMessage}</p>}
    </main>
  );
}
