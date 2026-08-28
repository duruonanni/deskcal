# Session Handoff — DeskCal

## Current State

- **project:** DeskCal (桌历)
- **status:** V0 implemented locally (not committed, no GitHub remote)
- **current focus:** Editorial glass UI implemented on `feature/editorial-glass-ui`; pending owner visual smoke via `npm run tauri dev`.

## What Changed

- Tauri 2 + React widget: month grid, day panel CRUD, lunar + 休/班, tray, `Ctrl+Shift+C`, single instance, window position memory.
- SQLite at `%APPDATA%\dev.deskcal.app\app.db` (Tauri app_data_dir + `app.db`).
- Settings: opacity, text outline, in-cell titles. AI/sync IPC returns `not_implemented`.
- Tray: 显示日历 / 未完成 / 设置 / 退出.

## What Matters Most Now

- `npm run tauri` goes through `scripts/with-windows-build-env.ps1` so stale Cursor terminals still find cargo + MSVC.
- Release: `npm run tauri -- build` → NSIS only under `src-tauri/target/release/bundle/nsis/`. Do not switch WebView2 to `offlineInstaller` / `fixedVersion`.
- Live DB must stay in app data, never in OneDrive/iCloud.
- Do not implement real LLM HTTP or folder sync until a later milestone.
- Do not git commit unless the owner asks.
- Figma: https://www.figma.com/design/8IVe6sQ0nL4oIxmmx1CIQj (`fileKey` `8IVe6sQ0nL4oIxmmx1CIQj`). Frames: Widget/Light `5:58`, Widget/Dark `5:59`. Starter MCP quota **exhausted** this month after drawing those frames. Hidden `Bar` layers do not clone onto instances — 2px task bars still missing. Do not call Figma MCP until quota resets or the seat is upgraded.

## Open Items

1. **Owner visual smoke** (`npm run tauri dev`):
   - Light and dark Windows wallpaper: desktop shows through the card at 10% and 25%; 40% more solid.
   - Auto follows OS; lock Light/Dark ignores OS.
   - No frosted Mica plate.
   - Today tile; rest-day-that-is-today is today tile with 休/Off.
   - Toggle 中文 / English: header, settings, list window title, tile marks.
   - Drag/lock/hotkey/day panel still work.
- Owner visual review of Figma Widget Light/Dark; remaining Figma polish (2px task bars) blocked on MCP quota.
- Plan: `docs/superpowers/plans/2026-08-28-editorial-glass-ui.md` — implemented by Composer 2.5 (not fast), one task at a time.
- Follow-ups (not that spec): widget wallpaper + wallpaper opacity; memorial cards; customizer UI.
- SmartScreen / code signing for public GitHub releases.
- V0.5: recurrence / due_at; V1: BYOK AI + folder snapshot.

## Recommended Next Step

1. Owner smoke on the widget (`npm run tauri dev`); use the checklist above.
2. Merge `feature/editorial-glass-ui` when happy.
3. When ready to measure installer size: `npm run tauri -- build` and inspect `src-tauri/target/release/bundle/nsis/`.

## Useful References

- `docs/superpowers/specs/2026-08-28-ui-visual-language-design.md`
- Figma: https://www.figma.com/design/8IVe6sQ0nL4oIxmmx1CIQj
- `DECISIONS.md`
- `data/cn-holidays.json` (国务院 2025/2026 放假调休)
- `npm test` / `cd src-tauri; cargo test`
