use neon::handle::Handle;
use neon::object::{Object};
use neon::prelude::{FunctionContext, JsObject, JsString, JsNumber, JsValue, NeonResult};
use neon::types::{JsNull, JsUndefined};

use uuid::Uuid;
use errors::{VaultNodeError};

pub fn obj_get_str(cx: &mut FunctionContext, obj: &Handle<JsObject>, name: &str) -> Option<String> {
    let value: NeonResult<Handle<JsValue>> = obj.get(cx, name);
    match value {
        Ok(val) => {
            if val.is_a::<JsNull, _>(cx) {
                None
            } else if val.is_a::<JsUndefined, _>(cx) {
                None
            } else {
                Some(val.downcast::<JsString, _>(cx).expect("Not a string").value(cx))
            }
        }
        Err(_) => None,
    }
}

pub fn obj_get_number(cx: &mut FunctionContext, obj: &Handle<JsObject>, name: &str) -> Option<i64> {
    let value: NeonResult<Handle<JsValue>> = obj.get(cx, name);
    match value {
        Ok(val) => {
            if val.is_a::<JsNull, _>(cx) {
                None
            } else if val.is_a::<JsUndefined, _>(cx) {
                None
            } else {
                let f = val.downcast::<JsNumber, _>(cx).expect("Not a number").value(cx);
                if f.round() == f {
                    Some(f as i64)
                } else {
                    None
                }
            }
        }
        Err(_) => None,
    }
}

pub fn args_get_str(cx: &mut FunctionContext, pos: usize) -> Option<String> {
    match cx.argument_opt(pos) {
        None => None,
        Some(v) => {
            if v.is_a::<JsString, _>(cx) {
                match v.downcast::<JsString, _>(cx) {
                    Ok(v) => Some(v.value(cx)),
                    Err(_) => None,
                }
            } else {
                None
            }
        }
    }
}

pub fn args_require_str(cx: &mut FunctionContext, pos: usize, name: &str) -> Result<String, VaultNodeError> {
    args_get_str(cx, pos)
        .ok_or(VaultNodeError::ArgumentMissing(pos as usize, name.to_string()))
}

pub fn args_get_uuid(cx: &mut FunctionContext, pos: usize) -> Result<Uuid, VaultNodeError> {
    let wallet_id = cx
        .argument::<JsString>(pos)
        .map_err(|_| VaultNodeError::ArgumentMissing(pos as usize, "id".to_string()))?
        .value(cx);
    Uuid::parse_str(wallet_id.as_str()).map_err(|_| VaultNodeError::InvalidArgument(pos as usize))
}

pub fn args_get_wallet_and_entry_ids(cx: &mut FunctionContext, pos: usize) -> Result<(Uuid, usize), VaultNodeError> {
    let wallet_id = cx
        .argument::<JsString>(pos)
        .map_err(|_| VaultNodeError::ArgumentMissing(pos as usize, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::parse_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(pos as usize))?;

    let entry_id = cx
        .argument::<JsNumber>(pos + 1)
        .map_err(|_| VaultNodeError::ArgumentMissing(pos as usize + 1, "entry_id".to_string()))?
        .value(cx);
    let entry_id = entry_id as usize;

    Ok((wallet_id, entry_id))
}




