import { isTauri } from "@tauri-apps/api/core";

/** True when the UI is hosted inside the Tauri desktop shell (not a plain browser tab). */
export function isTauriRuntime(): boolean {
  return isTauri();
}