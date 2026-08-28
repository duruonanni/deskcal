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

## Open (not yet decided)

- Public GitHub remote name and whether the first remote is private.
- Whether V0.5 adds recurrence / `due_at` before BYOK AI.
