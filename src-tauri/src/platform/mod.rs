#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(not(target_os = "windows"))]
pub fn show_widget(_app: &tauri::AppHandle) -> Result<(), String> {
    Ok(())
}
