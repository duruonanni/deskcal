use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow,
    WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::db;
use crate::domain::AppLocale;
use crate::AppState;

pub const WIDGET_LABEL: &str = "widget";
pub const SETTINGS_LABEL: &str = "settings";
pub const LIST_LABEL: &str = "list";
mod desktop_pin;
const GEOMETRY_FILE: &str = "window-widget.json";
const SAVE_DEBOUNCE_MS: u64 = 300;
const FRAME_IDLE_MS: u64 = 200;
const PLACED_WIN_RIGHT_V1_KEY: &str = "placed_win_right_v1";

/// Win+Right snap: right half of the work area. Odd leftover pixels stay on the right.
pub(crate) fn snap_right_half(work: MonitorRect) -> WidgetGeometry {
    let left_width = work.width / 2;
    let width = (work.width - left_width).max(1);
    let height = work.height.max(1);
    WidgetGeometry {
        x: work.x + left_width as i32,
        y: work.y,
        width,
        height,
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct WidgetGeometry {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Copy)]
pub(crate) struct MonitorRect {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    primary: bool,
}

/// Clamp widget position so at least part of the window remains on a visible monitor.
pub fn clamp_geometry_to_monitors(
    geometry: WidgetGeometry,
    monitors: &[MonitorRect],
) -> WidgetGeometry {
    if monitors.is_empty() {
        return geometry;
    }

    let intersects = |g: &WidgetGeometry| {
        let right = g.x.saturating_add(g.width as i32);
        let bottom = g.y.saturating_add(g.height as i32);
        monitors.iter().any(|monitor| {
            let mon_right = monitor.x.saturating_add(monitor.width as i32);
            let mon_bottom = monitor.y.saturating_add(monitor.height as i32);
            g.x < mon_right && right > monitor.x && g.y < mon_bottom && bottom > monitor.y
        })
    };

    if intersects(&geometry) {
        return geometry;
    }

    let monitor = monitors
        .iter()
        .find(|m| m.primary)
        .or_else(|| monitors.first())
        .expect("monitors is not empty");

    let max_x = monitor
        .x
        .saturating_add(monitor.width as i32)
        .saturating_sub(geometry.width as i32)
        .max(monitor.x);
    let max_y = monitor
        .y
        .saturating_add(monitor.height as i32)
        .saturating_sub(geometry.height as i32)
        .max(monitor.y);

    WidgetGeometry {
        x: geometry.x.clamp(monitor.x, max_x),
        y: geometry.y.clamp(monitor.y, max_y),
        width: geometry.width,
        height: geometry.height,
    }
}

pub fn clamp_geometry(
    geometry: WidgetGeometry,
    monitors: &[tauri::Monitor],
) -> WidgetGeometry {
    let rects: Vec<MonitorRect> = monitors
        .iter()
        .enumerate()
        .map(|(index, monitor)| MonitorRect {
            x: monitor.position().x,
            y: monitor.position().y,
            width: monitor.size().width,
            height: monitor.size().height,
            primary: index == 0,
        })
        .collect();
    clamp_geometry_to_monitors(geometry, &rects)
}

fn apply_win_snap_right_hwnd(hwnd: *mut std::ffi::c_void) -> Result<WidgetGeometry, String> {
    #[repr(C)]
    struct WinRect {
        left: i32,
        top: i32,
        right: i32,
        bottom: i32,
    }
    #[repr(C)]
    struct MonitorInfo {
        cb_size: u32,
        rc_monitor: WinRect,
        rc_work: WinRect,
        dw_flags: u32,
    }

    const MONITOR_DEFAULTTONEAREST: u32 = 2;
    const SWP_NOZORDER: u32 = 0x0004;
    const SWP_NOACTIVATE: u32 = 0x0010;

    #[link(name = "user32")]
    extern "system" {
        fn MonitorFromWindow(hwnd: *mut std::ffi::c_void, flags: u32) -> *mut std::ffi::c_void;
        fn GetMonitorInfoW(hmonitor: *mut std::ffi::c_void, lpmi: *mut MonitorInfo) -> i32;
        fn SetWindowPos(
            hwnd: *mut std::ffi::c_void,
            hwnd_insert_after: *mut std::ffi::c_void,
            x: i32,
            y: i32,
            cx: i32,
            cy: i32,
            flags: u32,
        ) -> i32;
    }

    unsafe {
        let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        if monitor.is_null() {
            return Err("MonitorFromWindow failed".into());
        }
        let mut info = MonitorInfo {
            cb_size: std::mem::size_of::<MonitorInfo>() as u32,
            rc_monitor: WinRect {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
            },
            rc_work: WinRect {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
            },
            dw_flags: 0,
        };
        if GetMonitorInfoW(monitor, &mut info) == 0 {
            return Err("GetMonitorInfoW failed".into());
        }
        let work = info.rc_work;
        let geometry = snap_right_half(MonitorRect {
            x: work.left,
            y: work.top,
            width: work.right.saturating_sub(work.left).max(0) as u32,
            height: work.bottom.saturating_sub(work.top).max(0) as u32,
            primary: true,
        });
        let ok = SetWindowPos(
            hwnd,
            std::ptr::null_mut(),
            geometry.x,
            geometry.y,
            geometry.width as i32,
            geometry.height as i32,
            SWP_NOZORDER | SWP_NOACTIVATE,
        );
        if ok == 0 {
            return Err("SetWindowPos failed".into());
        }
        Ok(geometry)
    }
}

fn geometry_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join(GEOMETRY_FILE))
        .map_err(|e| format!("failed to resolve app data dir: {e}"))
}

