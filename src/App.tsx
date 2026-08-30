import WidgetApp from "./widgets/WidgetApp";
import SettingsApp from "./settings/SettingsApp";
import ListApp from "./list/ListApp";
import { isTauriRuntime } from "./platform/isTauriRuntime";

function BrowserOnlyNotice() {
  return (
    <main className="app-shell">
      <h1 className="app-title">桌历 DeskCal</h1>
      <p className="settings-section">
        这是开发预览页，不能代替桌面应用。请关闭此浏览器标签，使用任务栏托盘或桌面上的
        「桌历」窗口。
      </p>
      <p className="settings-meta">
        This page is a dev preview only. Close this tab and use the DeskCal desktop
        window or system tray icon instead.
      </p>
    </main>
  );
}

function getWindowType(): "widget" | "settings" | "list" {
  const params = new URLSearchParams(window.location.search);
  const windowParam = params.get("window");
  if (windowParam === "settings") return "settings";
  if (windowParam === "list") return "list";
  return "widget";
}

export default function App() {
  if (!isTauriRuntime()) {
    return <BrowserOnlyNotice />;
  }

  const windowType = getWindowType();
  if (windowType === "settings") return <SettingsApp />;
  if (windowType === "list") return <ListApp />;
  return <WidgetApp />;
}
