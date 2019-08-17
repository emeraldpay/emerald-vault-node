use neon::prelude::*;

pub fn as_js_value(cx: &mut FunctionContext, json: &Handle<JsObject>, name: &str) -> Option<String> {
    match json.get(cx, name) {
        Ok(h) => {
            match h.downcast::<JsString>() {
                Ok(s) => Some(s.value()),
                Err(_) => None
            }
        },
        Err(_) => None
    }
}

pub fn as_js_int(cx: &mut FunctionContext, json: &Handle<JsObject>, name: &str) -> Option<i64> {
    match json.get(cx, name) {
        Ok(h) => {
            match h.downcast::<JsNumber>() {
                Ok(s) => Some(s.value() as i64),
                Err(_) => None
            }
        },
        Err(_) => None
    }
}

pub fn as_js_object<'a>(cx: &mut FunctionContext<'a>, json: &Handle<'a, JsObject>, name: &str) -> Option<Handle<'a, JsObject>> {
    match json.get(cx, name) {
        Ok(h) => {
            match h.downcast::<JsObject>() {
                Ok(s) => Some(s),
                Err(_) => None
            }
        },
        Err(_) => None
    }
}