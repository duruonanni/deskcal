import { useEffect, useState } from "react";
import {
  themeCustomRead,
  type UiSettings,
} from "../services/tauriCommands";
import { applyThemeToDocument } from "./applyTheme";
import { prefersDarkFromWindow, resolveScheme, normalizeThemeMode } from "./resolveScheme";
import { parseThemePack, tokensForScheme } from "./themePack";

export function useDeskCalTheme(ui: UiSettings) {
  const [packInvalid, setPackInvalid] = useState(false);
  const [prefersDark, setPrefersDark] = useState(() => prefersDarkFromWindow(window));

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setPrefersDark(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void themeCustomRead()
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseThemePack(raw);
        const mode = normalizeThemeMode(ui.themeMode);
        const scheme = resolveScheme(mode, prefersDark);
        const overlay =
          parsed.status === "ok" ? tokensForScheme(parsed.pack, scheme) : null;
        setPackInvalid(parsed.status === "invalid");
        applyThemeToDocument({
          scheme,
          fillAlpha: ui.widgetOpacity,
          textOutlineEnabled: ui.textOutline,
          overlay,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setPackInvalid(false);
        applyThemeToDocument({
          scheme: resolveScheme(normalizeThemeMode(ui.themeMode), prefersDark),
          fillAlpha: ui.widgetOpacity,
          textOutlineEnabled: ui.textOutline,
          overlay: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [ui.themeMode, ui.widgetOpacity, ui.textOutline, prefersDark]);

  return { packInvalid };
}
