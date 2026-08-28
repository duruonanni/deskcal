use tauri::AppHandle;

#[tauri::command]
pub fn app_show_widget(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return crate::platform::show_widget(&app);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Err("app_show_widget is only supported on Windows".into())
    }
}

#[tauri::command]
pub fn app_hide(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return crate::platform::hide_widget(&app);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Err("app_hide is only supported on Windows".into())
    }
}

#[tauri::command]
pub fn app_quit(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn app_open_settings(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return crate::platform::open_settings(&app);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Err("app_open_settings is only supported on Windows".into())
    }
}

#[tauri::command]
pub fn app_open_list(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return crate::platform::open_list(&app);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Err("app_open_list is only supported on Windows".into())
    }
}
