use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ItemKind {
    Task,
    Note,
    Event,
}

impl ItemKind {
    pub fn as_str(self) -> &'static str {
        match self {
            ItemKind::Task => "task",
            ItemKind::Note => "note",
            ItemKind::Event => "event",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "task" => Ok(ItemKind::Task),
            "note" => Ok(ItemKind::Note),
            "event" => Ok(ItemKind::Event),
            _ => Err(format!("invalid item kind: {s}")),
        }
    }
}

impl Default for ItemKind {
    fn default() -> Self {
        ItemKind::Task
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: String,
    pub kind: ItemKind,
    pub title: String,
    pub notes: String,
    pub day: String,
    pub completed_at: Option<i64>,
    pub sort: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewItem {
    pub title: String,
    pub day: String,
    pub kind: Option<ItemKind>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateItemPatch {
    pub title: Option<String>,
    pub notes: Option<String>,
    pub day: Option<String>,
    pub kind: Option<ItemKind>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListRange {
    pub start: String,
    pub end: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum AppLocale {
    #[default]
    Zh,
    En,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    #[default]
    Auto,
    Light,
    Dark,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum WeekNumberMode {
    #[default]
    Iso,
    Remaining,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiSettings {
    pub widget_opacity: f32,
    pub show_titles_in_cells: bool,
    pub text_outline: bool,
    #[serde(default)]
    pub locale: AppLocale,
    #[serde(default)]
    pub widget_locked: bool,
    #[serde(default)]
    pub theme_mode: ThemeMode,
    #[serde(default)]
    pub week_number_mode: WeekNumberMode,
    #[serde(default)]
    pub holiday_source_url: String,
}

fn validate_holiday_source_url(url: &str) -> Result<(), String> {
    if url.is_empty() {
        return Ok(());
    }
    if !url.starts_with("https://") {
        return Err("holiday source URL must use https".to_string());
    }
    if !url.contains("{year}") {
        return Err("holiday source URL must contain {year}".to_string());
    }
    Ok(())
}

impl UiSettings {
    pub fn clamped(mut self) -> Self {
        self.widget_opacity = self.widget_opacity.clamp(0.70, 1.00);
        if let Err(err) = validate_holiday_source_url(&self.holiday_source_url) {
            eprintln!("invalid holiday source URL, clearing: {err}");
            self.holiday_source_url.clear();
        }
        self
    }
}

impl Default for UiSettings {
    fn default() -> Self {
        Self {
            widget_opacity: 0.85,
            show_titles_in_cells: false,
            text_outline: false,
            locale: AppLocale::Zh,
            widget_locked: false,
            theme_mode: ThemeMode::Auto,
            week_number_mode: WeekNumberMode::Iso,
            holiday_source_url: String::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_opacity_to_cell_fill_range() {
        let low = UiSettings {
            widget_opacity: 0.05,
            ..UiSettings::default()
        };
        assert!((low.clamped().widget_opacity - 0.70).abs() < f32::EPSILON);
        let high = UiSettings {
            widget_opacity: 1.50,
            ..UiSettings::default()
        };
        assert!((high.clamped().widget_opacity - 1.00).abs() < f32::EPSILON);
    }

    #[test]
    fn defaults_match_week_grid_widget() {
        let s = UiSettings::default();
        assert!((s.widget_opacity - 0.85).abs() < f32::EPSILON);
        assert!(!s.show_titles_in_cells);
        assert!(!s.text_outline);
        assert_eq!(s.theme_mode, ThemeMode::Auto);
        assert_eq!(s.week_number_mode, WeekNumberMode::Iso);
        assert!(s.holiday_source_url.is_empty());
    }

    #[test]
    fn rejects_non_https_holiday_url_on_clamp() {
        let mut s = UiSettings::default();
        s.holiday_source_url = "http://example.com/{year}.json".to_string();
        let clamped = s.clamped();
        assert!(clamped.holiday_source_url.is_empty());
    }
}
