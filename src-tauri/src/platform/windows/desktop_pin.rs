//! Keep the widget above the desktop wallpaper unless the user hid it.
//!
//! Clicking empty desktop / Show Desktop (Win+D) raises Explorer's desktop
//! host and can bury or off-screen a skip-taskbar window. We do not parent
//! into WorkerW; we restack when the desktop becomes foreground, and we
//! refuse hide/off-screen moves unless `set_user_hidden(true)`.

use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};

static USER_HIDDEN: AtomicBool = AtomicBool::new(false);
static WIDGET_HWND: AtomicIsize = AtomicIsize::new(0);
static ORIG_WNDPROC: AtomicIsize = AtomicIsize::new(0);
static HOOK: AtomicIsize = AtomicIsize::new(0);
static PIN_READY: AtomicBool = AtomicBool::new(false);

const EVENT_SYSTEM_FOREGROUND: u32 = 0x0003;
const WINEVENT_OUTOFCONTEXT: u32 = 0;
const GWLP_WNDPROC: i32 = -4;
const WM_WINDOWPOSCHANGING: u32 = 0x0046;
const WM_SHOWWINDOW: u32 = 0x0018;
const WM_SYSCOMMAND: u32 = 0x0112;
const SC_MINIMIZE: usize = 0xF020;
const SWP_NOMOVE: u32 = 0x0002;
const SWP_NOSIZE: u32 = 0x0001;
const SWP_NOACTIVATE: u32 = 0x0010;
const SWP_HIDEWINDOW: u32 = 0x0080;
const HWND_TOP: isize = 0;
const HWND_BOTTOM: isize = 1;
const HWND_NOTOPMOST: isize = -2;
const SW_SHOWNA: i32 = 8;
const SHOW_DESKTOP_SENTINEL: i32 = -16000;

#[repr(C)]
struct WindowPos {
    hwnd: *mut std::ffi::c_void,
    hwnd_insert_after: *mut std::ffi::c_void,
    x: i32,
    y: i32,
    cx: i32,
    cy: i32,
    flags: u32,
}

#[link(name = "user32")]
extern "system" {
    fn SetWinEventHook(
        event_min: u32,
        event_max: u32,
        hmod_win_event_proc: *mut std::ffi::c_void,
        pfn_win_event_proc: WinEventProc,
        id_process: u32,
        id_thread: u32,
        flags: u32,
    ) -> *mut std::ffi::c_void;
    fn GetClassNameW(hwnd: *mut std::ffi::c_void, lp_class_name: *mut u16, n_max_count: i32) -> i32;
    fn GetParent(hwnd: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
    fn SetWindowPos(
        hwnd: *mut std::ffi::c_void,
        hwnd_insert_after: *mut std::ffi::c_void,
        x: i32,
        y: i32,
        cx: i32,
        cy: i32,
        flags: u32,
    ) -> i32;
    fn ShowWindow(hwnd: *mut std::ffi::c_void, n_cmd_show: i32) -> i32;
    fn SetWindowLongPtrW(hwnd: *mut std::ffi::c_void, index: i32, new_long: isize) -> isize;
    fn CallWindowProcW(
        prev: isize,
        hwnd: *mut std::ffi::c_void,
        msg: u32,
        wparam: usize,
        lparam: isize,
    ) -> isize;
    fn DefWindowProcW(
        hwnd: *mut std::ffi::c_void,
        msg: u32,
        wparam: usize,
        lparam: isize,
    ) -> isize;
}

type WinEventProc = unsafe extern "system" fn(
    hook: *mut std::ffi::c_void,
    event: u32,
    hwnd: *mut std::ffi::c_void,
    id_object: i32,
    id_child: i32,
    id_event_thread: u32,
    dwms_event_time: u32,
);

pub fn set_user_hidden(hidden: bool) {
    USER_HIDDEN.store(hidden, Ordering::SeqCst);
}

pub fn user_hidden() -> bool {
    USER_HIDDEN.load(Ordering::SeqCst)
}

pub fn setup(hwnd: *mut std::ffi::c_void) {
    if hwnd.is_null() {
        return;
    }
    let hwnd_id = hwnd as isize;
    if WIDGET_HWND.load(Ordering::SeqCst) == hwnd_id && PIN_READY.load(Ordering::SeqCst) {
        return;
    }
    WIDGET_HWND.store(hwnd_id, Ordering::SeqCst);

    unsafe {
        let prev = SetWindowLongPtrW(hwnd, GWLP_WNDPROC, widget_wnd_proc as *const () as isize);
        if prev != 0 {
            ORIG_WNDPROC.store(prev, Ordering::SeqCst);
            PIN_READY.store(true, Ordering::SeqCst);
        } else {
            eprintln!("deskcal: desktop pin wndproc subclass failed");
            PIN_READY.store(false, Ordering::SeqCst);
        }
        if HOOK.load(Ordering::SeqCst) == 0 {
            let hook = SetWinEventHook(
                EVENT_SYSTEM_FOREGROUND,
                EVENT_SYSTEM_FOREGROUND,
                std::ptr::null_mut(),
                on_foreground,
                0,
                0,
                WINEVENT_OUTOFCONTEXT,
            );
            if hook.is_null() {
                eprintln!("deskcal: desktop pin foreground hook failed");
            } else {
                HOOK.store(hook as isize, Ordering::SeqCst);
            }
        }
    }
}

pub fn restore_over_desktop() {
    raise_above_desktop();
}

/// Drop always-on-top so settings/list can appear in front of the widget.
pub fn unpin() {
    set_widget_zorder(HWND_NOTOPMOST, false);
}

fn raise_above_desktop() {
    set_widget_zorder(HWND_TOP, true);
}

fn set_widget_zorder(insert_after: isize, show: bool) {
    if user_hidden() {
        return;
    }
    let hwnd = WIDGET_HWND.load(Ordering::SeqCst) as *mut std::ffi::c_void;
    if hwnd.is_null() {
        return;
    }
    unsafe {
        if show {
            ShowWindow(hwnd, SW_SHOWNA);
        }
        SetWindowPos(
            hwnd,
            insert_after as *mut std::ffi::c_void,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        );
    }
}

pub(crate) fn is_desktop_class_name(name: &str) -> bool {
    matches!(
        name,
        "Progman"
            | "WorkerW"
            | "SHELLDLL_DefView"
            | "XamlExplorerHostIslandWindow"
            | "SysListView32"
            | "FolderView"
    )
}

fn class_name(hwnd: *mut std::ffi::c_void) -> String {
    if hwnd.is_null() {
        return String::new();
    }
    let mut buf = [0u16; 256];
    let n = unsafe { GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32) };
    if n <= 0 {
        return String::new();
    }
    String::from_utf16_lossy(&buf[..n as usize])
}

