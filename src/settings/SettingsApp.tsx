import { useEffect, useState } from "react";
import {
  aiRun,
  BUILTIN_HOLIDAY_URL_TEMPLATE,
  DEFAULT_UI_SETTINGS,
  holidaysRefresh,
  holidaysStatus,
  onSettingsChanged,
  setCurrentWindowTitle,
  settingsGet,
  settingsSet,
  syncExport,
  syncImport,
  type HolidaysStatus,
  type UiSettings,
  type WeekNumberMode,
} from "../services/tauriCommands";
import { documentLang, t, type AppLocale } from "../i18n/messages";
import { useSettingsChromeTheme } from "../theme/useSettingsChromeTheme";

function isValidHolidaySourceUrl(url: string): boolean {
  if (!url) return true;
  return url.startsWith("https://") && url.includes("{year}");
}

export default function SettingsApp() {
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_UI_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [stubMessage, setStubMessage] = useState<string | null>(null);
  const [holidayStatus, setHolidayStatus] = useState<HolidaysStatus | null>(null);
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [holidayRefreshing, setHolidayRefreshing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [holidayUrlDraft, setHolidayUrlDraft] = useState("");
  const locale = settings.locale ?? "zh";

  useEffect(() => {
    document.documentElement.lang = documentLang(locale);
  }, [locale]);

  useEffect(() => {
    void setCurrentWindowTitle(t(locale, "settingsTitle"));
  }, [locale]);

  useEffect(() => {
    void settingsGet()
      .then((loaded) => {
        setSettings(loaded);
        setHolidayUrlDraft(loaded.holidaySourceUrl ?? "");
      })
      .catch(() => setError(t(locale, "readSettingsFailed")));
    let unlisten: (() => void) | undefined;
    void onSettingsChanged((next) => {
      setSettings(next);
      setHolidayUrlDraft(next.holidaySourceUrl ?? "");
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      void unlisten?.();
    };
  }, []);

  useEffect(() => {
    void holidaysStatus()
      .then(setHolidayStatus)
      .catch(() => undefined);
  }, []);

  useSettingsChromeTheme();

  async function persist(next: UiSettings) {
    if (!isValidHolidaySourceUrl(next.holidaySourceUrl)) {
      setError(t(locale, "holidaySourceUrlInvalid"));
      return;
    }
    setSettings(next);
    try {
      setError(null);
      setSettings(await settingsSet(next));
    } catch {
      setError(t(locale, "saveSettingsFailed"));
    }
  }

  async function refreshHolidays() {
    setHolidayRefreshing(true);
    setHolidayError(null);
    try {
      await holidaysRefresh();
      setHolidayStatus(await holidaysStatus());
    } catch {
      setHolidayError(t(locale, "holidaysRefreshFailed"));
      try {
        setHolidayStatus(await holidaysStatus());
      } catch {
        // keep prior status
      }
    } finally {
      setHolidayRefreshing(false);
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

  const fetchedAtLabel =
    holidayStatus?.fetchedAt ?? t(locale, "holidaysNotFetched");

  const effectiveHolidayUrl =
    settings.holidaySourceUrl || BUILTIN_HOLIDAY_URL_TEMPLATE;

  return (
    <main className="app-shell">
      <h1 className="app-title">{t(locale, "settingsTitle")}</h1>
      <p className="settings-meta">
        {t(locale, "appVersionLabel")} {__APP_VERSION__}
      </p>

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
        <label className="settings-row">
          <span>{t(locale, "opacity")}</span>
          <input
            type="range"
            min={0.7}
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
        <p>{t(locale, "opacityHelp")}</p>
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
        <div className="settings-row">
          <span>{t(locale, "weekNumberMode")}</span>
          {(["iso", "remaining"] as WeekNumberMode[]).map((code) => (
            <button
              key={code}
              type="button"
              className={`widget-btn${(settings.weekNumberMode ?? "iso") === code ? " widget-btn--active" : ""}`}
              aria-pressed={(settings.weekNumberMode ?? "iso") === code}
              onClick={() => void persist({ ...settings, weekNumberMode: code })}
            >
              {t(locale, code === "iso" ? "weekNumberIso" : "weekNumberRemaining")}
            </button>
          ))}
        </div>
        <p>{t(locale, "weekStartsMonday")}</p>
      </section>

      <section className="settings-section">
        <button
          type="button"
          className="widget-btn settings-advanced-toggle"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          {t(locale, "advancedSettings")}
        </button>

        {advancedOpen && (
          <div className="settings-advanced-panel">
            <h2>{t(locale, "holidaysSection")}</h2>
            <p>{t(locale, "holidaysSectionHelp")}</p>
            <p className="settings-warning" role="note">
              {t(locale, "holidaySourceUrlWarning")}
            </p>
            <label className="settings-row settings-url-field">
              <span>{t(locale, "holidaySourceUrlLabel")}</span>
              <input
                type="url"
                className="settings-url-input"
                value={holidayUrlDraft}
                placeholder={BUILTIN_HOLIDAY_URL_TEMPLATE}
                onChange={(e) => setHolidayUrlDraft(e.target.value)}
                onBlur={() => {
                  if (holidayUrlDraft === settings.holidaySourceUrl) return;
                  void persist({ ...settings, holidaySourceUrl: holidayUrlDraft.trim() });
                }}
              />
            </label>
            <p>{t(locale, "holidaySourceUrlHelp")}</p>
            <div className="settings-row">
              <button
                type="button"
                className="widget-btn"
                onClick={() => {
                  setHolidayUrlDraft("");
                  void persist({ ...settings, holidaySourceUrl: "" });
                }}
              >
                {t(locale, "holidaySourceUrlReset")}
              </button>
            </div>
            {holidayStatus && (
              <p className="settings-meta">
                {t(locale, "holidaysSource")}: {holidayStatus.sourceUrl || effectiveHolidayUrl}
              </p>
            )}
            {holidayStatus && (
              <p className="settings-meta">
                {t(locale, "holidaysFetchedAt")}: {fetchedAtLabel}
              </p>
            )}
            {holidayError && (
              <p className="widget-error" role="alert">
                {holidayError}
              </p>
            )}
            <button
              type="button"
              className="widget-btn"
              disabled={holidayRefreshing}
              onClick={() => void refreshHolidays()}
            >
              {holidayRefreshing ? t(locale, "holidaysRefreshing") : t(locale, "holidaysRefresh")}
            </button>
          </div>
        )}
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
