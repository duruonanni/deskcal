# DeskCal UI visual language (editorial glass)

Status: draft pending owner review  
Date: 2026-08-28  
Project: DeskCal (桌历)

## Goal

Replace the generic V0 widget look with one visual language that is glanceable on the Windows desktop, truly see-through, and bilingual (`zh` | `en`). Light and dark are two poles of the same language, not two unrelated skins.

Success looks like:

- Wallpaper (or desktop icons) is visible through the calendar card.
- Today and rest/work days read as solid “hot tiles” at a glance.
- Switching Windows light/dark, or locking Light/Dark in Settings, restyles widget, settings, and incomplete list together.
- No new English-only or Chinese-only chrome. Lunar numerals stay as cultural glyphs in both locales.

## Out of scope (this spec)

- Day-panel expand / click-day interaction (another session).
- WorkerW desktop wallpaper engine (already excluded from V0).
- Widget wallpaper image + wallpaper opacity slider (follow-up; layer reserved below).
- Memorial / anniversary cards (follow-up).
- Customizer UI (color pickers, import/export buttons). This spec only ships a loadable token file.
- Windows Acrylic/Mica desktop blur.
- Click-through on empty pixels to the desktop.

## Architecture

One CSS token sheet. Resolved theme is applied as `html[data-theme="light"|"dark"]`.

Two axes:

| Axis | Values | This ship |
| --- | --- | --- |
| `themeFamily` | `editorial` now; later `paper`, `mica`, `custom` | Always `editorial` unless a valid custom pack loads |
| `themeMode` | `auto` \| `light` \| `dark` | Stored in existing `UiSettings` (`kv`) |

`auto` uses `prefers-color-scheme` and updates live. Manual `light` / `dark` ignore the OS.

Implementation style: one `index.css` with two token blocks (not two full stylesheets, not JS-injected palettes). Replace the hardcoded widget fill `rgba(18, 24, 32, …)` with tokens so the other session’s dark slab does not fight this language.

### Layer stack (bottom → top)

1. Windows desktop  
2. **Reserved:** widget wallpaper image × `wallpaperOpacity` (follow-up; `0` = off = current see-through)  
3. Card tint × `--card-fill-alpha` (this spec)  
4. Content: type, lunar, hot tiles, task bars  

Settings and incomplete windows are **opaque** themed dialogs (layer 3 at alpha 1). They do not show the desktop.

### True transparency

The current opacity slider only changes card fill alpha, then loses the effect because:

- fill is clamped at ≥ 0.35  
- day cells paint their own backgrounds  
- `backdrop-filter` does not blur the desktop in WebView2 and reads as a frosted plate  

This spec:

- Window stays `transparent: true`. `html`, `body`, `#root` stay transparent.
- **No** `backdrop-filter` on the widget card.
- Day cells have **no** extra fill (hot tiles excepted).
- Slider controls **fill alpha** of the card tint only: **0.10–0.40**, default **0.25** (mostly see-through). Higher = more solid tint, more of the desktop hidden.
- Keep the text-outline setting; it matters more when the card is thin.

Helper copy (i18n): lower values show more of the desktop.

## Token contract

Every family, including a future custom pack, must supply the same keys. No UI copy lives in the pack; copy stays in `src/i18n/messages.ts`.

Minimum keys:

- `--card-fill-rgb` + `--card-fill-alpha` (alpha from settings, rgb from theme)
- `--text`, `--text-muted`, `--text-dim`
- `--accent`, `--accent-on-accent` (text on a hot tile)
- `--tile-today-bg`, `--tile-rest-bg`, `--tile-work-bg`
- `--border-soft`, `--shadow` (shadow must stay subtle; a heavy opaque drop shadow kills see-through)
- `--text-outline` (applied when the outline setting is on)

**Light (`editorial`)** — shallow editorial glass: cream tint, terracotta accent, ink today-tile.

**Dark (`editorial`)** — same structure, dark glass tint, dusty rose accent, light type with outline.

Custom pack path (this ship, no settings UI):

`%APPDATA%\dev.deskcal.app\themes\custom.json`

If the file is missing or invalid JSON / missing keys: use `editorial`, do not crash. Settings shows one localized warning until the file is fixed or removed. A valid pack sets `themeFamily=custom` and still respects `themeMode` if the pack includes both `light` and `dark` objects; if it has only one pole, `themeMode` is ignored for colors.

