# Session Handoff — DeskCal

## Current State

- **project:** DeskCal (桌历)
- **status:** V0 implemented locally (not committed, no GitHub remote)
- **current focus:** Owner smoke test via `npm run tauri dev`; Windows release is NSIS-only (no embedded WebView2)

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

## Open Items

- Owner visual smoke: drag widget, add a task, reboot persistence, tray toggle, hotkey.
- SmartScreen / code signing for public GitHub releases.
- V0.5: recurrence / due_at; V1: BYOK AI + folder snapshot.

## Recommended Next Step

1. Run `npm run tauri dev` and click through the widget.
2. When ready to measure installer size: `npm run tauri -- build` and inspect `src-tauri/target/release/bundle/nsis/`.
3. If happy, ask to `git commit` and optionally create a GitHub repo.

## Useful References

- `DECISIONS.md`
- `data/cn-holidays.json` (国务院 2025/2026 放假调休)
- `npm test` / `cd src-tauri; cargo test`
