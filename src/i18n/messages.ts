export type AppLocale = "zh" | "en";

export type MessageKey =
  | "appName"
  | "today"
  | "prevMonth"
  | "nextMonth"
  | "lock"
  | "unlock"
  | "lockedHint"
  | "unlockedHint"
  | "loadItemsFailed"
  | "createFailed"
  | "completeFailed"
  | "deleteFailed"
  | "dayPanelAria"
  | "newItemAria"
  | "newItemPlaceholder"
  | "markDone"
  | "alreadyDone"
  | "delete"
  | "settingsTitle"
  | "readSettingsFailed"
  | "saveSettingsFailed"
  | "appearance"
  | "opacity"
  | "textOutline"
  | "calendar"
  | "showTitlesInCells"
  | "weekStartsMonday"
  | "language"
  | "languageZh"
  | "languageEn"
  | "lockWidget"
  | "lockWidgetHelp"
  | "aiSoonTitle"
  | "aiSoonBody"
  | "tryAi"
  | "syncSoonTitle"
  | "syncSoonBody"
  | "exportSnapshot"
  | "importSnapshot"
  | "comingSoon"
  | "failedPrefix"
  | "incompleteTitle"
  | "incompleteSubtitle"
  | "loadIncompleteFailed"
  | "noIncomplete"
  | "complete"
  | "restDay"
  | "workDay"
  | "monthGridAria"
  | "dragHint";

const ZH: Record<MessageKey, string> = {
  appName: "桌历",
  today: "今天",
  prevMonth: "上个月",
  nextMonth: "下个月",
  lock: "锁定",
  unlock: "解锁",
  lockedHint: "已锁定位置",
  unlockedHint: "拖动空白处可移动",
  loadItemsFailed: "加载事项失败，请稍后重试。",
  createFailed: "创建失败，请稍后重试。",
  completeFailed: "标记完成失败，请稍后重试。",
  deleteFailed: "删除失败，请稍后重试。",
  dayPanelAria: "当日事项",
  newItemAria: "新建事项",
  newItemPlaceholder: "记一件事…",
  markDone: "标记完成",
  alreadyDone: "已完成",
  delete: "删除",
  settingsTitle: "设置",
  readSettingsFailed: "读取设置失败。",
  saveSettingsFailed: "保存设置失败。",
  appearance: "外观",
  opacity: "底板不透明度",
  textOutline: "文字描边（提高壁纸上的可读性）",
  calendar: "日历",
  showTitlesInCells: "格内显示任务标题",
  weekStartsMonday: "周起始为一；农历与休/班为离线数据。",
  language: "语言",
  languageZh: "中文",
  languageEn: "English",
  lockWidget: "锁定窗口位置",
  lockWidgetHelp: "锁定后不能拖动。解锁后按住标题栏或星期行即可移动。",
  aiSoonTitle: "AI（即将推出）",
  aiSoonBody: "应用内填写 API Key 的分析助手尚未开放。核心日历不依赖网络。",
  tryAi: "试用 AI",
  syncSoonTitle: "数据同步（即将推出）",
  syncSoonBody: "自选 OneDrive / iCloud Drive 文件夹快照尚未开放。数据库不会放进网盘。",
  exportSnapshot: "导出快照",
  importSnapshot: "导入快照",
  comingSoon: "即将推出",
  failedPrefix: "失败",
  incompleteTitle: "未完成",
  incompleteSubtitle: "按日期排列的未完成事项",
  loadIncompleteFailed: "加载未完成事项失败。",
  noIncomplete: "没有未完成的事项。",
  complete: "完成",
  restDay: "休息日",
  workDay: "调班",
  monthGridAria: "月历",
  dragHint: "解锁后可拖动",
};

const EN: Record<MessageKey, string> = {
  appName: "DeskCal",
  today: "Today",
  prevMonth: "Previous month",
  nextMonth: "Next month",
  lock: "Lock",
  unlock: "Unlock",
  lockedHint: "Position locked",
  unlockedHint: "Drag empty space to move",
  loadItemsFailed: "Could not load items. Try again.",
  createFailed: "Could not create the item. Try again.",
  completeFailed: "Could not mark the item done. Try again.",
  deleteFailed: "Could not delete the item. Try again.",
  dayPanelAria: "Items for the selected day",
  newItemAria: "New item",
  newItemPlaceholder: "Write something…",
  markDone: "Mark done",
  alreadyDone: "Completed",
  delete: "Delete",
  settingsTitle: "Settings",
  readSettingsFailed: "Could not read settings.",
  saveSettingsFailed: "Could not save settings.",
  appearance: "Appearance",
  opacity: "Background opacity",
  textOutline: "Text outline (easier to read on wallpaper)",
  calendar: "Calendar",
  showTitlesInCells: "Show task titles in cells",
  weekStartsMonday: "Weeks start on Monday. Lunar dates and mainland rest/work marks are offline.",
  language: "Language",
  languageZh: "中文",
  languageEn: "English",
  lockWidget: "Lock window position",
  lockWidgetHelp: "When locked, the widget cannot be dragged. Unlock, then drag the title or weekday row.",
  aiSoonTitle: "AI (coming soon)",
  aiSoonBody: "In-app API key analysis is not available yet. The calendar works offline.",
  tryAi: "Try AI",
  syncSoonTitle: "Sync (coming soon)",
  syncSoonBody: "Bring-your-own OneDrive / iCloud folder snapshots are not available yet. The live database will not be stored in a cloud drive.",
  exportSnapshot: "Export snapshot",
  importSnapshot: "Import snapshot",
  comingSoon: "Coming soon",
  failedPrefix: "Failed",
  incompleteTitle: "Incomplete",
  incompleteSubtitle: "Open tasks grouped by date",
  loadIncompleteFailed: "Could not load incomplete items.",
  noIncomplete: "No incomplete items.",
  complete: "Done",
  restDay: "Rest day",
  workDay: "Work day",
  monthGridAria: "Month calendar",
  dragHint: "Unlock to drag",
};

const TABLES: Record<AppLocale, Record<MessageKey, string>> = { zh: ZH, en: EN };

export function t(locale: AppLocale, key: MessageKey): string {
  return TABLES[locale][key];
}

export function documentLang(locale: AppLocale): string {
  return locale === "en" ? "en" : "zh-CN";
}
