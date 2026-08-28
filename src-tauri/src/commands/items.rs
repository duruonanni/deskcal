use tauri::State;

use crate::db::{self, DbError};
use crate::domain::{Item, ItemKind, ListRange, NewItem, UpdateItemPatch};
use crate::AppState;

fn db_err_to_string(err: DbError) -> String {
    err.to_string()
}

#[tauri::command]
pub fn items_list_range(
    state: State<'_, AppState>,
    start: String,
    end: String,
) -> Result<Vec<Item>, String> {
    let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
    db::list_range(&conn, ListRange { start, end }).map_err(db_err_to_string)
}

#[tauri::command]
pub fn items_create(
    state: State<'_, AppState>,
    title: String,
    day: String,
    kind: Option<ItemKind>,
    notes: Option<String>,
) -> Result<Item, String> {
    let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
    db::create_item(
        &conn,
        NewItem {
            title,
            day,
            kind,
            notes,
        },
    )
    .map_err(db_err_to_string)
}

#[tauri::command]
pub fn items_update(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    notes: Option<String>,
    day: Option<String>,
    kind: Option<ItemKind>,
) -> Result<Item, String> {
    let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
    db::update_item(
        &conn,
        &id,
        UpdateItemPatch {
            title,
            notes,
            day,
            kind,
        },
    )
    .map_err(db_err_to_string)
}

#[tauri::command]
pub fn items_complete(state: State<'_, AppState>, id: String) -> Result<Item, String> {
    let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
    db::complete_item(&conn, &id).map_err(db_err_to_string)
}

#[tauri::command]
pub fn items_delete(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
    db::delete_item(&conn, &id).map_err(db_err_to_string)
}

#[tauri::command]
pub fn items_list_incomplete(state: State<'_, AppState>) -> Result<Vec<Item>, String> {
    let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
    db::list_incomplete(&conn).map_err(db_err_to_string)
}
