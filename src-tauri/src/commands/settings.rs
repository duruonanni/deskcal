use tauri::{AppHandle, Emitter, State};

use crate::db::{self, DbError};
use crate::domain::UiSettings;
use crate::AppState;

fn db_err_to_string(err: DbError) -> String {
    err.to_string()
}

#[tauri::command]
pub fn settings_get(state: State<'_, AppState>) -> Result<UiSettings, String> {
    let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
    db::get_ui_settings(&conn).map_err(db_err_to_string)
}

#[tauri::command]
pub fn settings_set(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: UiSettings,
) -> Result<UiSettings, String> {
    let settings = settings.clamped();
    {
        let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
        db::set_ui_settings(&conn, &settings).map_err(db_err_to_string)?;
    }
    let _ = app.emit("settings-changed", &settings);
    #[cfg(target_os = "windows")]
    crate::platform::refresh_tray_locale(&app, settings.locale);
    Ok(settings)
}
