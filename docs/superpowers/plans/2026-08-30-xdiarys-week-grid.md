# xdiarys-like week grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make DeskCal’s widget a rolling 4-week desktop calendar (today always on row 2) with xdiarys-like size, per-cell tint, week numbers, in-cell numbered tasks, a cell popover for edit/uncomplete/reorder, and holiday fetch with offline fallback.

**Architecture:** Keep Tauri 2 + React. Grid math and lunar stay in the frontend. SQLite gains real `sort` + uncomplete. Holiday JSON is fetched in Rust, cached under app_data, and served over IPC. No CSS `backdrop-filter` (cannot blur the desktop). No cross-day drag. Do not git commit unless the owner asks.

**Tech Stack:** Tauri 2, React 19, TypeScript, rusqlite, reqwest, lunar-javascript, vitest, cargo test.

---

## Locked product decisions

- Rolling **4 weeks**, ISO Monday-start. **Today’s week is always row 2.**
- Default window on this machine (xdiarys was not running to measure): primary work area `2048×1232`. Widget **860×1184**, top-right, 16px margin. New kv `placed_week_grid_v1` so existing `window-widget.json` does not keep the old 480×640.
- Empty 5th/6th month-grid slots do not exist. All 28 cells are real dates and get cell tint, including next-month dates.
- Weekend cells: warm brown/orange tint. Weekday cells: cool blue/grey tint. Today: gold/yellow 2px border, **not** an opaque dark tile. 休/班 and festival/jieqi are **corner badges**, not hot-tile fills.
- No widget card slab. No text outline (default off, remove the settings checkbox). Cell fill alpha from the existing opacity slider, clamp **0.40–0.70**, default **0.55**.
- Remove mouse-wheel month paging. Header right: settings gear → existing `app_open_settings`.
- Week-number column: default ISO week-of-year; setting can switch to weeks remaining until year-end (`isoWeeksInYear - currentIsoWeek`, excluding current week).
- Click a day: **popover over that cell** (not the below-grid DayPanel). In-cell list always shows numbered titles. Overlay: create, edit title, toggle complete/uncomplete, delete, drag reorder **within the same day only**.
- Lunar/jieqi/festivals: keep `lunar-javascript` offline. Statutory 休/班: fetch public JSON on launch + manual refresh; on failure toast and use last cache then bundled `data/cn-holidays.json`.
- Do **not** implement: Windows Acrylic, WorkerW, cross-day drag, LLM, folder sync, git commit.

## File map

- `src/widgets/calendarUtils.ts` — `buildRollingWeekGrid`, ISO week helpers, header date helpers
- `src/widgets/calendarUtils.test.ts` — grid/week tests
- `src/widgets/dayCulture.ts` — badges (jieqi/festival vs 休/班); holiday map becomes injectable
- `src/widgets/MonthGrid.tsx` — 4-week grid + week-number column + in-cell numbered tasks
- `src/widgets/DayPopover.tsx` — replace DayPanel usage (DayPanel can remain unused or be deleted if unused)
- `src/widgets/WidgetApp.tsx` — new chrome, no wheel, gear, popover, holidays load
- `src/index.css` — per-cell tints, transparent shell, larger cells
- `src/settings/SettingsApp.tsx` + `src/i18n/messages.ts`
- `src/services/tauriCommands.ts`
- `src-tauri/src/domain/mod.rs` — `sort`, `week_number_mode`, opacity clamp, `text_outline` default false
- `src-tauri/src/db/mod.rs` — uncomplete, sort backfill, reorder, list by sort
- `src-tauri/src/commands/items.rs` — `items_uncomplete`, `items_reorder`
- `src-tauri/src/holidays/mod.rs` (new) + `src-tauri/src/commands/holidays.rs` (new)
- `src-tauri/src/lib.rs`, `Cargo.toml` (`reqwest`)
- `src-tauri/tauri.conf.json` — default 860×1184
- `src-tauri/src/platform/windows/mod.rs` — place with new size + `placed_week_grid_v1`
- `DECISIONS.md`, `SESSION_HANDOFF.md`

---

### Task 1: Data layer — sort, uncomplete, holiday fetch, week-grid math

**Files:**
- Modify: `src/widgets/calendarUtils.ts`, `src/widgets/calendarUtils.test.ts`
- Modify: `src-tauri/src/domain/mod.rs`, `src-tauri/src/db/mod.rs`, `src-tauri/src/commands/items.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`
- Create: `src-tauri/src/holidays/mod.rs`, `src-tauri/src/commands/holidays.rs`
- Modify: `src/services/tauriCommands.ts`
- Test: `src-tauri/src/db/mod.rs` tests, `src-tauri/src/holidays/mod.rs` tests, `src/widgets/calendarUtils.test.ts`

