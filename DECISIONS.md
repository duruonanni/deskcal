# Decisions — DeskCal (桌历)

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
- **consequence:** Identifier `dev.deskcal.app` drives the app data folder name. Publish-time version remains `package.json`; `tauri.conf.json` and `Cargo.toml` also carry `0.1.0` and must be synced on release.

## 2026-08-28 — Windows installer: NSIS, no embedded WebView2

- **status:** accepted
- **context:** Want a small GitHub-distributable setup.exe, comparable in *class* to CalendarTask (~7MB), without rewriting off Tauri.
- **decision:** Bundle target is NSIS only (`targets: "nsis"`). WebView2 uses `downloadBootstrapper` (silent); do not embed `offlineInstaller` or `fixedVersion`. NSIS uses LZMA and per-user install (`currentUser`).
- **consequence:** Installer stays small on Win10/11. A machine without WebView2 needs network on first install. `npm run tauri -- build` writes `src-tauri/target/release/bundle/nsis/`. MSI is not produced.

## 2026-08-28 — Drag, lock, top-right default, zh/en

- **status:** accepted
- **context:** Frameless WebView2 `data-tauri-drag-region` did not move the widget; default cell mode hid task titles; owner wants CalendarTask-like glass grid and bilingual chrome.
- **decision:** Drag uses `startDragging()` on unlocked empty areas; lock is `widgetLocked` in settings plus a header toggle. First launch after this change places the widget at the primary monitor top-right (one-time kv `placed_top_right_v1`). Default `showTitlesInCells` is on; cells list up to 4 numbered titles. UI locale `zh` | `en` is global (widget, settings, list, tray).
- **consequence:** Existing installs relocate once to top-right. After the user drags, position is saved again. Locking prevents drag but not resize.

## 2026-08-28 — Editorial glass visual language

- **status:** accepted (spec pending owner file review)
- **context:** V0 chrome looked generic; opacity did not show the desktop; owner wants light/dark of one language, true tinted glass, Win8-style hot tiles, bilingual chrome, and a token contract for later custom themes.
- **decision:** Implement `docs/superpowers/specs/2026-08-28-ui-visual-language-design.md`. CSS tokens + `themeMode` auto/light/dark; editorial light/dark; fill alpha 0.10–0.40 default 0.25; no widget `backdrop-filter`; today/rest/work as opaque tiles; custom pack load from `themes/custom.json` with no customizer UI. Default `showTitlesInCells` off. Locale remains `zh` | `en` for all new strings.
- **consequence:** Widget wallpaper, memorial cards, and customizer UI are follow-ups. Click-to-expand stays with the other session. WorkerW stays out of V0.

## 2026-08-28 — Figma as optional design surface

- **status:** accepted (Widget Light/Dark drawn; quota hit)
- **context:** Owner wants Cursor Figma MCP for UI/UX and had no existing file or Figma experience. MCP authenticated as `kate_2012@outlook.com` on Starter team `kate_2012's team` with a **View** seat.
- **decision:** One design file **DeskCal 桌历** at https://www.figma.com/design/8IVe6sQ0nL4oIxmmx1CIQj (`fileKey` `8IVe6sQ0nL4oIxmmx1CIQj`). Tokens live in local collections `DeskCal / Light` and `DeskCal / Dark` (Starter allows 1 mode per collection). SDS Calendar/Button were not used — they do not match editorial glass. Font is Noto Sans SC (Segoe / YaHei unavailable in Figma). Code SSOT remains CSS tokens + the visual-language spec. No Code Connect.
- **consequence:** Starter MCP quota was exhausted while drawing Widget frames. Hidden Plugin API layers do not appear on instances, so 2px task bars still need a follow-up after quota reset or a Pro Full/Dev seat.

## 2026-08-30 — Rolling week grid (xdiarys-like)

- **status:** accepted (owner visual smoke pending)
- **context:** Owner wanted the widget closer to 日历清单: large right-side 4-week grid, today on row 2, weekend/weekday cell tints, no text outline, settings gear, lunar local + 休/班 fetch, cell popover for tasks. True per-cell Acrylic is not possible in WebView2. Cross-day drag is out.
- **decision:** Rolling 4-week Monday grid (`buildRollingWeekGrid`); default window 860×1184, one-time place via kv `placed_week_grid_v1`. Cell fill alpha 0.40–0.70 (default 0.55), no card slab, no outline, no `backdrop-filter`. Week gutter is ISO week or weeks remaining. Items use SQLite `sort` + `items_uncomplete` + same-day reorder. Click opens `DayPopover`. Statutory holidays fetch NateScarlet/holiday-cn (jsDelivr then GitHub raw), cache in app data, bundled `data/cn-holidays.json` fallback. Lunar stays `lunar-javascript`.
- **consequence:** Old 480×640 placement is replaced once. Opacity slider means cell tint, not a whole-card plate. `DayPanel` removed.

