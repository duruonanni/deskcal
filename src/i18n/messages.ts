export type AppLocale = "zh" | "en";

export type MessageKey =
  | "appName"
  | "today"
  | "prevMonth"
  | "nextMonth"
  | "prevWeek"
  | "nextWeek"
  | "openSettings"
  | "openSettingsFailed"
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
  | "updateFailed"
  | "reorderFailed"
  | "dragHandleAria"
  | "markUndone"
  | "editItem"
  | "settingsTitle"
  | "appVersionLabel"
  | "readSettingsFailed"
  | "saveSettingsFailed"
  | "appearance"
  | "opacity"
  | "textOutline"
  | "calendar"
  | "showTitlesInCells"
  | "weekStartsMonday"
  | "weekNumberMode"
  | "weekNumberIso"
  | "weekNumberRemaining"
  | "language"
  | "languageZh"
  | "languageEn"
  | "lockWidget"
  | "lockWidgetHelp"
  | "holidaysSection"
  | "holidaysSectionHelp"
  | "holidaysSource"
  | "holidaysFetchedAt"
  | "holidaysNotFetched"
  | "holidaysRefresh"
  | "holidaysRefreshing"
  | "holidaysRefreshFailed"
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
  | "weekGridAria"
  | "dragHint"
  | "themeModeLabel"
  | "themeAuto"
  | "themeLight"
  | "themeDark"
  | "opacityHelp"
  | "customThemeInvalid"
  | "restMark"
  | "workMark"
  | "advancedSettings"
  | "holidaySourceUrlLabel"
  | "holidaySourceUrlHelp"
  | "holidaySourceUrlWarning"
  | "holidaySourceUrlReset"
  | "holidaySourceUrlInvalid";

const ZH: Record<MessageKey, string> = {
  appName: "桌历",
  today: "今天",
  prevMonth: "上个月",
  nextMonth: "下个月",
  prevWeek: "上一周",
  nextWeek: "下一周",
  openSettings: "设置",
  openSettingsFailed: "无法打开设置。",
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
  updateFailed: "更新失败，请稍后重试。",
  reorderFailed: "排序失败，请稍后重试。",
  dragHandleAria: "拖动排序",
  markUndone: "标记未完成",
  editItem: "编辑标题",
  settingsTitle: "设置",
  appVersionLabel: "版本",
  readSettingsFailed: "读取设置失败。",
  saveSettingsFailed: "保存设置失败。",
  appearance: "外观",
  opacity: "格子不透明度",
  textOutline: "文字描边（提高壁纸上的可读性）",
  calendar: "日历",
  showTitlesInCells: "格内显示任务标题",
  weekStartsMonday: "周起始为一；农历与休/班为离线数据。",
  weekNumberMode: "周数显示",
  weekNumberIso: "今年第几周",
  weekNumberRemaining: "距年底剩余周数",
  language: "语言",
  languageZh: "中文",
  languageEn: "English",
  lockWidget: "锁定窗口位置",
  lockWidgetHelp: "锁定后不能拖动。解锁后按住标题栏或星期行即可移动。",
  holidaysSection: "班休数据",
  holidaysSectionHelp: "从网络获取国务院公布的调休安排；失败时使用本地缓存或内置数据。",
  holidaysSource: "数据源",
  holidaysFetchedAt: "最近获取",
  holidaysNotFetched: "尚未成功获取",
  holidaysRefresh: "立即更新",
  holidaysRefreshing: "正在更新…",
  holidaysRefreshFailed: "获取失败，已使用离线数据",
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
  weekGridAria: "四周滚动日历",
  dragHint: "解锁后可拖动",
  themeModeLabel: "主题",
  themeAuto: "跟随系统",
  themeLight: "浅色",
  themeDark: "深色",
  opacityHelp: "最低 70% 不透明，可再调高。只影响有日期的格子，空位仍全透明。",
  customThemeInvalid: "自定义主题文件无效，已回落到编辑风。",
  restMark: "休",
  workMark: "班",
  advancedSettings: "高级设置",
  holidaySourceUrlLabel: "班休数据源地址",
  holidaySourceUrlHelp: "须为 https 地址且包含 {year}；留空则使用内置默认源。",
  holidaySourceUrlWarning:
    "谨慎：错误的地址会导致班休数据失败并回落离线数据。",
  holidaySourceUrlReset: "恢复默认",
  holidaySourceUrlInvalid: "地址须为 https 且包含 {year}",
};

const EN: Record<MessageKey, string> = {
  appName: "DeskCal",
  today: "Today",
  prevMonth: "Previous month",
  nextMonth: "Next month",
  prevWeek: "Previous week",
  nextWeek: "Next week",
  openSettings: "Settings",
  openSettingsFailed: "Could not open settings.",
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
  updateFailed: "Could not update the item. Try again.",
  reorderFailed: "Could not reorder items. Try again.",
  dragHandleAria: "Drag to reorder",
  markUndone: "Mark not done",
  editItem: "Edit title",
  settingsTitle: "Settings",
  appVersionLabel: "Version",
  readSettingsFailed: "Could not read settings.",
  saveSettingsFailed: "Could not save settings.",
  appearance: "Appearance",
  opacity: "Cell opacity",
  textOutline: "Text outline (easier to read on wallpaper)",
  calendar: "Calendar",
  showTitlesInCells: "Show task titles in cells",
  weekStartsMonday: "Weeks start on Monday. Lunar dates and mainland rest/work marks are offline.",
  weekNumberMode: "Week number",
  weekNumberIso: "ISO week of year",
  weekNumberRemaining: "Weeks left in year",
  language: "Language",
  languageZh: "中文",
  languageEn: "English",
  lockWidget: "Lock window position",
  lockWidgetHelp: "When locked, the widget cannot be dragged. Unlock, then drag the title or weekday row.",
  holidaysSection: "Rest / work data",
  holidaysSectionHelp: "Fetches official mainland holiday schedules from the network; falls back to cache or bundled data.",
  holidaysSource: "Source",
  holidaysFetchedAt: "Last fetched",
  holidaysNotFetched: "Not fetched yet",
  holidaysRefresh: "Update now",
  holidaysRefreshing: "Updating…",
  holidaysRefreshFailed: "Fetch failed; using offline data",
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
  weekGridAria: "Rolling four-week calendar",
  dragHint: "Unlock to drag",
  themeModeLabel: "Theme",
  themeAuto: "Follow system",
  themeLight: "Light",
  themeDark: "Dark",
  opacityHelp: "Minimum 70% opaque; you can raise it further. Affects dated cells only; empty slots stay transparent.",
  customThemeInvalid: "Custom theme file is invalid; fell back to Editorial.",
  restMark: "Off",
  workMark: "Work",
  advancedSettings: "Advanced",
  holidaySourceUrlLabel: "Holiday data source URL",
  holidaySourceUrlHelp: "Must be https and include {year}; leave empty for the built-in default.",
  holidaySourceUrlWarning:
    "Caution: a wrong URL will fail holiday fetch and fall back to offline data.",
  holidaySourceUrlReset: "Restore default",
  holidaySourceUrlInvalid: "URL must be https and include {year}",
};

const TABLES: Record<AppLocale, Record<MessageKey, string>> = { zh: ZH, en: EN };

export function t(locale: AppLocale, key: MessageKey): string {
  return TABLES[locale][key];
}

export function documentLang(locale: AppLocale): string {
  return locale === "en" ? "en" : "zh-CN";
}
