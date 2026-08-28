use std::path::Path;

use rusqlite::{params, Connection, Row};
use thiserror::Error;
use ulid::Ulid;

use crate::domain::{Item, ItemKind, ListRange, NewItem, UiSettings, UpdateItemPatch};

const UI_REV_KEY: &str = "ui_rev";
const UI_REV_CELL_TITLES: &str = "2";

#[derive(Debug, Error)]
pub enum DbError {
    #[error("sqlite: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("item not found: {0}")]
    NotFound(String),
    #[error("invalid input: {0}")]
    InvalidInput(String),
}

pub fn open(path: &Path) -> Result<Connection, DbError> {
    let conn = Connection::open(path)?;
    migrate(&conn)?;
    Ok(conn)
}

pub fn migrate(conn: &Connection) -> Result<(), DbError> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY NOT NULL,
            kind TEXT NOT NULL DEFAULT 'task',
            title TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            day TEXT NOT NULL,
            completed_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            deleted_at INTEGER,
            start_at INTEGER,
            due_at INTEGER,
            recurrence TEXT,
            color TEXT,
            sort INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_items_day ON items(day);
        CREATE TABLE IF NOT EXISTS kv (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        );
        "#,
    )?;
    migrate_ui_rev(conn)?;
    Ok(())
}

pub fn get_kv(conn: &Connection, key: &str) -> Result<Option<String>, DbError> {
    let value: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT value FROM kv WHERE key = ?1",
        params![key],
        |row| row.get(0),
    );
    match value {
        Ok(raw) => Ok(Some(raw)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(err) => Err(DbError::Sqlite(err)),
    }
}

pub fn set_kv(conn: &Connection, key: &str, value: &str) -> Result<(), DbError> {
    conn.execute(
        "INSERT INTO kv (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

fn migrate_ui_rev(conn: &Connection) -> Result<(), DbError> {
    if get_kv(conn, UI_REV_KEY)?.as_deref() == Some(UI_REV_CELL_TITLES) {
        return Ok(());
    }
    let _ = get_ui_settings(conn)?;
    set_kv(conn, UI_REV_KEY, UI_REV_CELL_TITLES)?;
    Ok(())
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system clock before unix epoch")
        .as_millis() as i64
}

fn row_to_item(row: &Row<'_>) -> Result<Item, DbError> {
    let kind_str: String = row.get("kind")?;
    Ok(Item {
        id: row.get("id")?,
        kind: ItemKind::from_str(&kind_str).map_err(DbError::InvalidInput)?,
        title: row.get("title")?,
        notes: row.get("notes")?,
        day: row.get("day")?,
        completed_at: row.get("completed_at")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        deleted_at: row.get("deleted_at")?,
    })
}

fn get_item(conn: &Connection, id: &str) -> Result<Item, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, kind, title, notes, day, completed_at, created_at, updated_at, deleted_at
         FROM items WHERE id = ?1",
    )?;
    let mut rows = stmt.query(params![id])?;
    match rows.next()? {
        Some(row) => row_to_item(&row),
        None => Err(DbError::NotFound(id.to_string())),
    }
}

pub fn create_item(conn: &Connection, new: NewItem) -> Result<Item, DbError> {
    let id = Ulid::new().to_string();
    let now = now_ms();
    let kind = new.kind.unwrap_or_default();
    let notes = new.notes.unwrap_or_default();

    conn.execute(
        "INSERT INTO items (id, kind, title, notes, day, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, kind.as_str(), new.title, notes, new.day, now, now],
    )?;

    get_item(conn, &id)
}

pub fn update_item(conn: &Connection, id: &str, patch: UpdateItemPatch) -> Result<Item, DbError> {
    let existing = get_item(conn, id)?;
    if existing.deleted_at.is_some() {
        return Err(DbError::NotFound(id.to_string()));
    }

    let now = now_ms();
    let title = patch.title.unwrap_or(existing.title);
    let notes = patch.notes.unwrap_or(existing.notes);
    let day = patch.day.unwrap_or(existing.day);
    let kind = patch.kind.unwrap_or(existing.kind);

    let rows = conn.execute(
        "UPDATE items
         SET title = ?1, notes = ?2, day = ?3, kind = ?4, updated_at = ?5
         WHERE id = ?6 AND deleted_at IS NULL",
        params![title, notes, day, kind.as_str(), now, id],
    )?;

    if rows == 0 {
        return Err(DbError::NotFound(id.to_string()));
    }

    get_item(conn, id)
}

pub fn complete_item(conn: &Connection, id: &str) -> Result<Item, DbError> {
    let now = now_ms();
    let rows = conn.execute(
        "UPDATE items SET completed_at = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![now, now, id],
    )?;

    if rows == 0 {
        return Err(DbError::NotFound(id.to_string()));
    }

    get_item(conn, id)
}

pub fn delete_item(conn: &Connection, id: &str) -> Result<(), DbError> {
    let now = now_ms();
    let rows = conn.execute(
        "UPDATE items SET deleted_at = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![now, now, id],
    )?;

    if rows == 0 {
        return Err(DbError::NotFound(id.to_string()));
    }

    Ok(())
}

