import { useEffect } from "react";
import { applyThemeToDocument } from "./applyTheme";

/** Settings and list windows always use light cream chrome, independent of widget theme. */
export function useSettingsChromeTheme() {
  useEffect(() => {
    applyThemeToDocument({
      scheme: "light",
      fillAlpha: 1,
      textOutlineEnabled: false,
      overlay: null,
    });
  }, []);
}
