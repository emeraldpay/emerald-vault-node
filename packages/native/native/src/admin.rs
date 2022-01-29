use neon::context::Context;
use neon::handle::Handle;
use neon::object::Object;
use neon::prelude::{FunctionContext, JsArray, JsFunction, JsNumber, JsResult, JsString, JsUndefined, JsValue};
use uuid::Uuid;

use access::{MigrationConfig, VaultConfig, WrappedVault};
use emerald_vault::storage::admin::VaultAdmin;
use emerald_vault::storage::error::VaultError;
use emerald_vault::storage::global_key::LegacyEntryRef;
use json::StatusResult;

pub fn migrate(mut cx: FunctionContext) -> JsResult<JsArray> {
    let cfg = MigrationConfig::get_config(&mut cx);
    emerald_vault::migration::auto_migrate(cfg.dir.clone());

    //TODO
    let result = JsArray::new(&mut cx, 0 as u32);
    Ok(result)
}

pub fn autofix(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let cfg = VaultConfig::get_config(&mut cx);
    let storage = cfg.get_storage();
    let recovered = match storage.revert_backups() {
        Ok(count) => count as i32,
        Err(e) => {
            println!("Failed to recover Vault. {:?}", e); //TODO use log
            -1
        }
    };

    //TODO
    let result = JsNumber::new(&mut cx, recovered);
    Ok(result)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", content = "id")]
pub enum LegacyEntryRefJson {
    #[serde(rename = "seed")]
    Seed(String),
    #[serde(rename = "key")]
    PrivateKey(String),
}

impl From<&LegacyEntryRef> for LegacyEntryRefJson {
    fn from(r: &LegacyEntryRef) -> Self {
        match r {
            LegacyEntryRef::Seed(id) => LegacyEntryRefJson::Seed(id.to_string()),
            LegacyEntryRef::PrivateKey(id) => LegacyEntryRefJson::PrivateKey(id.to_string()),
        }
    }
}

pub fn list_odd(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let cfg = VaultConfig::get_config(&mut cx);

    let handler = cx.argument::<JsFunction>(1)?.root(&mut cx);
    let queue = cx.channel();
    std::thread::spawn(move || {
        let storage = cfg.get_storage();
        let result: Result<Vec<LegacyEntryRefJson>, VaultError> = storage.get_global_key_missing()
            .map(|l| l.iter().map(|r| LegacyEntryRefJson::from(r)).collect());
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

pub fn upgrade_odd(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let password = cx
        .argument::<JsString>(1)
        .expect("Legacy Password is not provided")
        .value(&mut cx);
    let global_password = cx
        .argument::<JsString>(2)
        .expect("Global Key Password is not provided")
        .value(&mut cx);

    let cfg = VaultConfig::get_config(&mut cx);

    let handler = cx.argument::<JsFunction>(3)?.root(&mut cx);
    let queue = cx.channel();
    std::thread::spawn(move || {
        let storage = cfg.get_storage();
        let admin = VaultAdmin::create(storage);
        let result = admin.upgrade_all_legacy(password.as_str(), global_password.as_str());

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