## Widget

Header: localized month title (`monthTitle`), Today, prev/next, lock — existing i18n keys. Restyle chrome (no grey pill buttons). Do not change drag/lock behavior.

Grid:

- Other-month days: faded type, still no cell fill.
- Weekend numbers: muted accent, not a tile.
- Lunar line: smaller, lower contrast. Lunar glyphs stay Chinese-style in both locales (existing `dayCulture` behavior).
- Task indicator (when in-cell titles are off): 2px accent bar under the number, not a 5px dot.
- **Hot tiles** (opaque, Win8 glance, not a Metro start screen):
  - Priority: **today > rest/work > normal**
  - Today on a rest day: today tile, caption uses localized Today plus rest mark (`休` / `Off`)
  - Rest-only: `--tile-rest-bg`, caption `休` / `Off`
  - Work-only: `--tile-work-bg`, caption `班` / `Work`
- In-cell titles: **setting kept**. Default becomes **off** so bars and tiles stay readable (overrides the 2026-08-28 default-on decision for this visual language). Max lines unchanged if the user turns it on.

Day panel: same editorial tokens, transparent-to-card (no second frosted slab). Copy already localized.

## Settings and incomplete list

Opaque `app-shell` using the same `data-theme` tokens (solid `--dialog-bg`, not desktop see-through).

Appearance section adds:

- Theme: Auto / Light / Dark (new i18n keys; selected locale)
- Existing opacity slider, new helper string
- Existing text outline
- Existing lock, language, in-cell titles

No theme-family dropdown this ship. No wallpaper controls this ship.

Settings and incomplete **window titles** must follow locale (today `tauri.conf.json` hardcodes `设置` / `未完成`). Set the title in code when the window is shown, same as tray already does. Tray copy is already bilingual; do not regress it.

## Bilingual rules

Locale remains global `zh` | `en` on `UiSettings` (`document.documentElement.lang` already set).

- Every **new** user-visible string is a `MessageKey` in both `ZH` and `EN`.
- Do not hardcode `浅色` / `Light` / `休` in JSX except through existing helpers (`t()`, `weekdayLabels`, mark labels already branched in `MonthGrid`).
- Aria labels stay localized (`restDay`, `workDay`, `today`, `monthGridAria`).
- Custom JSON must not contain chrome strings.
- Tests that assert chrome copy must cover both locales for new keys.

## Data flow

1. `settings_get` → `themeMode`, `widgetOpacity`, `textOutline`, `locale`, …  
2. Resolve `data-theme`: `themeMode === "auto"` ? OS : locked pole.  
3. Attempt load `themes/custom.json` (Tauri `app_data_dir`); on success overlay token rgb values.  
4. Apply `--card-fill-alpha` from clamped `widgetOpacity`.  
5. `settings-changed` and `prefers-color-scheme` listeners refresh 2–4 without restart.  
6. Locale change already refreshes tray; appearance strings re-render via React `t(locale, …)`.

## Error handling

- Opacity out of range: clamp 0.10–0.40.  
- Unknown `themeMode`: treat as `auto`.  
- Custom pack errors: fallback + one settings line (`customThemeInvalid` zh/en).  
- OS scheme API unavailable: treat as light.  
- Do not block calendar CRUD on theme load failure.

## Testing

- Unit: `themeMode` + `prefers-color-scheme` → `data-theme`; clamp; custom JSON missing / invalid / valid overlay.  
- Unit: new i18n keys exist and differ where expected in `ZH` vs `EN`.  
- Existing `calendarUtils` locale tests stay green.  
- Manual smoke (owner): light wallpaper and dark wallpaper; Auto vs lock; opacity 10% vs 40%; zh/en toggle on widget, settings, list; today-on-rest tile; no CSS blur plate.

## Follow-ups (not this spec)

1. Widget wallpaper image + independent `wallpaperOpacity` on layer 2.  
2. Memorial cards for chosen dates / holidays.  
3. Customizer UI writing `themes/custom.json`.  
4. Additional families (`paper`, `mica`) as extra token files.

## Constraints from other sessions

- Do not redesign click-to-expand.  
- Keep drag, lock, hotkey, tray, SQLite path.  
- Keep `zh`/`en` as the only locales.  
- Default `showTitlesInCells` **off** for this language (see Widget).
