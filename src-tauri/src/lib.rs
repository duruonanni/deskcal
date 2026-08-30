mod ai;
mod commands;
mod db;
mod domain;
mod holidays;
mod platform;
mod sync;

use std::sync::Mutex;

use rusqlite::Connection;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = crate::platform::show_widget(app);
        }));
    }

    builder
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
            std::fs::create_dir_all(&app_data_dir)
                .map_err(|e| format!("failed to create app data dir: {e}"))?;

            let db_path = app_data_dir.join("app.db");
            let conn = db::open(&db_path).map_err(|e| e.to_string())?;

            app.manage(AppState {
                db: Mutex::new(conn),
            });

            #[cfg(target_os = "windows")]
            crate::platform::setup_windows_shell(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::items::items_list_range,
            commands::items::items_create,
            commands::items::items_update,
            commands::items::items_complete,
            commands::items::items_delete,
            commands::app::app_show_widget,
            commands::app::app_hide,
            commands::app::app_quit,
            commands::app::app_open_settings,
            commands::app::app_open_list,
            commands::settings::settings_get,
            commands::settings::settings_set,
            commands::settings::theme_custom_read,
            commands::items::items_list_incomplete,
            commands::items::items_uncomplete,
            commands::items::items_reorder,
            commands::holidays::holidays_get,
            commands::holidays::holidays_refresh,
            commands::holidays::holidays_status,
            ai::ai_run,
            sync::sync_export,
            sync::sync_import,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
