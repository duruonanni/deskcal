/**
 * Typed IPC wrappers for DeskCal.
 * Only this module may import @tauri-apps/api — UI components must call these functions.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type ItemKind = "task" | "note" | "event";

/** Calendar item — mirrors Rust `domain::Item` (camelCase JSON). */
export interface CalendarItem {
  id: string;
  kind: ItemKind;
  title: string;
  notes: string;
  day: string;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface CreateItemInput {
  title: string;
  day: string;
  kind?: ItemKind;
  notes?: string;
}

export interface UpdateItemInput {
  id: string;
  title?: string;
  notes?: string;
  day?: string;
  kind?: ItemKind;
}

/** items_list_range — list calendar items within an inclusive date range. */
export async function itemsListRange(
  start: string,
  end: string,
): Promise<CalendarItem[]> {
  return invoke<CalendarItem[]>("items_list_range", { start, end });
}

/** items_create — create a new calendar item. */
export async function itemsCreate(input: CreateItemInput): Promise<CalendarItem> {
  return invoke<CalendarItem>("items_create", { ...input });
}

/** items_update — update an existing calendar item. */
export async function itemsUpdate(input: UpdateItemInput): Promise<CalendarItem> {
  return invoke<CalendarItem>("items_update", { ...input });
}

/** items_complete — mark an item as completed. */
export async function itemsComplete(id: string): Promise<CalendarItem> {
  return invoke<CalendarItem>("items_complete", { id });
}

/** items_delete — soft-delete a calendar item. */
export async function itemsDelete(id: string): Promise<void> {
  return invoke<void>("items_delete", { id });
}

export async function itemsListIncomplete(): Promise<CalendarItem[]> {
  return invoke<CalendarItem[]>("items_list_incomplete");
}

export interface UiSettings {
  widgetOpacity: number;
  showTitlesInCells: boolean;
  textOutline: boolean;
}

export const DEFAULT_UI_SETTINGS: UiSettings = {
  widgetOpacity: 0.78,
  showTitlesInCells: false,
  textOutline: true,
};

export async function settingsGet(): Promise<UiSettings> {
  return invoke<UiSettings>("settings_get");
}

export async function settingsSet(settings: UiSettings): Promise<UiSettings> {
  return invoke<UiSettings>("settings_set", { settings });
}

export function onSettingsChanged(
  handler: (settings: UiSettings) => void,
): Promise<UnlistenFn> {
  return listen<UiSettings>("settings-changed", (event) => handler(event.payload));
}

// --- app.* (future) ---

/** app.show_widget — show the desktop widget window */
export async function appShowWidget(): Promise<void> {
  return invoke<void>("app_show_widget");
}

/** app.hide — hide the desktop widget window */
export async function appHide(): Promise<void> {
  return invoke<void>("app_hide");
}

/** app.quit — quit the application */
export async function appQuit(): Promise<void> {
  return invoke<void>("app_quit");
}

/** app.open_settings — show the settings window */
export async function appOpenSettings(): Promise<void> {
  return invoke<void>("app_open_settings");
}

export async function appOpenList(): Promise<void> {
  return invoke<void>("app_open_list");
}

/** Listen for the global quick-capture hotkey event from the backend. */
export function onQuickCapture(handler: () => void): Promise<UnlistenFn> {
  return listen("quick-capture", () => handler());
}

// --- ai.* (stubs — not implemented in V0) ---

/** ai_run — future BYOK AI entry point (not implemented). */
export async function aiRun(): Promise<void> {
  return invoke<void>("ai_run");
}

// --- sync.* (stubs — not implemented in V0) ---

/** sync_export — future folder snapshot export (not implemented). */
export async function syncExport(): Promise<void> {
  return invoke<void>("sync_export");
}

/** sync_import — future folder snapshot import (not implemented). */
export async function syncImport(): Promise<void> {
  return invoke<void>("sync_import");
}