fn read_geometry(path: &Path) -> Option<WidgetGeometry> {
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

fn write_geometry(path: &Path, geometry: &WidgetGeometry) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("failed to create app data dir: {e}"))?;
    }
    let json = serde_json::to_string_pretty(geometry)
        .map_err(|e| format!("failed to serialize widget geometry: {e}"))?;
    fs::write(path, json).map_err(|e| format!("failed to write widget geometry: {e}"))
}

fn current_geometry(window: &WebviewWindow) -> Result<WidgetGeometry, String> {
    let pos = window
        .outer_position()
        .map_err(|e| format!("failed to read widget position: {e}"))?;
    let size = window
        .inner_size()
        .map_err(|e| format!("failed to read widget size: {e}"))?;
    Ok(WidgetGeometry {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
    })
}

fn save_widget_geometry_now(app: &AppHandle) {
    let Ok(path) = geometry_file_path(app) else {
        return;
    };
    let Some(window) = app.get_webview_window(WIDGET_LABEL) else {
        return;
    };
    let Ok(geometry) = current_geometry(&window) else {
        return;
    };
    let _ = write_geometry(&path, &geometry);
}

struct GeometrySaveState {
    generation: AtomicU64,
    frame_generation: AtomicU64,
}

impl Default for GeometrySaveState {
    fn default() -> Self {
        Self {
            generation: AtomicU64::new(0),
            frame_generation: AtomicU64::new(0),
        }
    }
}

fn schedule_widget_geometry_save(app: &AppHandle, state: &Arc<Mutex<GeometrySaveState>>) {
    let generation = {
        let guard = state.lock().expect("geometry save state poisoned");
        guard.generation.fetch_add(1, Ordering::SeqCst) + 1
    };

    let app = app.clone();
    let state = Arc::clone(state);
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(SAVE_DEBOUNCE_MS));
        let current = state
            .lock()
            .expect("geometry save state poisoned")
            .generation
            .load(Ordering::SeqCst);
        if current == generation {
            save_widget_geometry_now(&app);
        }
    });
}

fn emit_widget_moving(app: &AppHandle, moving: bool) {
    if let Some(window) = app.get_webview_window(WIDGET_LABEL) {
        let _ = window.emit("widget-moving", moving);
    }
}

fn schedule_widget_frame_idle(app: &AppHandle, state: &Arc<Mutex<GeometrySaveState>>) {
    let generation = {
        let guard = state.lock().expect("geometry save state poisoned");
        guard.frame_generation.fetch_add(1, Ordering::SeqCst) + 1
    };
    emit_widget_moving(app, true);

    let app = app.clone();
    let state = Arc::clone(state);
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(FRAME_IDLE_MS));
        let current = state
            .lock()
            .expect("geometry save state poisoned")
            .frame_generation
            .load(Ordering::SeqCst);
        if current == generation {
            emit_widget_moving(&app, false);
        }
    });
}

pub fn restore_widget_geometry(app: &AppHandle) -> Result<(), String> {
    let path = geometry_file_path(app)?;
    let Some(saved) = read_geometry(&path) else {
        return Ok(());
    };

    let window = app
        .get_webview_window(WIDGET_LABEL)
        .ok_or_else(|| format!("window '{WIDGET_LABEL}' not found"))?;

    let monitors = window
        .available_monitors()
        .map_err(|e| format!("failed to list monitors: {e}"))?;
    let geometry = clamp_geometry(saved, &monitors);

    window
        .set_size(PhysicalSize::new(geometry.width, geometry.height))
        .map_err(|e| format!("failed to restore widget size: {e}"))?;
    window
        .set_position(PhysicalPosition::new(geometry.x, geometry.y))
        .map_err(|e| format!("failed to restore widget position: {e}"))?;

    Ok(())
}

