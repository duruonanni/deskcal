# Editorial Glass UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the editorial glass visual language: true tinted-glass widget, Light/Dark Auto, Win8-style hot tiles, bilingual chrome, and a loadable `custom.json` token pack — without a customizer UI.

**Architecture:** CSS variables on `html[data-theme=light|dark]` plus `--card-fill-alpha` from settings. `themeMode` lives on existing `UiSettings`. Custom pack is optional JSON from `%APPDATA%\dev.deskcal.app\themes\custom.json` parsed in TypeScript. Do not use CSS `backdrop-filter` or Windows Mica/Acrylic for this ship.

**Tech Stack:** Tauri 2, React 19, TypeScript, Vite, Vitest, rusqlite. Tests: `npm test` (Vitest) and `cargo test` in `src-tauri`.

**Spec:** `docs/superpowers/specs/2026-08-28-ui-visual-language-design.md`

**Composer (token-saving):** The owner asked to implement via Composer subagents. Dispatch **one Task tool subagent per plan task** with `model: "composer-2.5-fast"`. Use `composer-2.5` only for Task 6 (CSS) if the fast model struggles with visual CSS. Each prompt must include **only that task** (files, steps, code), the spec path, and: do not expand day-panel click behavior, wallpaper, memorial cards, or customizer UI. Parent session runs the test commands and reviews the diff before the next task.

---

## File map

| File | Role |
| --- | --- |
| `src-tauri/src/domain/mod.rs` | `ThemeMode`, clamp 0.10–0.40, defaults |
| `src-tauri/src/db/mod.rs` | Persist `themeMode`; update default assertions |
| `src-tauri/src/commands/settings.rs` | Clamp on get/set; `theme_custom_read` |
| `src-tauri/src/lib.rs` | Register `theme_custom_read` |
| `src-tauri/src/platform/windows/mod.rs` | Stop applying Mica/Acrylic (fights true alpha) |
| `src/services/tauriCommands.ts` | `themeMode`, `themeCustomRead` |
| `src/theme/resolveScheme.ts` | `auto` → light/dark |
| `src/theme/themePack.ts` | Parse custom JSON |
| `src/theme/applyTheme.ts` | `data-theme` + CSS variable overlay |
| `src/theme/useDeskCalTheme.ts` | Hook: settings + `prefers-color-scheme` + pack |
| `src/i18n/messages.ts` | New keys, both locales |
| `src/index.css` | Editorial tokens; no blur; no cell fill |
| `src/widgets/MonthGrid.tsx` | Hot tiles + task bar |
| `src/widgets/WidgetApp.tsx` | Token fill alpha; drop hardcoded rgba |
| `src/settings/SettingsApp.tsx` | Theme picker, opacity help, pack warning, window title |
| `src/list/ListApp.tsx` | Themed shell + window title |

Do **not** modify day-panel expand/click wiring in `WidgetApp` beyond theme/opacity style.

---

### Task 1: ThemeMode + opacity clamp in Rust

**Files:**
- Modify: `src-tauri/src/domain/mod.rs`
- Modify: `src-tauri/src/db/mod.rs` (test `ui_settings_default_then_roundtrip`)
- Modify: `src-tauri/src/commands/settings.rs`

- [ ] **Step 1: Write failing domain tests**

Append inside `src-tauri/src/domain/mod.rs` (after `impl Default for UiSettings`):

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_opacity_to_tinted_glass_range() {
        let mut s = UiSettings::default();
        s.widget_opacity = 0.05;
        assert!((s.clamped().widget_opacity - 0.10).abs() < f32::EPSILON);
        s.widget_opacity = 0.90;
        assert!((s.clamped().widget_opacity - 0.40).abs() < f32::EPSILON);
    }

    #[test]
    fn defaults_match_editorial_glass() {
        let s = UiSettings::default();
        assert!((s.widget_opacity - 0.25).abs() < f32::EPSILON);
        assert!(!s.show_titles_in_cells);
        assert_eq!(s.theme_mode, ThemeMode::Auto);
    }
}
```

Missing `themeMode` on old JSON becomes Auto via `#[serde(default)]`. Unknown values from the frontend are normalized in TypeScript (Task 3).

- [ ] **Step 2: Run tests (expect fail)**

Run:

