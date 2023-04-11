use emerald_vault::crypto::error::CryptoError;
use emerald_vault::error::VaultError;
use neon::context::{FunctionContext};
use neon::prelude::{JsString};
use errors::VaultNodeError;
use instance::Instance;

#[neon_frame_fn(channel=0)]
pub fn is_set<H>(_cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<bool, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let storage = vault.cfg.get_storage();
        let result = storage.global_key().is_set();
        handler(Ok(result));
    });
    Ok(())
}

#[neon_frame_fn(channel=1)]
pub fn create<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<bool, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;
    let password = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "password".to_string()))?
        .value(cx);

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let storage = vault.cfg.get_storage();
        let result = storage.global_key().create(password.as_str())
            .map(|_| true)
            .map_err(VaultNodeError::from);
        handler(result);
    });
    Ok(())
}

#[neon_frame_fn(channel=1)]
pub fn verify<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<bool, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;
    let password = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "password".to_string()))?
        .value(cx);

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let storage = vault.cfg.get_storage();
        let result = storage.global_key().verify_password(password.as_str())
            .map_err(VaultNodeError::from);
        handler(result);
    });
    Ok(())
}

#[neon_frame_fn(channel=2)]
pub fn change_password<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<bool, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;
    let current_password = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "current_password".to_string()))?
        .value(cx);
    let new_password = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "new_password".to_string()))?
        .value(cx);

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let storage = vault.cfg.get_storage();
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
            .map_err(VaultNodeError::from)
            ;
        handler(result);
    });
    Ok(())
}