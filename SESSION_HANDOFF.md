# Session Handoff — DeskCal

## Current State

- **project:** DeskCal (桌历)
- **status:** V0 implemented locally (not committed, no GitHub remote)
- **current focus:** Owner reviewing visual-language spec; do not implement until that review passes, then writing-plans

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

- Owner review: `docs/superpowers/specs/2026-08-28-ui-visual-language-design.md` (editorial glass, true transparency, zh/en). After approval, writing-plans then implement. Do not start UI code in this brainstorm session.
- Follow-ups (not that spec): widget wallpaper + wallpaper opacity; memorial cards; customizer UI.
- Owner visual smoke: drag widget, add a task, reboot persistence, tray toggle, hotkey.
- SmartScreen / code signing for public GitHub releases.
- V0.5: recurrence / due_at; V1: BYOK AI + folder snapshot.

## Recommended Next Step

1. Review the visual-language spec; request edits or approve for an implementation plan.
2. Run `npm run tauri dev` for current V0 smoke if needed.
3. When ready to measure installer size: `npm run tauri -- build` and inspect `src-tauri/target/release/bundle/nsis/`.

## Useful References

- `docs/superpowers/specs/2026-08-28-ui-visual-language-design.md`
- `DECISIONS.md`
- `data/cn-holidays.json` (国务院 2025/2026 放假调休)
- `npm test` / `cd src-tauri; cargo test`
