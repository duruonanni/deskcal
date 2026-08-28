use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow, WindowEvent,
};
use tauri::window::{Color, Effect, EffectsBuilder};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::db;
use crate::domain::AppLocale;
use crate::AppState;

pub const WIDGET_LABEL: &str = "widget";
pub const SETTINGS_LABEL: &str = "settings";
pub const LIST_LABEL: &str = "list";
const GEOMETRY_FILE: &str = "window-widget.json";
const SAVE_DEBOUNCE_MS: u64 = 300;
const TOP_RIGHT_MARGIN_LOGICAL: i32 = 16;
const PLACED_TOP_RIGHT_KEY: &str = "placed_top_right_v1";

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

/// Place the widget in the top-right of a monitor, with a margin from the edges.
pub(crate) fn top_right_on_monitor(
    monitor: MonitorRect,
    width: u32,
    height: u32,
    margin: i32,
) -> WidgetGeometry {
    let x = (monitor.x + monitor.width as i32 - width as i32 - margin).max(monitor.x);
    let y = monitor.y + margin;
    WidgetGeometry {
        x,
        y,
        width,
        height,
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
}

impl Default for GeometrySaveState {
    fn default() -> Self {
        Self {
            generation: AtomicU64::new(0),
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

fn apply_top_right_placement(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(WIDGET_LABEL)
        .ok_or_else(|| format!("window '{WIDGET_LABEL}' not found"))?;

    let monitor = window
        .primary_monitor()
        .map_err(|e| format!("failed to read primary monitor: {e}"))?
        .or(window
            .current_monitor()
            .map_err(|e| format!("failed to read current monitor: {e}"))?)
        .ok_or_else(|| "no monitor available".to_string())?;

    let size = window
        .outer_size()
        .map_err(|e| format!("failed to read widget size: {e}"))?;
    let margin = (f64::from(TOP_RIGHT_MARGIN_LOGICAL) * monitor.scale_factor()).round() as i32;
    let rect = MonitorRect {
        x: monitor.position().x,
        y: monitor.position().y,
        width: monitor.size().width,
        height: monitor.size().height,
        primary: true,
    };
    let geometry = top_right_on_monitor(rect, size.width, size.height, margin);
    window
        .set_position(PhysicalPosition::new(geometry.x, geometry.y))
        .map_err(|e| format!("failed to place widget at top-right: {e}"))?;
    Ok(())
}

fn place_or_restore_widget(app: &AppHandle) -> Result<(), String> {
    let should_place_default = {
        let state = app.state::<AppState>();
        let conn = state
            .db
            .lock()
            .map_err(|_| "database lock poisoned".to_string())?;
        match db::get_kv(&conn, PLACED_TOP_RIGHT_KEY).map_err(|e| e.to_string())? {
            Some(_) => false,
            None => {
                db::set_kv(&conn, PLACED_TOP_RIGHT_KEY, "1").map_err(|e| e.to_string())?;
                true
            }
        }
    };

    if should_place_default {
        apply_top_right_placement(app)?;
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
        }
    });

    Ok(())
}

pub fn try_apply_widget_effects(window: &WebviewWindow) {
    let attempts = [
        EffectsBuilder::new().effect(Effect::Mica).build(),
        EffectsBuilder::new()
            .effect(Effect::Acrylic)
            .color(Color(255, 255, 255, 64))
            .build(),
        EffectsBuilder::new().effect(Effect::Acrylic).build(),
    ];

    for effects in attempts {
        if window.set_effects(Some(effects)).is_ok() {
            return;
        }
    }
}

pub fn show_widget(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(WIDGET_LABEL)
        .ok_or_else(|| format!("window '{WIDGET_LABEL}' not found"))?;
    window
        .show()
        .map_err(|e| format!("failed to show widget: {e}"))?;
    window
        .unminimize()
        .map_err(|e| format!("failed to unminimize widget: {e}"))?;
    window
        .set_focus()
        .map_err(|e| format!("failed to focus widget: {e}"))?;
    Ok(())
}

pub fn hide_widget(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(WIDGET_LABEL)
        .ok_or_else(|| format!("window '{WIDGET_LABEL}' not found"))?;
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
    show_labeled_window(app, SETTINGS_LABEL)
}

pub fn open_list(app: &AppHandle) -> Result<(), String> {
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
    window
        .set_focus()
        .map_err(|e| format!("failed to focus {label}: {e}"))?;
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

pub fn setup_tray(app: &App, locale: AppLocale) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();
    let menu = build_tray_menu(handle, locale)?;
    let [_, _, _, _, tip] = tray_copy(locale);

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or("missing default window icon")?;

    TrayIconBuilder::with_id("deskcal-tray")
        .icon(icon)
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
    if let Some(window) = app.get_webview_window(WIDGET_LABEL) {
        try_apply_widget_effects(&window);
    }

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

    if let Err(err) = place_or_restore_widget(app.handle()) {
        eprintln!("widget placement skipped: {err}");
    }

    setup_widget_geometry_persistence(app.handle())?;

    setup_tray(app, locale).map_err(|e| e.to_string())?;
    setup_global_shortcut(app).map_err(|e| e.to_string())?;

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
    fn places_widget_at_top_right_with_margin() {
        let monitor = MonitorRect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            primary: true,
        };
        let geometry = top_right_on_monitor(monitor, 460, 640, 16);
        assert_eq!(geometry.x, 1920 - 460 - 16);
        assert_eq!(geometry.y, 16);
        assert_eq!(geometry.width, 460);
        assert_eq!(geometry.height, 640);
    }
}
