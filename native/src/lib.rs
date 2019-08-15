#[macro_use]
extern crate neon;
extern crate emerald_rs;

mod accounts;
mod access;

use neon::prelude::*;
use types::*;
use accounts::*;
use access::{VaultConfig};
use emerald_rs::storage::{
    KeyfileStorage, StorageController, default_path,
    keyfile::{KeystoreError}
};
use std::path::{Path, PathBuf};


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

register_module!(mut cx, {
    cx.export_function("listAccounts", list_accounts)
});
