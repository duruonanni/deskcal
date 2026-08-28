pub fn export_snapshot() -> Result<(), String> {
    Err("not_implemented".to_string())
}

pub fn import_snapshot() -> Result<(), String> {
    Err("not_implemented".to_string())
}

#[tauri::command]
pub fn sync_export() -> Result<(), String> {
    export_snapshot()
}

#[tauri::command]
pub fn sync_import() -> Result<(), String> {
    import_snapshot()
}