fn apply_snap_right_placement(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(WIDGET_LABEL)
        .ok_or_else(|| format!("window '{WIDGET_LABEL}' not found"))?;
    let hwnd = window
        .hwnd()
        .map_err(|e| format!("failed to get widget hwnd: {e}"))?;
    apply_win_snap_right_hwnd(hwnd.0)?;
    Ok(())
}

fn place_or_restore_widget(app: &AppHandle) -> Result<(), String> {
    let should_place_win_right = {
        let state = app.state::<AppState>();
        let conn = state
            .db
            .lock()
            .map_err(|_| "database lock poisoned".to_string())?;
        match db::get_kv(&conn, PLACED_WIN_RIGHT_V1_KEY).map_err(|e| e.to_string())? {
            Some(_) => false,
            None => {
                db::set_kv(&conn, PLACED_WIN_RIGHT_V1_KEY, "1").map_err(|e| e.to_string())?;
                true
            }
        }
    };

    if should_place_win_right {
        apply_snap_right_placement(app)?;
        save_widget_geometry_now(app);
        return Ok(());
    }

    restore_widget_geometry(app)
}

pub fn setup_widget_geometry_persistence(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(WIDGET_LABEL)
        .ok_or_else(|| format!("window '{WIDGET_LABEL}' not found"))?;

    let save_state = Arc::new(Mutex::new(GeometrySaveState::default()));
    let debounce_state = save_state.clone();
    let app_handle = app.clone();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Moved(_) | WindowEvent::Resized(_)) {
            schedule_widget_geometry_save(&app_handle, &debounce_state);
            schedule_widget_frame_idle(&app_handle, &debounce_state);
        }
    });

    Ok(())
}

pub fn show_widget(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(WIDGET_LABEL)
        .ok_or_else(|| format!("window '{WIDGET_LABEL}' not found"))?;
    desktop_pin::set_user_hidden(false);
    window
        .show()
        .map_err(|e| format!("failed to show widget: {e}"))?;
    window
        .unminimize()
        .map_err(|e| format!("failed to unminimize widget: {e}"))?;
    window
        .set_focus()
        .map_err(|e| format!("failed to focus widget: {e}"))?;
    desktop_pin::restore_over_desktop();
    Ok(())
}

pub fn hide_widget(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(WIDGET_LABEL)
        .ok_or_else(|| format!("window '{WIDGET_LABEL}' not found"))?;
    desktop_pin::set_user_hidden(true);
    window
        .hide()
        .map_err(|e| format!("failed to hide widget: {e}"))?;
    Ok(())
}

pub fn toggle_widget_visibility(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(WIDGET_LABEL)
        .ok_or_else(|| format!("window '{WIDGET_LABEL}' not found"))?;
    if window.is_visible().unwrap_or(false) {
        hide_widget(app)
    } else {
        show_widget(app)
    }
}

pub fn open_settings(app: &AppHandle) -> Result<(), String> {
    desktop_pin::unpin();
    show_labeled_window(app, SETTINGS_LABEL)
}

pub fn open_list(app: &AppHandle) -> Result<(), String> {
    desktop_pin::unpin();
    show_labeled_window(app, LIST_LABEL)
}

fn show_labeled_window(app: &AppHandle, label: &str) -> Result<(), String> {
    let window = app
        .get_webview_window(label)
        .ok_or_else(|| format!("window '{label}' not found"))?;
    window
        .show()
        .map_err(|e| format!("failed to show {label}: {e}"))?;
    window
        .unminimize()
        .map_err(|e| format!("failed to unminimize {label}: {e}"))?;
    if let Err(e) = window.set_focus() {
        eprintln!("deskcal: focus {label} skipped (window is still shown): {e}");
    }
    Ok(())
}

pub fn trigger_quick_capture(app: &AppHandle) -> Result<(), String> {
    show_widget(app)?;
    if let Some(window) = app.get_webview_window(WIDGET_LABEL) {
        window
            .emit("quick-capture", ())
            .map_err(|e| format!("failed to emit quick-capture: {e}"))?;
    }
    Ok(())
}

fn tray_copy(locale: AppLocale) -> [&'static str; 5] {
    match locale {
        AppLocale::Zh => ["显示日历", "未完成", "设置", "退出", "桌历"],
        AppLocale::En => ["Show calendar", "Incomplete", "Settings", "Quit", "DeskCal"],
    }
}

fn build_tray_menu(
    app: &AppHandle,
    locale: AppLocale,
) -> Result<Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    let [show, list, settings, quit, _] = tray_copy(locale);
    let show_item = MenuItem::with_id(app, "show", show, true, None::<&str>)?;
    let list_item = MenuItem::with_id(app, "list", list, true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", settings, true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", quit, true, None::<&str>)?;
    Ok(Menu::with_items(
        app,
        &[&show_item, &list_item, &settings_item, &quit_item],
    )?)
}

