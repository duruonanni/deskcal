use tauri::{AppHandle, Emitter, Manager, State};

use crate::db::{self, DbError};
use crate::domain::UiSettings;
use crate::AppState;

fn db_err_to_string(err: DbError) -> String {
    err.to_string()
}

#[tauri::command]
pub fn settings_get(state: State<'_, AppState>) -> Result<UiSettings, String> {
    let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
    Ok(db::get_ui_settings(&conn).map_err(db_err_to_string)?.clamped())
}

fn validate_holiday_source_url(url: &str) -> Result<(), String> {
    if url.is_empty() {
        return Ok(());
    }
    if !url.starts_with("https://") {
        return Err("holiday source URL must use https".to_string());
    }
    if !url.contains("{year}") {
        return Err("holiday source URL must contain {year}".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn settings_set(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: UiSettings,
) -> Result<UiSettings, String> {
    validate_holiday_source_url(&settings.holiday_source_url)?;
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

#[tauri::command]
pub fn theme_custom_read(app: AppHandle) -> Result<Option<String>, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))?;
    let path = dir.join("themes").join("custom.json");
    match std::fs::read_to_string(&path) {
        Ok(raw) => Ok(Some(raw)),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(err.to_string()),
    }
}
