use tauri::{AppHandle, Emitter, State};

use crate::db::{self, DbError};
use crate::domain::{Item, ItemKind, ListRange, NewItem, UpdateItemPatch};
use crate::AppState;

fn db_err_to_string(err: DbError) -> String {
    err.to_string()
}

fn emit_items_changed(app: &AppHandle) {
    let _ = app.emit("items-changed", ());
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
    app: AppHandle,
    state: State<'_, AppState>,
    title: String,
    day: String,
    kind: Option<ItemKind>,
    notes: Option<String>,
) -> Result<Item, String> {
    let item = {
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
        .map_err(db_err_to_string)?
    };
    emit_items_changed(&app);
    Ok(item)
}

#[tauri::command]
pub fn items_update(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    notes: Option<String>,
    day: Option<String>,
    kind: Option<ItemKind>,
) -> Result<Item, String> {
    let item = {
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
        .map_err(db_err_to_string)?
    };
    emit_items_changed(&app);
    Ok(item)
}

#[tauri::command]
pub fn items_complete(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<Item, String> {
    let item = {
        let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
        db::complete_item(&conn, &id).map_err(db_err_to_string)?
    };
    emit_items_changed(&app);
    Ok(item)
}

#[tauri::command]
pub fn items_delete(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<(), String> {
    {
        let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
        db::delete_item(&conn, &id).map_err(db_err_to_string)?;
    }
    emit_items_changed(&app);
    Ok(())
}

#[tauri::command]
pub fn items_list_incomplete(state: State<'_, AppState>) -> Result<Vec<Item>, String> {
    let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
    db::list_incomplete(&conn).map_err(db_err_to_string)
}

#[tauri::command]
pub fn items_uncomplete(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<Item, String> {
    let item = {
        let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
        db::uncomplete_item(&conn, &id).map_err(db_err_to_string)?
    };
    emit_items_changed(&app);
    Ok(item)
}

#[tauri::command]
pub fn items_reorder(
    app: AppHandle,
    state: State<'_, AppState>,
    day: String,
    ids: Vec<String>,
) -> Result<(), String> {
    {
        let conn = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
        db::reorder_items(&conn, &day, &ids).map_err(db_err_to_string)?;
    }
    emit_items_changed(&app);
    Ok(())
}
