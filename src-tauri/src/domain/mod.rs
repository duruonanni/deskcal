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
}

impl UiSettings {
    pub fn clamped(mut self) -> Self {
        self.widget_opacity = self.widget_opacity.clamp(0.35, 1.0);
        self
    }
}

impl Default for UiSettings {
    fn default() -> Self {
        Self {
            widget_opacity: 0.42,
            show_titles_in_cells: true,
            text_outline: true,
            locale: AppLocale::Zh,
            widget_locked: false,
        }
    }
}