## 2026-08-30 — Adaptive size, month-break grid, dark-only widget

- **status:** accepted (owner visual smoke pending)
- **context:** Owner liked height but wanted wider adaptive default (not hardcoded 860). Month change should start a new grid row with empty padding. Dark widget + white text at ≥70% cell opacity; settings/list stay light forever. Custom holiday source URL in advanced settings.
- **decision:** `compute_adaptive_widget_logical_size` from primary monitor (52% width clamped 800–max, height = logical_h − 32); kv `placed_adaptive_v1`. `buildRollingWeekGrid` uses `(Date|null)[][]` with month-break rows. Widget always dark (`useDeskCalTheme`); settings/list use `useSettingsChromeTheme` (light, fillAlpha 1). Opacity 0.70–1.00 default 0.85. `holidaySourceUrl` in `UiSettings`; https-only with `{year}`; fetch order: custom → jsDelivr default → GitHub raw.
- **consequence:** `placed_week_grid_v1` superseded. Theme mode UI removed from settings (field retained in DB for compat). Grid may show 5 rows when month splits mid-span.

## 2026-08-30 — Default to Windows snap-right third; frame only while moving

- **status:** superseded
- **context:** Owner asked to match Windows Snap Layouts; first implementation used the 2/3+1/3 right zone. Owner then clarified they meant **Win+Right (right half)**, and the 1/3 placement also rendered smaller than 1/3 (Tauri `set_size(PhysicalSize)` vs work-area units).
- **decision:** See **Win+Right half** below. Frame-on-move decision stands.

## 2026-08-30 — Default is Win+Right (right half of work area)

- **status:** accepted
- **context:** Owner wants the widget to fill the same zone as `Win+→`: the right **half** of the primary work area, full height above the taskbar. Fine outer frame while moving is already correct.
- **decision:** Place with `GetMonitorInfoW` `rcWork` + `SetWindowPos` (same coordinate space as Windows snap). Width = right half (`work_width - work_width/2`). One-time kv `placed_win_right_v1`. Frame: `shadow: false`; CSS outline only while moving/resizing.
- **consequence:** Replaces both the 52% adaptive default and the 1/3 snap attempt. Existing installs re-place once. After the user drags, saved `window-widget.json` wins.

## 2026-08-30 — Widget stays on the desktop until the user hides it

- **status:** accepted
- **context:** Clicking empty desktop (or Show Desktop) buried the skip-taskbar widget behind Explorer’s desktop host, so it looked like it quit. Owner wants it stuck to the desktop unless they hide it from the tray/settings.
- **decision:** Do **not** parent into WorkerW. Track an explicit `user_hidden` flag (tray toggle / `app_hide` only). Subclass `WM_WINDOWPOSCHANGING` to block hide and the −32000 Show Desktop move. `SetWinEventHook(EVENT_SYSTEM_FOREGROUND)`: when Progman/WorkerW/DefView/Win11 XAML desktop is foreground, `SW_SHOWNA` + `HWND_TOP` (raise above wallpaper, **not** `HWND_TOPMOST`, so settings/list can appear in front). Opening settings/list calls `unpin()` first.
- **consequence:** Clicking wallpaper keeps the calendar visible. Other windows can still overlap it. Tray left-click and 设置隐藏 still hide it.

## 2026-08-30 — Version SSOT, bump on each commit, show in settings

- **status:** accepted
- **context:** Owner asked to maintain the app version on every commit and show it in settings.
- **decision:** SSOT remains `package.json` `"version"`. Before each git commit, run `npm run version:bump` (patch, or `DESKCAL_VERSION_BUMP=minor|major`). `scripts/sync-version.mjs` copies that version into `tauri.conf.json`, `Cargo.toml`, and the `deskcal` entry in `Cargo.lock`. The settings window shows it via Vite `define` `__APP_VERSION__` (reads `package.json` at build time). Do not hand-edit a second VERSION constant.
- **consequence:** Settings title row shows `版本 x.y.z`. Installer/bundle metadata stays aligned with npm.

## Open (not yet decided)

- Public GitHub remote name and whether the first remote is private.
- Whether V0.5 adds recurrence / `due_at` before BYOK AI.
