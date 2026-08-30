# Session Handoff — DeskCal

## Current State

- **project:** DeskCal (桌历)
- **status:** Public GitHub repo `duruonanni/deskcal` (MIT). `main` at v0.1.3 with desktop reliability fixes and refreshed icons.
- **current focus:** Optional merge cleanup / next feature.

## What Changed

- Public remote: https://github.com/duruonanni/deskcal
- License: MIT (existing `LICENSE`).
- Icons: SSOT `src-tauri/icons/app-icon.svg`; run `npm run icons:generate` (ImageMagick + `tauri icon`) for desktop/Android/iOS + `tray-icon.png`.
- Desktop dev: use the Tauri window or tray — not `http://localhost:1420` in a browser. Item load uses IPC retry; settings/list focus is non-fatal on Windows.

## What Matters Most Now

- Before future commits: `npm run version:bump`.
- Live DB stays in `%APPDATA%\dev.deskcal.app\app.db`.

## Recommended Next Step

1. Use GitHub for issues/releases when ready.
2. Next product work: recurrence / `due_at` still open.

## Useful References

- https://github.com/duruonanni/deskcal
- `DECISIONS.md`
