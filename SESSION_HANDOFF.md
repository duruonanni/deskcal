# Session Handoff — DeskCal

## Current State

- **project:** DeskCal (桌历)
- **status:** Week-grid / desktop-widget round ready to commit on `feature/editorial-glass-ui`.
- **current focus:** After commit, owner can merge when happy.

## What Changed

- Rolling week grid, cell popover, holiday fetch, Win+Right default size, stay-on-desktop, move-only frame.
- Version SSOT `package.json`; `npm run version:bump` before each commit; settings shows `版本 x.y.z`.

## What Matters Most Now

- `npm run tauri` goes through `scripts/with-windows-build-env.ps1`.
- Live DB stays in `%APPDATA%\dev.deskcal.app\app.db`.
- Before future commits: `npm run version:bump` (patch default).

## Recommended Next Step

1. Merge `feature/editorial-glass-ui` when happy.
2. Next commit: bump version first.

## Useful References

- `docs/superpowers/plans/2026-08-30-xdiarys-week-grid.md`
- `DECISIONS.md`
- `npm test` / `npm run build` / `cd src-tauri; cargo test`
