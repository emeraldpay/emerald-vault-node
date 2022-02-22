use emerald_vault::crypto::error::CryptoError;
use emerald_vault::storage::error::VaultError;
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

pub fn verify(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let cfg = VaultConfig::get_config(&mut cx);
    let password = cx
        .argument::<JsString>(1)
        .expect("Password is not provided")
        .value(&mut cx);

    let handler = cx.argument::<JsFunction>(2)?.root(&mut cx);
    let queue = cx.channel();
    std::thread::spawn(move || {
        let storage = cfg.get_storage();
        let result = storage.global_key().verify_password(password.as_str());

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

pub fn change_password(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let cfg = VaultConfig::get_config(&mut cx);
    let current_password = cx
        .argument::<JsString>(1)
        .expect("Current Password is not provided")
        .value(&mut cx);
    let new_password = cx
        .argument::<JsString>(2)
        .expect("New Password is not provided")
        .value(&mut cx);

    let handler = cx.argument::<JsFunction>(3)?.root(&mut cx);
    let queue = cx.channel();
    std::thread::spawn(move || {
        let storage = cfg.get_storage();
        let result = storage.global_key()
            .change_password(current_password.as_str(), new_password.as_str())
            .map_or_else(
                |e| match e {
                    // if CryptoFailed with WrongKey then the current_password is invalid, so return just false
                    VaultError::CryptoFailed(cf) => match cf {
                        CryptoError::WrongKey => Ok(false),
                        _ => Err(VaultError::CryptoFailed(cf))
                    },
                    _ => Err(e)
                },
                |_| Ok(true))
            ;

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