#### Week grid (TypeScript)

ISO week: week containing Thursday; weeks start Monday.

Anchor: `buildRollingWeekGrid(today: Date)` returns `{ start, end, weeks: Date[][] }` with **exactly 4 weeks**. Week 0 starts Monday of (ISO week of today − 1). Today’s date must appear in `weeks[1]`.

Helpers:

- `isoWeek(date: Date): number`
- `isoWeeksInYear(year: number): 52 | 53`
- `weeksRemainingInYear(date: Date): number` = `isoWeeksInYear(y) - isoWeek(date)` (not including current week; 0 in the last ISO week)
- `headerDateLabel(date: Date, locale): string` — zh: `2026年8月30日 星期日` (lunar appended by caller)

**Tests (must exist and pass):**

- `2026-08-30` (Sunday) is ISO week **35**. Grid row 1 is `2026-08-17`..`2026-08-23`, row 2 is `2026-08-24`..`2026-08-30`, row 3 starts `2026-08-31`.
- `weeksRemainingInYear` for `2026-08-30`: 2026 has 53 ISO weeks → **18**.
- Year-end: last ISO week remaining is 0.

Keep `buildMonthGrid` if still used by tests; widget will switch to rolling grid in Task 2.

#### Items: sort + uncomplete (Rust)

`Item` JSON camelCase adds `sort: i64`.

- `CREATE TABLE` already has `sort INTEGER`. On migrate, `UPDATE items SET sort = created_at WHERE sort IS NULL`.
- `create_item`: `sort = 1 + COALESCE(MAX(sort),0)` for that `day` among non-deleted rows.
- `list_range` / `list_incomplete`: `ORDER BY day ASC, sort ASC, created_at ASC`.
- `complete_item` stays. Add `uncomplete_item`: `SET completed_at = NULL`.
- `reorder_items(day, ids: Vec<String>)`: only ids that belong to that day and are not deleted; assign `sort = 0..n` in given order. Reject if an id is missing/wrong day.

IPC:

- `items_uncomplete(id)`
- `items_reorder(day, ids)`

Frontend wrappers + `CalendarItem.sort`.

**Tests:** create two items same day → sorts 1 then 2; complete then uncomplete clears `completed_at`; reorder swaps; completed items **keep their sort** (do not move to bottom).

#### Holidays fetch (Rust)

Parser for NateScarlet/holiday-cn year JSON:

```json
{ "year": 2026, "days": [
  { "name": "元旦", "date": "2026-01-01", "isOffDay": true },
  { "name": "元旦", "date": "2026-01-04", "isOffDay": false }
]}
```

Map: `isOffDay true` → `{ kind: "rest", name }`; `false` → `{ kind: "work", name: name + "调班" if name does not already contain 调 }`. Output shape matches `data/cn-holidays.json` `days` map.

Constants (show in settings later):

- Primary: `https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/{year}.json`
- Fallback: `https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{year}.json`

Fetch **current year and next year**. Timeout 8s. Cache file: `{app_data}/holidays-cache.json` with `{ "sourceUrl", "fetchedAt", "days": { ... } }`.

Merge order for `holidays_get`: cache if present and has days, else parse bundled include of `data/cn-holidays.json` (embed via `include_str!` from `../../data/cn-holidays.json`).

`holidays_refresh(app)` tries network; on success overwrite cache and emit `holidays-changed`; on failure return `Err` with a short message, **do not** wipe cache.

`holidays_status()` → `{ sourceUrl, fetchedAt: Option<String>, usingCache: bool, usingBundle: bool }`.

Add `reqwest` in Cargo.toml: `reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls", "blocking"] }`. Use blocking in the command (existing commands are sync) or async — match existing sync style.

**Parser tests with fixtures only** (no live HTTP in unit tests).

On Windows setup, spawn a thread to call refresh once; ignore error (offline-first).

Do not change UI in this task except `tauriCommands.ts` types/wrappers.

- [ ] Write failing TS tests for rolling grid + ISO week
- [ ] Implement grid helpers until tests pass
- [ ] Write failing Rust tests for uncomplete/sort/reorder + holiday parser
- [ ] Implement until `cd src-tauri; cargo test` and `npm test` pass
- [ ] Do **not** commit

---

### Task 2: Widget chrome, size, cell visuals, settings

**Depends on Task 1.**

**Files:** WidgetApp, MonthGrid, index.css, SettingsApp, messages.ts, messages.test.ts, applyTheme/useDeskCalTheme, domain UiSettings, windows/mod.rs, tauri.conf.json, dayCulture.ts (badges)

#### Window

