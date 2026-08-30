# 桌历 (DeskCal)

Offline-first Windows desktop calendar widget. Click a day to jot tasks, with Chinese lunar dates and mainland holiday 休/班 marks. No account, no telemetry, data stays in `%APPDATA%\dev.deskcal.app\`.

| | |
|---|---|
| **License** | MIT (`LICENSE`) |
| **GitHub** | https://github.com/duruonanni/deskcal |
| **Platform** | Windows 10/11 |
| **Stage** | V0 — local widget + SQLite |
| **Version SSOT** | `package.json` `"version"` (bump on `npm run release` only; settings shows it) |

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

Release installer (Windows NSIS only; does **not** embed WebView2 — Win10/11 already have it). **Patches semver and syncs Tauri/Rust metadata before build:**

```powershell
npm run release
```

Same version republish: `DESKCAL_SKIP_VERSION_BUMP=1 npm run release`. Minor/major: `$env:DESKCAL_VERSION_BUMP="minor"; npm run release`.

Output: `src-tauri/target/release/bundle/nsis/`. Do not use `offlineInstaller` / `fixedVersion` WebView2 modes — those add ~127–180MB.

Dev-only build without bump: `npm run tauri -- build`.

Checks:

```powershell
npm test
npm run build
cd src-tauri; cargo test
```

SQLite path: `%APPDATA%\dev.deskcal.app\app.db` — never put the live DB in OneDrive / iCloud Drive.

- Global hotkey: `Ctrl+Shift+C` captures to today. Tray left-click toggles the widget. Header **锁定/解锁** (or Lock/Unlock) controls dragging; first launch fills the **right half of the primary work area** (`Win+→`). Language is **设置 → 语言**.

## Structure

- `src/` — React UI (widget, settings, list)
- `src-tauri/` — SQLite, IPC commands, Windows tray/hotkey
- `DECISIONS.md` — locked product/tech choices (`Current truth` + decision log)
- `SESSION_HANDOFF.md` — current state for the next session
- `.cursor/rules/deskcal-docs.mdc` — AI doc and release conventions
- Figma (optional, drafts): https://www.figma.com/design/8IVe6sQ0nL4oIxmmx1CIQj

## Docs for AI sessions

1. Read `SESSION_HANDOFF.md` first for current work.
2. Read `DECISIONS.md` § **Current truth** for locked choices.
3. After work: update handoff every session; touch `DECISIONS.md` only for new or superseded decisions.
4. Version bump only via `npm run release`, not ordinary commits.

## License

MIT. See [`LICENSE`](LICENSE).

## Next step

See `SESSION_HANDOFF.md`.
