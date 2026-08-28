import { useEffect, useState } from "react";
import {
  aiRun,
  DEFAULT_UI_SETTINGS,
  onSettingsChanged,
  setCurrentWindowTitle,
  settingsGet,
  settingsSet,
  syncExport,
  syncImport,
  type UiSettings,
} from "../services/tauriCommands";
import { documentLang, t, type AppLocale } from "../i18n/messages";
import { useDeskCalTheme } from "../theme/useDeskCalTheme";

export default function SettingsApp() {
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_UI_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [stubMessage, setStubMessage] = useState<string | null>(null);
  const locale = settings.locale ?? "zh";
  const { packInvalid } = useDeskCalTheme(settings);

  useEffect(() => {
    document.documentElement.lang = documentLang(locale);
  }, [locale]);

  useEffect(() => {
    void setCurrentWindowTitle(t(locale, "settingsTitle"));
  }, [locale]);

  useEffect(() => {
    void settingsGet()
      .then(setSettings)
      .catch(() => setError(t(locale, "readSettingsFailed")));
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
      setError(t(locale, "saveSettingsFailed"));
    }
  }

  async function tryStub(action: () => Promise<void>, label: string) {
    try {
      await action();
      setStubMessage(`${label}：${t(locale, "comingSoon")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStubMessage(
        message.includes("not_implemented")
          ? `${label}：${t(locale, "comingSoon")}`
          : `${label}${t(locale, "failedPrefix")}：${message}`,
      );
    }
  }

  return (
    <main className="app-shell">
      <h1 className="app-title">{t(locale, "settingsTitle")}</h1>

      {error && (
        <p className="widget-error" role="alert">
          {error}
        </p>
      )}

      <section className="settings-section">
        <h2>{t(locale, "language")}</h2>
        <div className="settings-row">
          {(["zh", "en"] as AppLocale[]).map((code) => (
            <button
              key={code}
              type="button"
              className={`widget-btn${settings.locale === code ? " widget-btn--active" : ""}`}
              onClick={() => void persist({ ...settings, locale: code })}
            >
              {code === "zh" ? t(locale, "languageZh") : t(locale, "languageEn")}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>{t(locale, "appearance")}</h2>
        {packInvalid && (
          <p role="alert">{t(locale, "customThemeInvalid")}</p>
        )}
        <div className="settings-row">
          <span>{t(locale, "themeModeLabel")}</span>
          {(["auto", "light", "dark"] as const).map((code) => (
            <button
              key={code}
              type="button"
              className={`widget-btn${settings.themeMode === code ? " widget-btn--active" : ""}`}
              aria-pressed={settings.themeMode === code}
              onClick={() => void persist({ ...settings, themeMode: code })}
            >
              {t(locale, code === "auto" ? "themeAuto" : code === "light" ? "themeLight" : "themeDark")}
            </button>
          ))}
        </div>
        <label className="settings-row">
          <span>{t(locale, "opacity")}</span>
          <input
            type="range"
            min={0.1}
            max={0.4}
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
        <p>{t(locale, "opacityHelp")}</p>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={settings.textOutline}
            onChange={(e) =>
              void persist({ ...settings, textOutline: e.currentTarget.checked })
            }
          />
          <span>{t(locale, "textOutline")}</span>
        </label>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={settings.widgetLocked}
            onChange={(e) =>
              void persist({ ...settings, widgetLocked: e.currentTarget.checked })
            }
          />
          <span>{t(locale, "lockWidget")}</span>
        </label>
        <p>{t(locale, "lockWidgetHelp")}</p>
      </section>

      <section className="settings-section">
        <h2>{t(locale, "calendar")}</h2>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={settings.showTitlesInCells}
            onChange={(e) =>
              void persist({
                ...settings,
                showTitlesInCells: e.currentTarget.checked,
              })
            }
          />
          <span>{t(locale, "showTitlesInCells")}</span>
        </label>
        <p>{t(locale, "weekStartsMonday")}</p>
      </section>

      <section className="settings-section">
        <h2>{t(locale, "aiSoonTitle")}</h2>
        <p>{t(locale, "aiSoonBody")}</p>
        <button
          type="button"
          className="widget-btn"
          onClick={() => void tryStub(aiRun, t(locale, "tryAi"))}
        >
          {t(locale, "tryAi")}
        </button>
      </section>

      <section className="settings-section">
        <h2>{t(locale, "syncSoonTitle")}</h2>
        <p>{t(locale, "syncSoonBody")}</p>
        <div className="settings-row">
          <button
            type="button"
            className="widget-btn"
            onClick={() => void tryStub(syncExport, t(locale, "exportSnapshot"))}
          >
            {t(locale, "exportSnapshot")}
          </button>
          <button
            type="button"
            className="widget-btn"
            onClick={() => void tryStub(syncImport, t(locale, "importSnapshot"))}
          >
            {t(locale, "importSnapshot")}
          </button>
        </div>
      </section>

      {stubMessage && <p className="app-subtitle">{stubMessage}</p>}
    </main>
  );
}
