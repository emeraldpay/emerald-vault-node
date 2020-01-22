use neon::prelude::{Context, Handle, JsObject, JsValue, Object, Value};

use emerald_vault::{
    storage::{
        error::VaultError
    }
};

#[derive(Debug, Copy, Clone)]
pub enum JsonError {
    InvalidData
}

impl std::convert::From<hex::FromHexError> for JsonError {
    fn from(_: hex::FromHexError) -> Self {
        JsonError::InvalidData
    }
}

#[derive(Serialize)]
pub struct StatusErrorJson {
    pub code: u32,
    pub message: String
}

#[derive(Serialize)]
pub struct StatusJson<T> {
    pub succeeded: bool,
    pub result: Option<T>,
    pub error: Option<StatusErrorJson>
}

pub enum StatusResult<T> {
    Ok(T),
    Error(u32, String)
}

impl <T> StatusResult<T> where T: Clone {
    pub fn as_json(&self) -> StatusJson<T> {
        match self {
            StatusResult::Ok(ref t) => StatusJson {
                succeeded: true,
                result: Some(t.clone()),
                error: None
            },
            StatusResult::Error(code, message) => StatusJson {
                succeeded: false,
                result: None,
                error: Some(StatusErrorJson {
                    code: *code,
                    message: message.clone()
                })
            }
        }
    }
}

impl <T> From<Result<T, VaultError>> for StatusResult<T> {
    fn from(r: Result<T, VaultError>) -> Self {
        match r {
            Ok(t) => StatusResult::Ok(t),
            Err(_) => StatusResult::Error(2, "Vault Error".to_string())
        }
    }
}

pub trait AsJsObject {
    fn as_js_object<'a, C: Context<'a>>(&self, cx: &mut C) -> Handle<'a, JsValue>;
}

impl<T> AsJsObject for StatusResult<T> where T: AsJsObject {
    fn as_js_object<'a, C: Context<'a>>(&self, cx: &mut C) -> Handle<'a, JsValue> {
        let mut js = JsObject::new(cx);

        match self {
            StatusResult::Ok(t) => {
                let handle = cx.boolean(true);
                js.set(cx, "succeeded", handle).unwrap();

                let handle = t.as_js_object(cx);
                js.set(cx, "result", handle).unwrap();
            },
            StatusResult::Error(code, msg) => {
                let handle = cx.boolean(false);
                js.set(cx, "succeeded", handle).unwrap();

                let error = JsObject::new(cx);
                let handle = cx.number(*code as f64);
                js.set(cx, "code", handle).unwrap();
                let handle = cx.string(msg);
                js.set(cx, "message", handle).unwrap();

                js.set(cx, "error", error).unwrap();
            }
        };

        js.as_value(cx)
    }
}