pub fn refresh_tray_locale(app: &AppHandle, locale: AppLocale) {
    let Some(tray) = app.tray_by_id("deskcal-tray") else {
        return;
    };
    if let Ok(menu) = build_tray_menu(app, locale) {
        let _ = tray.set_menu(Some(menu));
    }
    let [_, _, _, _, tip] = tray_copy(locale);
    let _ = tray.set_tooltip(Some(tip));
}

fn tray_icon() -> Image<'static> {
    Image::from_bytes(include_bytes!("../../../icons/tray-icon.png"))
        .expect("tray-icon.png missing; run scripts/generate-icons.py")
}

pub fn setup_tray(app: &App, locale: AppLocale) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();
    let menu = build_tray_menu(handle, locale)?;
    let [_, _, _, _, tip] = tray_copy(locale);

    TrayIconBuilder::with_id("deskcal-tray")
        .icon(tray_icon())
        .tooltip(tip)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                let _ = show_widget(app);
            }
            "list" => {
                let _ = open_list(app);
            }
            "settings" => {
                let _ = open_settings(app);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = toggle_widget_visibility(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

pub fn setup_global_shortcut(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyC);
    let handle = app.handle().clone();

    app.handle().plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(move |app, pressed, event| {
                if pressed == &shortcut && event.state == ShortcutState::Pressed {
                    let _ = trigger_quick_capture(app);
                }
            })
            .build(),
    )?;

    handle.global_shortcut().register(shortcut)?;
    Ok(())
}

pub fn setup_windows_shell(app: &App) -> Result<(), String> {
    let locale = {
        let state = app.state::<AppState>();
        state
            .db
            .lock()
            .ok()
            .and_then(|conn| db::get_ui_settings(&conn).ok())
            .map(|settings| settings.locale)
            .unwrap_or_default()
    };

    if let Some(window) = app.get_webview_window(WIDGET_LABEL) {
        let _ = window.set_shadow(false);
        if let Ok(hwnd) = window.hwnd() {
            desktop_pin::setup(hwnd.0);
        }
    }

    if let Err(err) = place_or_restore_widget(app.handle()) {
        eprintln!("widget placement skipped: {err}");
    }

    setup_widget_geometry_persistence(app.handle())?;

    setup_tray(app, locale).map_err(|e| e.to_string())?;
    setup_global_shortcut(app).map_err(|e| e.to_string())?;

    let app_handle = app.handle().clone();
    thread::spawn(move || {
        if let Ok(dir) = app_handle.path().app_data_dir() {
            let holiday_url = app_handle
                .state::<AppState>()
                .db
                .lock()
                .ok()
                .and_then(|conn| db::get_ui_settings(&conn).ok())
                .map(|s| s.holiday_source_url)
                .unwrap_or_default();
            if let Ok(cache) = crate::holidays::holidays_refresh(&dir, &holiday_url) {
                let _ = app_handle.emit("holidays-changed", &cache.days);
            }
        }
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_geometry_when_visible() {
        let monitors = [MonitorRect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            primary: true,
        }];
        let geometry = WidgetGeometry {
            x: 100,
            y: 200,
            width: 380,
            height: 520,
        };
        assert_eq!(
            clamp_geometry_to_monitors(geometry, &monitors),
            geometry
        );
    }

    #[test]
    fn clamps_offscreen_geometry_to_primary_monitor() {
        let monitors = [MonitorRect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            primary: true,
        }];
        let geometry = WidgetGeometry {
            x: 5000,
            y: 5000,
            width: 380,
            height: 520,
        };
        let clamped = clamp_geometry_to_monitors(geometry, &monitors);
        assert!(clamped.x >= 0);
        assert!(clamped.y >= 0);
        assert!(clamped.x + clamped.width as i32 <= 1920);
        assert!(clamped.y + clamped.height as i32 <= 1080);
    }

    #[test]
    fn snap_right_half_matches_win_right() {
        let work = MonitorRect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1040,
            primary: true,
        };
        let geometry = snap_right_half(work);
        assert_eq!(geometry.x, 960);
        assert_eq!(geometry.y, 0);
        assert_eq!(geometry.width, 960);
        assert_eq!(geometry.height, 1040);
    }

    #[test]
    fn snap_right_half_keeps_odd_pixel_on_the_right() {
        let work = MonitorRect {
            x: 1920,
            y: 40,
            width: 1921,
            height: 1000,
            primary: true,
        };
        let geometry = snap_right_half(work);
        assert_eq!(geometry.width, 961);
        assert_eq!(geometry.x, 1920 + 960);
        assert_eq!(geometry.y, 40);
        assert_eq!(geometry.height, 1000);
    }
}
