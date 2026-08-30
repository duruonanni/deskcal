use tauri::{AppHandle, Emitter, Manager, State};

use crate::holidays::{self, HolidaysError, HolidaysPayload, HolidaysStatus};

fn holidays_err_to_string(err: HolidaysError) -> String {
    err.to_string()
}

fn app_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))
}

#[tauri::command]
pub fn holidays_get(app: AppHandle) -> Result<HolidaysPayload, String> {
    let dir = app_data_dir(&app)?;
    holidays::holidays_get(&dir).map_err(holidays_err_to_string)
}

#[tauri::command]
pub fn holidays_refresh(
    app: AppHandle,
    state: State<'_, crate::AppState>,
) -> Result<HolidaysPayload, String> {
    let dir = app_data_dir(&app)?;
    let holiday_url = {
        let conn = state
            .db
            .lock()
            .map_err(|_| "database lock poisoned".to_string())?;
        crate::db::get_ui_settings(&conn)
            .map_err(|e| e.to_string())?
            .holiday_source_url
    };
    let cache = holidays::holidays_refresh(&dir, &holiday_url).map_err(holidays_err_to_string)?;
    let _ = app.emit("holidays-changed", &cache.days);
    Ok(HolidaysPayload { days: cache.days })
}

#[tauri::command]
pub fn holidays_status(app: AppHandle) -> Result<HolidaysStatus, String> {
    let dir = app_data_dir(&app)?;
    holidays::holidays_status(&dir).map_err(holidays_err_to_string)
}
