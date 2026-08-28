import WidgetApp from "./widgets/WidgetApp";
import SettingsApp from "./settings/SettingsApp";
import ListApp from "./list/ListApp";

function getWindowType(): "widget" | "settings" | "list" {
  const params = new URLSearchParams(window.location.search);
  const windowParam = params.get("window");
  if (windowParam === "settings") return "settings";
  if (windowParam === "list") return "list";
  return "widget";
}

export default function App() {
  const windowType = getWindowType();
  if (windowType === "settings") return <SettingsApp />;
  if (windowType === "list") return <ListApp />;
  return <WidgetApp />;
}
