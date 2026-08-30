# Session Handoff — DeskCal

> **AI:** Update this file at the end of every meaningful session. Replace stale sections; keep `Last Session` to the last 2–3 dates only. Locked choices → `DECISIONS.md` § Current truth.

## Current State

- **project:** DeskCal (桌历)
- **branch / remote:** `main` → https://github.com/duruonanni/deskcal (MIT)
- **version:** `0.1.3` in `package.json` (last release build may differ — bump only via `npm run release`)
- **stage:** V0 — local widget + SQLite
- **focus:** Verify desktop-pin fix (click blank desktop / Show Desktop must not hide widget)

## Last Session

### 2026-08-30 — Docs & release policy

- Owner chose **release-only version bump** (`npm run release` = bump + `tauri build`), not per commit.
- Restructured `DECISIONS.md` (added `Current truth` index) and this handoff template.
- Added `.cursor/rules/deskcal-docs.mdc` to constrain future doc updates.

### 2026-08-30 — Desktop pin hardening

- `desktop_pin`: deferred hwnd setup; block `WM_SHOWWINDOW` hide + `HWND_BOTTOM` bury; restore on widget blur and when settings/list close.
- Icons refreshed; SSOT `src-tauri/icons/app-icon.svg` → `npm run icons:generate`.

## Smoke / Verify

- [ ] Click empty desktop — widget stays visible (not buried / not “quit”)
- [ ] Show Desktop (Win+D) — widget stays visible
- [ ] Open settings/list — widget unpins; closes cleanly; widget still visible on desktop after
- [ ] Tray hide/show still works

## Blockers

- none

## Next Step

1. Owner smoke on desktop-pin scenarios above.
2. When shipping installer: `npm test && npm run build && npm run release` (see README).
3. Product: recurrence / `due_at` still open — see `DECISIONS.md` § Open.

## Do Not Forget

- Live DB: `%APPDATA%\dev.deskcal.app\app.db` — never in OneDrive / iCloud.
- Dev: use Tauri window or tray — not `http://localhost:1420` in a browser alone.
- Item load uses IPC retry; settings/list focus errors are non-fatal on Windows.
- Version bump **only** on `npm run release`, not on ordinary commits.

## References

- https://github.com/duruonanni/deskcal
- `DECISIONS.md` § Current truth
- Figma (optional): https://www.figma.com/design/8IVe6sQ0nL4oIxmmx1CIQj