pub fn list_range(conn: &Connection, range: ListRange) -> Result<Vec<Item>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, kind, title, notes, day, completed_at, created_at, updated_at, deleted_at
         FROM items
         WHERE day >= ?1 AND day <= ?2 AND deleted_at IS NULL
         ORDER BY day ASC, created_at ASC",
    )?;

    let items = stmt
        .query_map(params![range.start, range.end], |row| {
            row_to_item(row).map_err(|e| {
                rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    e.to_string(),
                )))
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(items)
}

const UI_SETTINGS_KEY: &str = "ui";

pub fn get_ui_settings(conn: &Connection) -> Result<UiSettings, DbError> {
    let value: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT value FROM kv WHERE key = ?1",
        params![UI_SETTINGS_KEY],
        |row| row.get(0),
    );
    match value {
        Ok(raw) => serde_json::from_str(&raw).map_err(|e| DbError::InvalidInput(e.to_string())),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(UiSettings::default()),
        Err(err) => Err(DbError::Sqlite(err)),
    }
}

pub fn set_ui_settings(conn: &Connection, settings: &UiSettings) -> Result<(), DbError> {
    let raw =
        serde_json::to_string(settings).map_err(|e| DbError::InvalidInput(e.to_string()))?;
    conn.execute(
        "INSERT INTO kv (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![UI_SETTINGS_KEY, raw],
    )?;
    Ok(())
}

pub fn list_incomplete(conn: &Connection) -> Result<Vec<Item>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, kind, title, notes, day, completed_at, created_at, updated_at, deleted_at
         FROM items
         WHERE deleted_at IS NULL AND completed_at IS NULL
         ORDER BY day ASC, created_at ASC",
    )?;
    let mut rows = stmt.query([])?;
    let mut items = Vec::new();
    while let Some(row) = rows.next()? {
        items.push(row_to_item(row)?);
    }
    Ok(items)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    fn open_test_db() -> (Connection, NamedTempFile) {
        let file = NamedTempFile::new().expect("temp db file");
        let conn = open(file.path()).expect("open test db");
        (conn, file)
    }

    #[test]
    fn create_then_list_range_finds_item() {
        let (conn, _file) = open_test_db();
        let created = create_item(
            &conn,
            NewItem {
                title: "Buy milk".to_string(),
                day: "2026-08-28".to_string(),
                kind: None,
                notes: None,
            },
        )
        .expect("create item");

        let items = list_range(
            &conn,
            ListRange {
                start: "2026-08-01".to_string(),
                end: "2026-08-31".to_string(),
            },
        )
        .expect("list range");

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].id, created.id);
        assert_eq!(items[0].title, "Buy milk");
    }

    #[test]
    fn complete_sets_completed_at() {
        let (conn, _file) = open_test_db();
        let created = create_item(
            &conn,
            NewItem {
                title: "Finish report".to_string(),
                day: "2026-08-28".to_string(),
                kind: None,
                notes: None,
            },
        )
        .expect("create item");

        assert!(created.completed_at.is_none());

        let completed = complete_item(&conn, &created.id).expect("complete item");
        assert!(completed.completed_at.is_some());
    }

    #[test]
    fn delete_hides_from_list_range() {
        let (conn, _file) = open_test_db();
        let created = create_item(
            &conn,
            NewItem {
                title: "Temporary".to_string(),
                day: "2026-08-28".to_string(),
                kind: None,
                notes: None,
            },
        )
        .expect("create item");

        delete_item(&conn, &created.id).expect("delete item");

        let items = list_range(
            &conn,
            ListRange {
                start: "2026-08-01".to_string(),
                end: "2026-08-31".to_string(),
            },
        )
        .expect("list range");

        assert!(items.is_empty());
    }

    #[test]
    fn list_range_excludes_items_outside_range() {
        let (conn, _file) = open_test_db();
        create_item(
            &conn,
            NewItem {
                title: "In range".to_string(),
                day: "2026-08-15".to_string(),
                kind: None,
                notes: None,
            },
        )
        .expect("create in-range item");
        create_item(
            &conn,
            NewItem {
                title: "Before range".to_string(),
                day: "2026-07-31".to_string(),
                kind: None,
                notes: None,
            },
        )
        .expect("create before-range item");
        create_item(
            &conn,
            NewItem {
                title: "After range".to_string(),
                day: "2026-09-01".to_string(),
                kind: None,
                notes: None,
            },
        )
        .expect("create after-range item");

        let items = list_range(
            &conn,
            ListRange {
                start: "2026-08-01".to_string(),
                end: "2026-08-31".to_string(),
            },
        )
        .expect("list range");

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].title, "In range");
    }

    #[test]
    fn ui_settings_default_then_roundtrip() {
        let (conn, _file) = open_test_db();
        let initial = get_ui_settings(&conn).expect("default settings");
        assert!(!initial.show_titles_in_cells);
        assert!(!initial.widget_locked);
        let mut next = initial;
        next.show_titles_in_cells = false;
        next.widget_opacity = 0.3;
        next.widget_locked = true;
        set_ui_settings(&conn, &next).expect("save settings");
        let loaded = get_ui_settings(&conn).expect("load settings");
        assert!(!loaded.show_titles_in_cells);
        assert!(loaded.widget_locked);
        assert!((loaded.widget_opacity - 0.3).abs() < f32::EPSILON);
    }
}
