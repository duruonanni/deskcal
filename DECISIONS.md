# Decisions — DeskCal (桌历)

> **AI:** Read `## Current truth` first. Append dated entries only for choices that still matter in six months. Session progress, smoke pending, quotas → `SESSION_HANDOFF.md`, not here.

## Current truth

Scan this section before coding. Details and history are in the log below.

- **Project:** personal OSS widget; display name 桌历; crate/package `deskcal`; MIT; https://github.com/duruonanni/deskcal
- **V0 in:** Tauri 2 + React + TS + Vite; SQLite items; lunar + 休/班; tray; global hotkey `Ctrl+Shift+C`
- **V0 out:** BYOK AI, folder sync, WorkerW wallpaper, MCP — stubs only (`ai/`, `sync/`)
- **Data:** live DB `%APPDATA%\dev.deskcal.app\app.db` — never in cloud-sync folders
- **Widget UI:** rolling 4-week Monday grid; month-break rows; dark widget + light settings/list; Win+Right default placement (`placed_win_right_v1`); frame outline only while moving
- **Desktop pin:** no WorkerW parent; `user_hidden` only via tray/settings; block Show Desktop bury; raise on desktop foreground — settings/list call `unpin()` first
- **Holidays:** bundled JSON + fetch (custom URL → jsDelivr → GitHub raw); lunar via `lunar-javascript`
- **Release:** NSIS only; WebView2 `downloadBootstrapper`; output under `src-tauri/target/release/bundle/nsis/`
- **Version SSOT:** `package.json` `"version"` — **patch bump only in `npm run release`** (runs bump + `tauri build`); sync via `scripts/sync-version.mjs`; settings shows `__APP_VERSION__`; skip bump with `DESKCAL_SKIP_VERSION_BUMP=1`
- **Icons SSOT:** `src-tauri/icons/app-icon.svg` → `npm run icons:generate`
- **Figma (optional):** https://www.figma.com/design/8IVe6sQ0nL4oIxmmx1CIQj — code SSOT remains CSS tokens + visual-language spec
- **Open:** recurrence / `due_at` before BYOK AI — not decided

---

## Decision log

## 2026-08-28 — Project admission

- **status:** accepted
- **context:** Personal offline Windows calendar; GitHub OSS intent; “为爱发电”.
- **decision:** Project type is `personal`. Display name `桌历`, package/crate `deskcal`. License MIT. Folder: `02_PROJECTS/00_Personal_Projects/DesktopCalendar_Project`.
- **consequence:** No enterprise dashboard templates. Own git repo in this folder.

## 2026-08-28 — V0 scope