```powershell
cd D:\Studio\02_PROJECTS\00_Personal_Projects\DesktopCalendar_Project\src-tauri
cargo test clamp_opacity_to_tinted_glass_range -- --nocapture
```

Expected: compile error, `ThemeMode` / new defaults not defined.

- [ ] **Step 3: Implement domain types**

In `src-tauri/src/domain/mod.rs`, after `AppLocale`:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    #[default]
    Auto,
    Light,
    Dark,
}
```

Update `UiSettings`:

```rust
    #[serde(default)]
    pub widget_locked: bool,
    #[serde(default)]
    pub theme_mode: ThemeMode,
```

`clamped`:

```rust
        self.widget_opacity = self.widget_opacity.clamp(0.10, 0.40);
```

`Default`:

```rust
            widget_opacity: 0.25,
            show_titles_in_cells: false,
            text_outline: true,
            locale: AppLocale::Zh,
            widget_locked: false,
            theme_mode: ThemeMode::Auto,
```

- [ ] **Step 4: Clamp on get and set**

`src-tauri/src/commands/settings.rs`:

```rust
pub fn settings_get(state: State<'_, AppState>) -> Result<UiSettings, String> {
    let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
    Ok(db::get_ui_settings(&conn).map_err(db_err_to_string)?.clamped())
}
```

`settings_set` already calls `clamped()`.

- [ ] **Step 5: Fix db test**

In `src-tauri/src/db/mod.rs` test `ui_settings_default_then_roundtrip`:

- Change `assert!(initial.show_titles_in_cells);` to `assert!(!initial.show_titles_in_cells);`
- Change `next.widget_opacity = 0.5;` to `next.widget_opacity = 0.3;`
- Assert `0.3` on load

- [ ] **Step 6: Run tests (expect pass)**

```powershell
cd D:\Studio\02_PROJECTS\00_Personal_Projects\DesktopCalendar_Project\src-tauri
cargo test --lib
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add src-tauri/src/domain/mod.rs src-tauri/src/db/mod.rs src-tauri/src/commands/settings.rs
git commit -m "Add themeMode and clamp widget fill alpha to 10-40 percent."
```

---

### Task 2: i18n keys (zh + en)

**Files:**
- Modify: `src/i18n/messages.ts`
- Create: `src/i18n/messages.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/i18n/messages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { t } from "./messages";

