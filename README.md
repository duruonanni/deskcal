# 桌历 (DeskCal)

Offline-first Windows desktop calendar widget. Click a day to jot tasks, with Chinese lunar dates and mainland holiday 休/班 marks. No account, no telemetry, data stays in `%APPDATA%\dev.deskcal.app\`.

| | |
|---|---|
| **Type** | Personal (open-source intent, MIT) |
| **Platform** | Windows 10/11 |
| **Stage** | V0 — local widget + SQLite |
| **Version SSOT** | `package.json` `"version"` |

Inspired by DesktopCal / CalendarTask, not a clone. Optional AI (BYOK) and Bring-Your-Own-folder sync are **stubs in V0**.

## Goal

A always-visible frameless month calendar on the desktop: capture a task in one Enter, survive a reboot, work with the network unplugged.

## Working commands

```powershell
cd D:\Studio\02_PROJECTS\00_Personal_Projects\DesktopCalendar_Project
npm install
npm run tauri dev
```

If a Cursor terminal was already open **before** Rust was installed, `cargo` will be missing (`program not found`). Either open a **new** terminal, or use `npm run tauri dev` (the script prepends `%USERPROFILE%\.cargo\bin` and MSVC `vcvars64`).

Release installer (Windows NSIS only; does **not** embed WebView2 — Win10/11 already have it):

```powershell
npm run tauri -- build
```

Output: `src-tauri/target/release/bundle/nsis/`. Do not use `offlineInstaller` / `fixedVersion` WebView2 modes — those add ~127–180MB.

Checks:

```powershell
npm test
npm run build
cd src-tauri; cargo test
```

SQLite path: `%APPDATA%\dev.deskcal.app\app.db` — never put the live DB in OneDrive / iCloud Drive.

Global hotkey: `Ctrl+Shift+C` captures to today. Tray left-click toggles the widget.

## Structure

- `src/` — React UI (widget, settings, list)
- `src-tauri/` — SQLite, IPC commands, Windows tray/hotkey
- `DECISIONS.md` — locked product/tech choices
- `SESSION_HANDOFF.md` — current state for the next session

## Next step

See `SESSION_HANDOFF.md`.
