import { useEffect, useState } from "react";
import {
  themeCustomRead,
  type UiSettings,
} from "../services/tauriCommands";
import { applyThemeToDocument } from "./applyTheme";
import { parseThemePack, tokensForScheme } from "./themePack";

/** Widget always uses dark theme with light text; opacity controls cell fill alpha only. */
export function useDeskCalTheme(ui: UiSettings) {
  const [packInvalid, setPackInvalid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void themeCustomRead()
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseThemePack(raw);
        const overlay =
          parsed.status === "ok" ? tokensForScheme(parsed.pack, "dark") : null;
        setPackInvalid(parsed.status === "invalid");
        applyThemeToDocument({
          scheme: "dark",
          fillAlpha: ui.widgetOpacity,
          textOutlineEnabled: false,
          overlay,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setPackInvalid(false);
        applyThemeToDocument({
          scheme: "dark",
          fillAlpha: ui.widgetOpacity,
          textOutlineEnabled: false,
          overlay: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [ui.widgetOpacity]);

  return { packInvalid };
}
