pub fn run() -> Result<(), String> {
    Err("not_implemented".to_string())
}

#[tauri::command]
pub fn ai_run() -> Result<(), String> {
    run()
}