- `tauri.conf.json` widget `width: 860`, `height: 1184`.
- `PLACED_WEEK_GRID_KEY = "placed_week_grid_v1"`. If kv missing: set size 860×1184 (logical × scale_factor for physical), `apply_top_right_placement`, save geometry. If present: restore as today.
- Opacity clamp 0.40–0.70 default 0.55. `text_outline` default false. Add `week_number_mode: "iso" | "remaining"` (serde lowercase, default iso).
- Update domain unit tests for new clamp/defaults. Existing settings JSON without new fields must still load (`#[serde(default)]`).

#### Widget layout

- Transparent `html/body/#root/.widget-shell`. **No** `.widget-card` fill, radius, or shadow on the whole calendar.
- Slim header: left = `headerDateLabel(today)` + lunar `月+日` (e.g. `农历七月十八`). Right = lock, today, prev/next **week** (shift grid by ±7 days; keep `viewAnchor` date, default today), **settings gear** calling `appOpenSettings()`.
- No `onWheel` paging. Remove `handleWheel`.
- Weekday row starts with an empty/week-label gutter then 一…日.
- Each week row: left gutter shows either ISO week or remaining weeks (same number for the row, computed from that week’s Thursday).
- Cells: `1fr` rows filling leftover height. `min-height` at least 120px.
- Weekday cell background `rgba` cool; weekend warm; alpha = `--card-fill-alpha`. Other-month still tinted (valid rolling dates).
- Today: `outline: 2px solid #e4c15a` (or token), transparent fill besides the weekday/weekend tint.
- Remove `.day-cell--tile-today/rest/work` opaque fills.
- No `text-shadow` / outline on widget text.
- In-cell: always show numbered lines (`1. title`) for **all** non-deleted items in sort order; completed get strikethrough. Overflow hidden.
- Badges top-right: 休/班 from holiday map; if jieqi or traditional festival (lunar-javascript) and not already the 休 name, show a second small badge (festival). Keep lunar day next to the Gregorian number (`30 十八`).

`dayCulture.ts`: export `cellBadges(day, date)` and keep `holidayMark`. Holiday map: if `holidays_get` provided a map, use it; else bundled JSON. WidgetApp loads `holidaysGet()` on mount and on `holidays-changed`.

#### Settings

- Remove text-outline checkbox.
- Opacity label: 格子不透明度 / Cell opacity; help: 只影响有日期的格子，空位仍全透明。
- Add week-number mode: 今年第几周 / 距年底剩余周数.
- New section **班休数据**: show `sourceUrl`, `fetchedAt` or “尚未成功获取”, button 立即更新, on error set visible `获取失败，已使用离线数据`. Call `holidaysRefresh`.

i18n: every new string zh + en. Update `messages.test.ts` for new keys you add if there is an existing pattern; at least keep bilingual.

- [ ] Settings + domain tests
- [ ] Window placement + default size
- [ ] Grid UI + CSS
- [ ] `npm test` and `cd src-tauri; cargo test`
- [ ] Do **not** commit

---

### Task 3: Cell popover — edit, uncomplete, line numbers, same-day reorder

**Depends on Task 2.**

Replace below-grid `DayPanel` with `DayPopover` anchored to the clicked cell (`position: absolute` inside the widget, near the cell; clamp so it stays on-screen). Click outside or Escape closes. `Ctrl+Shift+C` still selects today and opens the popover with capture focus.

Popover contents:

- Heading: existing day title + culture line
- Input to create (Enter)
- List in `sort` order with visible `1.` `2.` … (display index, not a stored field)
- Click title → inline edit → `itemsUpdate({ id, title })` on blur/Enter
- Checkbox toggles complete **and** uncomplete
- Delete button
- Drag handle: HTML5 DnD **within this list only**. On drop, `itemsReorder(day, ids)`. Do not change `day`. Ignore drops on other dates.

Widget drag (`widgetStartDragging`) must not start from popover or item handles (`data-no-drag` / `isDragExcludedTarget`).

If `DayPanel.tsx` is unused, delete it and its CSS that is only for the below-grid panel, or keep file but unused is worse — delete and move needed CSS to `.day-popover`.

- [ ] Tests if you extract sort/display helpers; otherwise widget is visual — keep item IPC covered by Rust tests
- [ ] `npm test` / `cargo test` / `npm run build` (tsc)
- [ ] Do **not** commit

---

## Verify (controller after all tasks)

```
npm test
npm run build
cd src-tauri; cargo test
```

Then restart `npm run tauri dev` for owner visual smoke.

## Docs (last task or controller)

Update `DECISIONS.md` and `SESSION_HANDOFF.md` with: rolling 4-week grid, cell tint not Acrylic, holiday fetch URLs, no cross-day drag, popover editor, sort column now used.
