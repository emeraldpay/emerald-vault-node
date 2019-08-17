#[macro_use]
extern crate neon;
extern crate emerald_rs;
extern crate uuid;
extern crate hex;

mod accounts;
mod access;
mod js;

use neon::prelude::*;
use accounts::*;
use access::{VaultConfig};
use emerald_rs::storage::{
    KeyfileStorage, StorageController, default_path,
    keyfile::{KeystoreError}
};
use std::path::{Path, PathBuf};
use emerald_rs::keystore::KeyFile;
use js::*;


fn list_accounts(mut cx: FunctionContext) -> JsResult<JsArray> {
    let cfg = VaultConfig::get_config(&mut cx);
    let storage = cfg.get_storage();
    let ks = storage.get_keystore(&cfg.chain).unwrap();
    let accounts = ks.list_accounts(false).unwrap();

    let result = JsArray::new(&mut cx, accounts.len() as u32);
    for (i, e) in accounts.iter().map(|acc| AccountData::from(acc)).enumerate() {
        let account_js = e.as_js_object(&mut cx);
        result.set(&mut cx, i as u32, account_js).unwrap();
    }

    Ok(result)
}

fn import_account(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let storage = cfg.get_storage();
    let ks = storage.get_keystore(&cfg.chain).unwrap();

    let raw = cx.argument::<JsString>(1).unwrap().value();
    let pk = KeyFile::decode(raw.as_str()).unwrap();
    ks.put(&pk);

    let result = JsObject::new(&mut cx);
    let id_handle = cx.string(pk.uuid.to_string());
    result.set(&mut cx, "id", id_handle);

    Ok(result)
}

register_module!(mut cx, {
    cx.export_function("listAccounts", list_accounts);
    cx.export_function("importAccount", import_account)
});