- **status:** accepted
- **context:** Full CalendarTask clone plus BYOK AI plus folder sync is too large for a first ship.
- **decision:** V0 is Tauri 2 widget + SQLite items + lunar/休班 + tray. AI HTTP, folder snapshot sync, WorkerW wallpaper, and MCP are out of V0. Stub modules `ai/` and `sync/` return `not_implemented`.
- **consequence:** Settings pages for AI/sync show “即将推出”. Live DB stays in `%APPDATA%\deskcal\`, never in a cloud-synced folder.

## 2026-08-28 — Stack and UI

- **status:** accepted
- **context:** Need a small Windows binary and a Web UI the Studio AI workflow can edit.
- **decision:** Tauri 2 + React + TypeScript + Vite; rusqlite; version SSOT is `package.json`. Widget is frameless, click-day expands a day panel below; default cell density is dots only, optional in-cell titles (max 2 + `+N`). Week starts Monday. Global hotkey `Ctrl+Shift+C` captures to today.
- **consequence:** No Electron. No Docker. No second hand-edited VERSION constant.

## 2026-08-28 — V0 shipped locally

- **status:** accepted
- **context:** First implementation session after the V0 plan.
- **decision:** SQLite lives in Tauri `app_data_dir()` as `app.db` (Windows: `%APPDATA%\dev.deskcal.app\app.db`). UI settings stored in table `kv`. Holiday file `data/cn-holidays.json` from 国务院办公厅 2025/2026 notices. Lunar via offline `lunar-javascript`.
- **consequence:** Identifier `dev.deskcal.app` drives the app data folder name. Release-time version sync from `package.json` into `tauri.conf.json` and `Cargo.toml`.

## 2026-08-28 — Windows installer: NSIS, no embedded WebView2

- **status:** accepted
- **context:** Want a small GitHub-distributable setup.exe, comparable in *class* to CalendarTask (~7MB), without rewriting off Tauri.
- **decision:** Bundle target is NSIS only (`targets: "nsis"`). WebView2 uses `downloadBootstrapper` (silent); do not embed `offlineInstaller` or `fixedVersion`. NSIS uses LZMA and per-user install (`currentUser`).
- **consequence:** Installer stays small on Win10/11. A machine without WebView2 needs network on first install. `npm run release` writes `src-tauri/target/release/bundle/nsis/`. MSI is not produced.

## 2026-08-28 — Drag, lock, top-right default, zh/en

- **status:** superseded (placement → Win+Right; cell titles → rolling grid)
- **context:** Frameless WebView2 `data-tauri-drag-region` did not move the widget; default cell mode hid task titles; owner wants CalendarTask-like glass grid and bilingual chrome.
- **decision:** Drag uses `startDragging()` on unlocked empty areas; lock is `widgetLocked` in settings plus a header toggle. UI locale `zh` | `en` is global (widget, settings, list, tray).
- **consequence:** Placement and cell-density details superseded by later grid decisions. Lock/drag/locale still apply.

## 2026-08-28 — Editorial glass visual language

- **status:** accepted (partial — widget is now dark-only rolling grid)
- **context:** V0 chrome looked generic; opacity did not show the desktop; owner wants light/dark of one language, true tinted glass, Win8-style hot tiles, bilingual chrome, and a token contract for later custom themes.
- **decision:** Implement `docs/superpowers/specs/2026-08-28-ui-visual-language-design.md`. CSS tokens + theme contract; custom pack load from `themes/custom.json` with no customizer UI. Locale remains `zh` | `en` for all new strings.
- **consequence:** Widget wallpaper, memorial cards, and customizer UI are follow-ups. WorkerW stays out of V0.

## 2026-08-28 — Figma as optional design surface

- **status:** accepted
- **context:** Owner wants Cursor Figma MCP for UI/UX. One design file for optional drafts.
- **decision:** One design file **DeskCal 桌历** at https://www.figma.com/design/8IVe6sQ0nL4oIxmmx1CIQj (`fileKey` `8IVe6sQ0nL4oIxmmx1CIQj`). Code SSOT remains CSS tokens + the visual-language spec. No Code Connect.
- **consequence:** Figma is optional reference only; implementation does not block on Figma quota or seats.

## 2026-08-30 — Rolling week grid (xdiarys-like)

- **status:** accepted
- **context:** Owner wanted the widget closer to 日历清单: large right-side 4-week grid, today on row 2, weekend/weekday cell tints, no text outline, settings gear, lunar local + 休/班 fetch, cell popover for tasks. Cross-day drag is out.
- **decision:** Rolling 4-week Monday grid (`buildRollingWeekGrid`). Items use SQLite `sort` + `items_uncomplete` + same-day reorder. Click opens `DayPopover`. Statutory holidays fetch NateScarlet/holiday-cn (jsDelivr then GitHub raw), cache in app data, bundled `data/cn-holidays.json` fallback. Lunar stays `lunar-javascript`.
- **consequence:** `DayPanel` removed. Opacity slider means cell tint, not a whole-card plate.

## 2026-08-30 — Adaptive size, month-break grid, dark-only widget

- **status:** accepted (placement superseded by Win+Right)
- **context:** Month change should start a new grid row with empty padding. Dark widget + white text at high cell opacity; settings/list stay light forever. Custom holiday source URL in advanced settings.
- **decision:** `buildRollingWeekGrid` uses `(Date|null)[][]` with month-break rows. Widget always dark (`useDeskCalTheme`); settings/list use `useSettingsChromeTheme` (light, fillAlpha 1). Opacity 0.70–1.00 default 0.85. `holidaySourceUrl` in `UiSettings`; https-only with `{year}`; fetch order: custom → jsDelivr default → GitHub raw.
- **consequence:** Theme mode UI removed from settings (field retained in DB for compat). Grid may show 5 rows when month splits mid-span.

## 2026-08-30 — Default to Windows snap-right third; frame only while moving

- **status:** superseded
- **context:** Owner asked to match Windows Snap Layouts; first implementation used the 2/3+1/3 right zone. Owner then clarified they meant **Win+Right (right half)**.
- **decision:** See **Win+Right half** below. Frame-on-move decision stands.

## 2026-08-30 — Default is Win+Right (right half of work area)

- **status:** accepted
- **context:** Owner wants the widget to fill the same zone as `Win+→`: the right **half** of the primary work area, full height above the taskbar.
- **decision:** Place with `GetMonitorInfoW` `rcWork` + `SetWindowPos`. Width = right half. One-time kv `placed_win_right_v1`. Frame: `shadow: false`; CSS outline only while moving/resizing.
- **consequence:** Replaces adaptive and 1/3 snap attempts. After the user drags, saved `window-widget.json` wins.

## 2026-08-30 — Widget stays on the desktop until the user hides it

- **status:** accepted
- **context:** Clicking empty desktop (or Show Desktop) buried the skip-taskbar widget behind Explorer’s desktop host.
- **decision:** Do **not** parent into WorkerW. Track `user_hidden` (tray toggle / `app_hide` only). Subclass `WM_WINDOWPOSCHANGING` to block hide and the −32000 Show Desktop move. `SetWinEventHook(EVENT_SYSTEM_FOREGROUND)`: when desktop host is foreground, `SW_SHOWNA` + `HWND_TOP` (not `HWND_TOPMOST`). Opening settings/list calls `unpin()` first.
- **consequence:** Clicking wallpaper keeps the calendar visible. Tray left-click and 设置隐藏 still hide it.

## 2026-08-30 — Version SSOT, bump on each commit, show in settings

- **status:** superseded
- **context:** Owner asked to maintain the app version on every commit and show it in settings.
- **decision:** See **Version SSOT, bump on release only** below.

## 2026-08-30 — Version SSOT, bump on release only, show in settings

- **status:** accepted
- **context:** Owner prefers semver bumps only when shipping a release build, aligned with Studio `RELEASE_VERSIONING.md`.
- **decision:** SSOT remains `package.json` `"version"`. **`npm run release`** runs patch bump (or `DESKCAL_VERSION_BUMP=minor|major`) then `npm run tauri -- build`. `scripts/sync-version.mjs` copies version into `tauri.conf.json`, `Cargo.toml`, and `Cargo.lock`. Same-version republish: `DESKCAL_SKIP_VERSION_BUMP=1 npm run release`. Settings shows version via Vite `define` `__APP_VERSION__`. Do not hand-edit a second VERSION constant. Ordinary git commits do **not** bump.
- **consequence:** Installer metadata and settings stay aligned. `version:bump` / `version:sync` remain for manual use.

## 2026-08-30 — Public GitHub repo under MIT

- **status:** accepted
- **context:** Owner wants this personal desktop calendar on GitHub as open source.
- **decision:** Keep **MIT** (already in `LICENSE`). Public remote is `https://github.com/duruonanni/deskcal`.
- **consequence:** Anyone can use, fork, and ship derivatives with attribution.

## Open (not yet decided)

- Whether V0.5 adds recurrence / `due_at` before BYOK AI.
