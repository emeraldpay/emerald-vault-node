use neon::context::{Context, FunctionContext};
use neon::handle::Handle;
use neon::object::Object;
use neon::prelude::{JsFunction, JsResult, JsString, JsUndefined, JsValue};
use access::VaultConfig;
use json::StatusResult;

pub fn is_set(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let cfg = VaultConfig::get_config(&mut cx);

    let handler = cx.argument::<JsFunction>(1)?.root(&mut cx);
    let queue = cx.channel();
    std::thread::spawn(move || {
        let storage = cfg.get_storage();
        let result = storage.global_key().is_set();

        let status = StatusResult::Ok(result).as_json();
        queue.send(move |mut cx| {
            let callback = handler.into_inner(&mut cx);
            let this = cx.undefined();
            let args: Vec<Handle<JsValue>> = vec![cx.string(status).upcast()];
            callback.call(&mut cx, this, args)?;
            Ok(())
        });
    });
    Ok(cx.undefined())
}

pub fn create(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let cfg = VaultConfig::get_config(&mut cx);
    let password = cx
        .argument::<JsString>(1)
        .expect("Password is not provided")
        .value(&mut cx);

    let handler = cx.argument::<JsFunction>(2)?.root(&mut cx);
    let queue = cx.channel();
    std::thread::spawn(move || {
        let storage = cfg.get_storage();
        let result = storage.global_key().create(password.as_str())
            .map(|_| true);

        let status = StatusResult::from(result).as_json();
        queue.send(move |mut cx| {
            let callback = handler.into_inner(&mut cx);
            let this = cx.undefined();
            let args: Vec<Handle<JsValue>> = vec![cx.string(status).upcast()];
            callback.call(&mut cx, this, args)?;
            Ok(())
        });
    });
    Ok(cx.undefined())
}