describe("editorial glass copy", () => {
  it("has distinct zh and en theme labels", () => {
    expect(t("zh", "themeAuto")).toBe("跟随系统");
    expect(t("en", "themeAuto")).toBe("Follow system");
    expect(t("zh", "themeLight")).toBe("浅色");
    expect(t("en", "themeLight")).toBe("Light");
    expect(t("zh", "themeDark")).toBe("深色");
    expect(t("en", "themeDark")).toBe("Dark");
  });

  it("explains true transparency", () => {
    expect(t("zh", "opacityHelp")).toContain("桌面");
    expect(t("en", "opacityHelp").toLowerCase()).toContain("desktop");
  });

  it("localizes tile marks", () => {
    expect(t("zh", "restMark")).toBe("休");
    expect(t("en", "restMark")).toBe("Off");
    expect(t("zh", "workMark")).toBe("班");
    expect(t("en", "workMark")).toBe("Work");
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```powershell
cd D:\Studio\02_PROJECTS\00_Personal_Projects\DesktopCalendar_Project
npm test -- src/i18n/messages.test.ts
```

Expected: FAIL, keys not on `MessageKey`.

- [ ] **Step 3: Add keys to both tables**

Extend `MessageKey` with:

`themeModeLabel` | `themeAuto` | `themeLight` | `themeDark` | `opacityHelp` | `customThemeInvalid` | `restMark` | `workMark`

ZH:

```ts
  themeModeLabel: "主题",
  themeAuto: "跟随系统",
  themeLight: "浅色",
  themeDark: "深色",
  opacityHelp: "越低越能看见桌面。",
  customThemeInvalid: "自定义主题文件无效，已回落到编辑风。",
  restMark: "休",
  workMark: "班",
```

EN:

```ts
  themeModeLabel: "Theme",
  themeAuto: "Follow system",
  themeLight: "Light",
  themeDark: "Dark",
  opacityHelp: "Lower values show more of the desktop.",
  customThemeInvalid: "Custom theme file is invalid; fell back to Editorial.",
  restMark: "Off",
  workMark: "Work",
```

Keep existing `opacity` key (`底板不透明度` / `Background opacity`) — it is fill alpha, not inverted “transparency”.

- [ ] **Step 4: Run test (expect pass)**

```powershell
npm test -- src/i18n/messages.test.ts src/widgets/calendarUtils.test.ts
```

Expected: PASS. Existing locale tests stay green.

- [ ] **Step 5: Commit**

```powershell
git add src/i18n/messages.ts src/i18n/messages.test.ts
git commit -m "Add bilingual strings for theme mode and tile marks."
```

---

### Task 3: resolveScheme + custom pack parse (pure TS)

**Files:**
- Create: `src/theme/resolveScheme.ts`
- Create: `src/theme/resolveScheme.test.ts`
- Create: `src/theme/themePack.ts`
- Create: `src/theme/themePack.test.ts`

- [ ] **Step 1: Write failing tests**

`src/theme/resolveScheme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeThemeMode, resolveScheme } from "./resolveScheme";

describe("resolveScheme", () => {
  it("locks light and dark", () => {
    expect(resolveScheme("light", true)).toBe("light");
    expect(resolveScheme("dark", false)).toBe("dark");
  });

  it("follows OS when auto", () => {
    expect(resolveScheme("auto", true)).toBe("dark");
    expect(resolveScheme("auto", false)).toBe("light");
  });

  it("treats unknown mode as auto", () => {
    expect(normalizeThemeMode("purple")).toBe("auto");
    expect(resolveScheme(normalizeThemeMode("nope"), true)).toBe("dark");
  });
});
```

`src/theme/themePack.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseThemePack } from "./themePack";

const TOKEN_KEYS = [
  "cardFillRgb",
  "text",
  "textMuted",
  "textDim",
  "accent",
  "accentOnAccent",
  "tileTodayBg",
  "tileRestBg",
  "tileWorkBg",
  "borderSoft",
  "shadow",
  "textOutline",
  "dialogBg",
  "dialogText",
] as const;

function stubPole() {
  return Object.fromEntries(TOKEN_KEYS.map((k) => [k, k === "cardFillRgb" ? "255, 250, 244" : "#111"]));
}

describe("parseThemePack", () => {
  it("returns missing for empty input", () => {
    expect(parseThemePack(null).status).toBe("missing");
  });

  it("returns invalid on junk JSON", () => {
    expect(parseThemePack("{").status).toBe("invalid");
  });

  it("accepts light-only pack", () => {
    const parsed = parseThemePack(JSON.stringify({ light: stubPole() }));
    expect(parsed.status).toBe("ok");
    if (parsed.status === "ok") {
      expect(parsed.pack.light).toBeTruthy();
      expect(parsed.pack.dark).toBeUndefined();
    }
  });

  it("rejects pole missing keys", () => {
    expect(parseThemePack(JSON.stringify({ light: { text: "#000" } })).status).toBe("invalid");
  });
});
```

- [ ] **Step 2: Run tests (expect fail)**

```powershell
npm test -- src/theme/resolveScheme.test.ts src/theme/themePack.test.ts
```

Expected: FAIL, modules missing.

- [ ] **Step 3: Implement**

`src/theme/resolveScheme.ts`:

```ts
export type ThemeMode = "auto" | "light" | "dark";
export type ColorScheme = "light" | "dark";

export function normalizeThemeMode(raw: unknown): ThemeMode {
  return raw === "light" || raw === "dark" || raw === "auto" ? raw : "auto";
}

export function resolveScheme(mode: ThemeMode, prefersDark: boolean): ColorScheme {
  if (mode === "light" || mode === "dark") return mode;
  return prefersDark ? "dark" : "light";
}

export function prefersDarkFromWindow(win: { matchMedia?: (q: string) => { matches: boolean } }): boolean {
  try {
    return Boolean(win.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
  } catch {
    return false;
  }
}
```

`src/theme/themePack.ts`:

```ts
export const THEME_TOKEN_KEYS = [
  "cardFillRgb",
  "text",
  "textMuted",
  "textDim",
  "accent",
  "accentOnAccent",
  "tileTodayBg",
  "tileRestBg",
  "tileWorkBg",
  "borderSoft",
  "shadow",
  "textOutline",
  "dialogBg",
  "dialogText",
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];
export type ThemeTokens = Record<ThemeTokenKey, string>;

export interface ThemePack {
  light?: ThemeTokens;
  dark?: ThemeTokens;
}

export type ParseThemePackResult =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "ok"; pack: ThemePack };

function isTokens(value: unknown): value is ThemeTokens {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return THEME_TOKEN_KEYS.every((key) => typeof rec[key] === "string" && rec[key].length > 0);
}

export function parseThemePack(raw: string | null | undefined): ParseThemePackResult {
  if (raw == null || raw.trim() === "") return { status: "missing" };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { status: "invalid" };
  }
  if (!json || typeof json !== "object") return { status: "invalid" };
  const rec = json as Record<string, unknown>;
  const light = rec.light === undefined ? undefined : rec.light;
  const dark = rec.dark === undefined ? undefined : rec.dark;
  if (light !== undefined && !isTokens(light)) return { status: "invalid" };
  if (dark !== undefined && !isTokens(dark)) return { status: "invalid" };
  if (!light && !dark) return { status: "invalid" };
  return {
    status: "ok",
    pack: {
      light: light as ThemeTokens | undefined,
      dark: dark as ThemeTokens | undefined,
    },
  };
}

export function tokensForScheme(pack: ThemePack, scheme: "light" | "dark"): ThemeTokens | null {
  if (scheme === "light") return pack.light ?? pack.dark ?? null;
  return pack.dark ?? pack.light ?? null;
}
```

`tokensForScheme`: if the pack has only one pole, both schemes use that pole (`themeMode` ignored for colors), per spec.

- [ ] **Step 4: Run tests (expect pass)**

```powershell
npm test -- src/theme
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/theme/resolveScheme.ts src/theme/resolveScheme.test.ts src/theme/themePack.ts src/theme/themePack.test.ts
git commit -m "Add theme scheme resolution and custom pack parsing."
```

---

### Task 4: Read custom.json from app data

**Files:**
- Modify: `src-tauri/src/commands/settings.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/services/tauriCommands.ts`

- [ ] **Step 1: Add command**

In `settings.rs`, add `AppHandle` + `Manager` imports as needed:

```rust
#[tauri::command]
pub fn theme_custom_read(app: AppHandle) -> Result<Option<String>, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))?;
    let path = dir.join("themes").join("custom.json");
    match std::fs::read_to_string(&path) {
        Ok(raw) => Ok(Some(raw)),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(err.to_string()),
    }
}
```

Register in `lib.rs` invoke_handler next to `settings_set`:

```rust
            commands::settings::theme_custom_read,
```

- [ ] **Step 2: TS wrapper**

In `src/services/tauriCommands.ts`:

```ts
export type ThemeMode = "auto" | "light" | "dark";

export interface UiSettings {
  widgetOpacity: number;
  showTitlesInCells: boolean;
  textOutline: boolean;
  locale: AppLocale;
  widgetLocked: boolean;
  themeMode: ThemeMode;
}

export const DEFAULT_UI_SETTINGS: UiSettings = {
  widgetOpacity: 0.25,
  showTitlesInCells: false,
  textOutline: true,
  locale: "zh",
  widgetLocked: false,
  themeMode: "auto",
};

export async function themeCustomRead(): Promise<string | null> {
  return invoke<string | null>("theme_custom_read");
}
```

`settingsGet` already spreads `DEFAULT_UI_SETTINGS` over partial IPC, so missing `themeMode` becomes `"auto"`.

- [ ] **Step 3: Compile check**

```powershell
cd D:\Studio\02_PROJECTS\00_Personal_Projects\DesktopCalendar_Project
npx tsc --noEmit
cd src-tauri
cargo check
```

Expected: both succeed. (Need `use tauri::Manager` on `AppHandle` for `.path()`.)

- [ ] **Step 4: Commit**

```powershell
git add src-tauri/src/commands/settings.rs src-tauri/src/lib.rs src/services/tauriCommands.ts
git commit -m "Load optional custom theme JSON from app data."
```

---

### Task 5: Apply theme to document

**Files:**
- Create: `src/theme/applyTheme.ts`
- Create: `src/theme/useDeskCalTheme.ts`
- Modify: `src/widgets/WidgetApp.tsx`
- Modify: `src/settings/SettingsApp.tsx`
- Modify: `src/list/ListApp.tsx`

- [ ] **Step 1: Implement applyTheme**

`src/theme/applyTheme.ts`:

```ts
import type { ColorScheme } from "./resolveScheme";
import type { ThemeTokens } from "./themePack";

const CSS_VAR: Record<keyof ThemeTokens, string> = {
  cardFillRgb: "--card-fill-rgb",
  text: "--text",
  textMuted: "--text-muted",
  textDim: "--text-dim",
  accent: "--accent",
  accentOnAccent: "--accent-on-accent",
  tileTodayBg: "--tile-today-bg",
  tileRestBg: "--tile-rest-bg",
  tileWorkBg: "--tile-work-bg",
  borderSoft: "--border-soft",
  shadow: "--shadow",
  textOutline: "--text-outline",
  dialogBg: "--dialog-bg",
  dialogText: "--dialog-text",
};

export function applyThemeToDocument(options: {
  scheme: ColorScheme;
  fillAlpha: number;
  textOutlineEnabled: boolean;
  overlay: ThemeTokens | null;
}): void {
  const root = document.documentElement;
  root.dataset.theme = options.scheme;
  root.style.setProperty("--card-fill-alpha", String(options.fillAlpha));
  if (options.overlay) {
    for (const [key, cssName] of Object.entries(CSS_VAR)) {
      root.style.setProperty(cssName, options.overlay[key as keyof ThemeTokens]);
    }
  } else {
    for (const cssName of Object.values(CSS_VAR)) {
      root.style.removeProperty(cssName);
    }
  }
  root.style.setProperty(
    "--text-shadow",
    options.textOutlineEnabled ? "var(--text-outline)" : "none",
  );
}
```

- [ ] **Step 2: Hook**

`src/theme/useDeskCalTheme.ts`:

```ts
import { useEffect, useState } from "react";
import {
  DEFAULT_UI_SETTINGS,
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
```

Call `useDeskCalTheme(ui)` in `WidgetApp`, `SettingsApp`, and `ListApp` after settings are loaded (pass current `ui` / `settings` state). Do not block item CRUD if `themeCustomRead` fails.

- [ ] **Step 3: WidgetApp fill**

Remove the inline `"--card-bg": rgba(18, 24, 32, …)` block. Card background must come from CSS:

`background: rgba(var(--card-fill-rgb), var(--card-fill-alpha));`

Keep lock/drag handlers unchanged.

- [ ] **Step 4: Typecheck**

```powershell
npx tsc --noEmit
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/theme/applyTheme.ts src/theme/useDeskCalTheme.ts src/widgets/WidgetApp.tsx src/settings/SettingsApp.tsx src/list/ListApp.tsx
git commit -m "Apply resolved light and dark tokens to all windows."
```

---

### Task 6: Editorial CSS (Composer 2.5 if needed)

**Files:**
- Modify: `src/index.css`
- Modify: `src-tauri/src/platform/windows/mod.rs`

- [ ] **Step 1: Stop Mica/Acrylic**

In `src-tauri/src/platform/windows/mod.rs`, remove the call `try_apply_widget_effects(&window);` (around line 495). Remove `try_apply_widget_effects` and unused `Color` / `Effect` / `EffectsBuilder` imports if nothing else uses them.

This is required: those effects paint a system frost plate and hide true CSS alpha.

- [ ] **Step 2: Token blocks**

At the top of `src/index.css`, replace the current `:root` color tokens with:

```css
:root,
html[data-theme="light"] {
  --card-fill-rgb: 255, 250, 244;
  --card-fill-alpha: 0.25;
  --text: #2b2118;
  --text-muted: #6a5a4a;
  --text-dim: #9a8a7a;
  --accent: #c45a40;
  --accent-on-accent: #fffaf4;
  --tile-today-bg: #2b2118;
  --tile-rest-bg: #c45a40;
  --tile-work-bg: #5c6b70;
  --border-soft: rgba(43, 33, 24, 0.12);
  --shadow: 0 8px 24px rgba(40, 28, 18, 0.12);
  --text-outline: 0 0 4px rgba(255, 255, 255, 0.9), 0 1px 2px rgba(0, 0, 0, 0.12);
  --dialog-bg: #f7f3ee;
  --dialog-text: #2b2118;
  color: var(--text);
  background-color: transparent;
}

html[data-theme="dark"] {
  --card-fill-rgb: 16, 20, 18;
  --text: #f3eee6;
  --text-muted: rgba(243, 238, 230, 0.62);
  --text-dim: rgba(243, 238, 230, 0.42);
  --accent: #e8a090;
  --accent-on-accent: #1a1412;
  --tile-today-bg: #e8a090;
  --tile-rest-bg: #c45a40;
  --tile-work-bg: #6d7a80;
  --border-soft: rgba(255, 255, 255, 0.14);
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  --text-outline: 0 0 6px rgba(0, 0, 0, 0.85), 0 1px 2px rgba(0, 0, 0, 0.45);
  --dialog-bg: #1c1f1e;
  --dialog-text: #f3eee6;
  color: var(--text);
}
```

Keep `html, body, #root { background: transparent; }` for the widget window.

`.widget-card`:

```css
.widget-card {
  color: var(--text);
  background: rgba(var(--card-fill-rgb), var(--card-fill-alpha));
  border-radius: 20px;
  border: 1px solid var(--border-soft);
  box-shadow: var(--shadow);
  overflow: hidden;
  text-shadow: var(--text-shadow);
}
```

**No** `backdrop-filter`. **No** `-webkit-backdrop-filter`.

`.day-cell`: `background: transparent; border: 1px solid transparent;` (hot tiles set their own fill). Hover: `background: rgba(var(--card-fill-rgb), 0.2);` is too muddy — use `background: color-mix(in srgb, var(--accent) 8%, transparent);`.

Hot tiles:

```css
.day-cell--tile-today,
.day-cell--tile-rest,
.day-cell--tile-work {
  color: var(--accent-on-accent);
  text-shadow: none;
}
.day-cell--tile-today { background: var(--tile-today-bg); }
.day-cell--tile-rest { background: var(--tile-rest-bg); }
.day-cell--tile-work { background: var(--tile-work-bg); }
.day-cell--tile-today .day-cell-lunar,
.day-cell--tile-rest .day-cell-lunar,
.day-cell--tile-work .day-cell-lunar {
  color: var(--accent-on-accent);
  opacity: 0.8;
}

.day-cell-bar {
  height: 2px;
  width: 12px;
  margin: 3px auto 0;
  border-radius: 1px;
  background: var(--accent);
  flex-shrink: 0;
}
.day-cell--tile-today .day-cell-bar,
.day-cell--tile-rest .day-cell-bar,
.day-cell--tile-work .day-cell-bar {
  background: var(--accent-on-accent);
  opacity: 0.85;
}
```

`.app-shell`:

```css
.app-shell {
  padding: 1.25rem;
  background: var(--dialog-bg);
  color: var(--dialog-text);
  min-height: 100vh;
}
```

Restyle `.widget-btn` to borderless/text buttons (no grey pills). Settings `.app-shell .widget-btn` may keep a light border using `--border-soft`.

Remove `.day-cell--today` ring styles (replaced by tiles). Selected: `outline: 2px solid var(--accent);` on the button, not an extra fill.

- [ ] **Step 3: cargo check + tsc**

```powershell
cd D:\Studio\02_PROJECTS\00_Personal_Projects\DesktopCalendar_Project\src-tauri
cargo check
cd ..
npx tsc --noEmit
```

Expected: succeed.

- [ ] **Step 4: Commit**

```powershell
git add src/index.css src-tauri/src/platform/windows/mod.rs
git commit -m "Switch the widget to editorial glass tokens without system frost."
```

---

### Task 7: MonthGrid hot tiles + task bar

**Files:**
- Modify: `src/widgets/MonthGrid.tsx`

- [ ] **Step 1: Tile class + i18n marks**

Replace cell class construction with:

```tsx
              const tileKind = isToday
                ? "today"
                : mark?.kind === "rest"
                  ? "rest"
                  : mark?.kind === "work"
                    ? "work"
                    : null;

              const cellClass = [
                "day-cell",
                isOtherMonth && "day-cell--other",
                isWeekend && "day-cell--weekend",
                isSelected && "day-cell--selected",
                tileKind && `day-cell--tile-${tileKind}`,
              ]
                .filter(Boolean)
                .join(" ");
```

Replace hardcoded `休` / `Off` with `t(locale, "restMark")` / `t(locale, "workMark")`.

On today tiles that also have a rest/work mark, still render the mark (spec: today tile + rest caption).

Replace the dot:

```tsx
                    hasDot && <span className="day-cell-bar" aria-hidden="true" />
```

Do not change `onClick` / `onDoubleClick` / `onWheel`.

- [ ] **Step 2: Tests still pass**

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add src/widgets/MonthGrid.tsx
git commit -m "Render today and holiday cells as opaque hot tiles."
```

---

### Task 8: Settings UI + window titles

**Files:**
- Modify: `src/settings/SettingsApp.tsx`
- Modify: `src/list/ListApp.tsx`
- Modify: `src/services/tauriCommands.ts` (optional `setCurrentWindowTitle`)

- [ ] **Step 1: Title helper**

In `src/services/tauriCommands.ts`:

```ts
export async function setCurrentWindowTitle(title: string): Promise<void> {
  await getCurrentWindow().setTitle(title);
}
```

In `SettingsApp`, after locale is known:

```ts
  useEffect(() => {
    void setCurrentWindowTitle(t(locale, "settingsTitle"));
  }, [locale]);
```

In `ListApp`:

```ts
  useEffect(() => {
    void setCurrentWindowTitle(t(locale, "incompleteTitle"));
  }, [locale]);
```

- [ ] **Step 2: Theme picker**

In Appearance section, **before** the opacity slider, add three buttons: Auto / Light / Dark using `t(locale, "themeAuto"|…)`, `aria-pressed={settings.themeMode === code}`, persist `{ ...settings, themeMode: code }`. Heading: `t(locale, "themeModeLabel")`.

Under the opacity slider, add `<p>{t(locale, "opacityHelp")}</p>`.

Slider `min={0.1} max={0.4} step={0.01}`.

If `useDeskCalTheme(settings).packInvalid`, show `<p role="alert">{t(locale, "customThemeInvalid")}</p>`.

Do not add wallpaper controls or a theme-family dropdown.

- [ ] **Step 3: Typecheck + unit tests**

```powershell
npx tsc --noEmit
npm test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add src/settings/SettingsApp.tsx src/list/ListApp.tsx src/services/tauriCommands.ts
git commit -m "Add theme mode controls and localized settings window titles."
```

---

### Task 9: Docs + owner smoke

**Files:**
- Modify: `docs/superpowers/specs/2026-08-28-ui-visual-language-design.md` (status line → approved / implemented-in-progress)
- Modify: `SESSION_HANDOFF.md`

- [ ] **Step 1: Handoff**

Set current focus to: editorial glass shipped pending owner visual smoke. List smoke checklist:

1. Light and dark Windows wallpaper: desktop shows through the card at 10% and 25%; 40% more solid.  
2. Auto follows OS; lock Light/Dark ignores OS.  
3. No frosted Mica plate.  
4. Today tile; rest-day-that-is-today is today tile with 休/Off.  
5. Toggle 中文 / English: header, settings, list window title, tile marks.  
6. Drag/lock/hotkey/day panel still work (do not regress the other session).

- [ ] **Step 2: Full test suite**

```powershell
cd D:\Studio\02_PROJECTS\00_Personal_Projects\DesktopCalendar_Project
npm test
npm run build
cd src-tauri
cargo test
```

Expected: all PASS; `npm run build` succeeds.

- [ ] **Step 3: Commit**

```powershell
git add docs/superpowers/specs/2026-08-28-ui-visual-language-design.md SESSION_HANDOFF.md
git commit -m "Note editorial glass smoke checklist in session handoff."
```

---

## Spec coverage

| Spec section | Task |
| --- | --- |
| CSS tokens + `data-theme` | 5, 6 |
| `themeMode` auto/light/dark | 1, 3, 8 |
| True alpha 0.10–0.40 default 0.25, no blur | 1, 6 |
| Remove cell fills; hot tiles; task bar | 6, 7 |
| Custom JSON load, invalid fallback | 3, 4, 5, 8 |
| Settings/list opaque themed | 6, 8 |
| Bilingual new strings + window titles | 2, 7, 8 |
| Default `showTitlesInCells` false | 1, 4 |
| No click-to-expand change | all tasks |
| No Mica/Acrylic | 6 |
| Tests | 1–5, 7–9 |

## Out of this plan

Widget wallpaper + wallpaper opacity, memorial cards, customizer UI (already follow-ups).
