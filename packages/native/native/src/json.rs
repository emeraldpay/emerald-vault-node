use neon::prelude::{Context, Handle, JsObject, JsValue, Object, Value};

use emerald_vault::storage::error::VaultError;

#[derive(Debug, Copy, Clone)]
pub enum JsonError {
    InvalidData,
}

impl std::convert::From<hex::FromHexError> for JsonError {
    fn from(_: hex::FromHexError) -> Self {
        JsonError::InvalidData
    }
}

#[derive(Serialize)]
pub struct StatusErrorJson {
    pub code: u32,
    pub message: String,
}

#[derive(Serialize)]
pub struct StatusJson<T> {
    pub succeeded: bool,
    pub result: Option<T>,
    pub error: Option<StatusErrorJson>,
}

pub enum StatusResult<T> {
    Ok(T),
    Error(u32, String),
}

impl<T> StatusResult<T>
    where
        T: Clone + serde::Serialize,
{
    pub fn as_json(&self) -> String {
        let obj = match self {
            StatusResult::Ok(ref t) => StatusJson {
                succeeded: true,
                result: Some(t.clone()),
                error: None,
            },
            StatusResult::Error(code, message) => StatusJson {
                succeeded: false,
                result: None,
                error: Some(StatusErrorJson {
                    code: *code,
                    message: message.clone(),
                }),
            },
        };
        let result = serde_json::to_string(&obj)
            .map_err(|err| "{\"succeeded\": false, \"error\": {\"code\": 0, \"message\": \"Failed to convert JSON\"}}".to_string());
        match result {
            Ok(v) => v,
            Err(v) => v
        }
    }
}

impl<T> From<Result<T, VaultError>> for StatusResult<T> {
    fn from(r: Result<T, VaultError>) -> Self {
        match r {
            Ok(t) => StatusResult::Ok(t),
            Err(e) => StatusResult::Error(2, format!("{:?}", e)),
        }
    }
}

impl<T> From<Result<T, String>> for StatusResult<T> {
    fn from(r: Result<T, String>) -> Self {
        match r {
            Ok(t) => StatusResult::Ok(t),
            Err(msg) => StatusResult::Error(2, msg),
        }
    }
}

pub trait AsJsObject {
    fn as_js_object<'a, C: Context<'a>>(&self, cx: &mut C) -> Handle<'a, JsValue>;
}

impl<T> AsJsObject for StatusResult<T>
    where
        T: AsJsObject,
{
    fn as_js_object<'a, C: Context<'a>>(&self, cx: &mut C) -> Handle<'a, JsValue> {
        let js = JsObject::new(cx);

        match self {
            StatusResult::Ok(t) => {
                let handle = cx.boolean(true);
                js.set(cx, "succeeded", handle).unwrap();

                let handle = t.as_js_object(cx);
                js.set(cx, "result", handle).unwrap();
            }
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