fn is_desktop_shell_hwnd(hwnd: *mut std::ffi::c_void) -> bool {
    let mut cur = hwnd;
    for _ in 0..8 {
        if cur.is_null() {
            break;
        }
        if is_desktop_class_name(&class_name(cur)) {
            return true;
        }
        cur = unsafe { GetParent(cur) };
    }
    false
}

unsafe extern "system" fn on_foreground(
    _hook: *mut std::ffi::c_void,
    event: u32,
    hwnd: *mut std::ffi::c_void,
    _id_object: i32,
    _id_child: i32,
    _id_event_thread: u32,
    _dwms_event_time: u32,
) {
    if event != EVENT_SYSTEM_FOREGROUND || hwnd.is_null() || user_hidden() {
        return;
    }
    let widget = WIDGET_HWND.load(Ordering::SeqCst) as *mut std::ffi::c_void;
    if hwnd == widget {
        return;
    }
    if is_desktop_shell_hwnd(hwnd) {
        restore_over_desktop();
    }
}

unsafe extern "system" fn widget_wnd_proc(
    hwnd: *mut std::ffi::c_void,
    msg: u32,
    wparam: usize,
    lparam: isize,
) -> isize {
    if !user_hidden() {
        if msg == WM_SHOWWINDOW && wparam == 0 {
            return 0;
        }
        if msg == WM_SYSCOMMAND && (wparam & 0xFFF0) == SC_MINIMIZE {
            return 0;
        }
        if msg == WM_WINDOWPOSCHANGING && lparam != 0 {
            let pos = &mut *(lparam as *mut WindowPos);
            if pos.x <= SHOW_DESKTOP_SENTINEL || pos.y <= SHOW_DESKTOP_SENTINEL {
                pos.flags |= SWP_NOMOVE | SWP_NOSIZE;
            }
            if pos.flags & SWP_HIDEWINDOW != 0 {
                pos.flags &= !SWP_HIDEWINDOW;
            }
            if pos.hwnd_insert_after as isize == HWND_BOTTOM {
                pos.hwnd_insert_after = HWND_TOP as *mut std::ffi::c_void;
            }
        }
    }
    let orig = ORIG_WNDPROC.load(Ordering::SeqCst);
    if orig == 0 {
        return DefWindowProcW(hwnd, msg, wparam, lparam);
    }
    CallWindowProcW(orig, hwnd, msg, wparam, lparam)
}

#[cfg(test)]
mod tests {
    use super::is_desktop_class_name;

    #[test]
    fn desktop_shell_classes() {
        assert!(is_desktop_class_name("Progman"));
        assert!(is_desktop_class_name("WorkerW"));
        assert!(is_desktop_class_name("SHELLDLL_DefView"));
        assert!(is_desktop_class_name("XamlExplorerHostIslandWindow"));
        assert!(is_desktop_class_name("SysListView32"));
        assert!(is_desktop_class_name("FolderView"));
        assert!(!is_desktop_class_name("Chrome_WidgetWin_1"));
        assert!(!is_desktop_class_name("Shell_TrayWnd"));
    }
}
