#[macro_use]
extern crate neon;
extern crate emerald_rs;
extern crate uuid;
extern crate hex;
extern crate serde_json;
#[macro_use]
extern crate serde_derive;

mod accounts;
mod access;
mod js;

use neon::prelude::*;
use accounts::*;
use access::{VaultConfig};
use emerald_rs::{
    Address,
    Transaction,
    rpc::common::{
        SignTxTransaction
    },
    storage::{
        KeyfileStorage, StorageController, default_path,
        keyfile::{KeystoreError}
    },
    keystore::{
        KeyFile, CryptoType
    },
    util::{
        ToHex
    }
};
use std::path::{Path, PathBuf};
use js::*;
use std::str::FromStr;

fn list_accounts(mut cx: FunctionContext) -> JsResult<JsArray> {
    let cfg = VaultConfig::get_config(&mut cx);
    let storage = cfg.get_storage();
    let ks = storage.get_keystore(&cfg.chain.get_path_element())
        .expect("Keyfile Storage not opened");
    let accounts = ks.list_accounts(false)
        .expect("No accounts loaded");

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
    let ks = storage.get_keystore(&cfg.chain.get_path_element())
        .expect("Keyfile Storage not opened");

    let raw = cx.argument::<JsString>(1).expect("Input JSON is not provided").value();
    let pk = KeyFile::decode(raw.as_str()).expect("Invalid JSON");
    ks.put(&pk);

    let result = JsObject::new(&mut cx);
    let id_handle = cx.string(pk.uuid.to_string());
    result.set(&mut cx, "id", id_handle);

    Ok(result)
}

fn export_account(mut cx: FunctionContext) -> JsResult<JsString> {
    let cfg = VaultConfig::get_config(&mut cx);
    let storage = cfg.get_storage();
    let ks = storage.get_keystore(&cfg.chain.get_path_element())
        .expect("Keyfile Storage not opened");

    let address = cx.argument::<JsString>(1).unwrap().value();

    let addr = Address::from_str(address.as_str()).expect("Invalid address");

    let (_, kf) = ks.search_by_address(&addr).expect("Address not found");
    let value = serde_json::to_value(&kf).expect("Failed to encode JSON");
    let value_js = cx.string(format!("{}", value));

    Ok(value_js)
}

fn update_account(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let cfg = VaultConfig::get_config(&mut cx);
    let storage = cfg.get_storage();
    let ks = storage.get_keystore(&cfg.chain.get_path_element())
        .expect("Keyfile Storage not opened");

    let address_str = cx.argument::<JsString>(1).unwrap().value();
    let address = Address::from_str(address_str.as_str()).expect("Invalid address");
    let (_, mut kf) = ks.search_by_address(&address).expect("Address not found");

    let update_js = cx.argument::<JsString>(2).unwrap().value();
    let update = serde_json::from_str::<UpdateAccount>(update_js.as_str())
        .expect("Invalid update JSON");

    kf.name = update.name.or(kf.name);
    kf.description = update.description.or(kf.description);
    ks.put(&kf);

    let result = cx.boolean(true);
    Ok(result)
}

fn sign_tx(mut cx: FunctionContext) -> JsResult<JsString> {
    let cfg = VaultConfig::get_config(&mut cx);
    let storage = cfg.get_storage();
    let ks = storage.get_keystore(&cfg.chain.get_path_element())
        .expect("Keyfile Storage not opened");

    let sign_js = cx.argument::<JsString>(1).unwrap().value();
    let sign = serde_json::from_str::<SignTxTransaction>(sign_js.as_str())
        .expect("Invalid sign JSON");

    let address = Address::from_str(sign.from.as_str()).expect("Invalid from address");
    let (_, mut kf) = ks.search_by_address(&address).expect("Address not found");

    let raw_hex = match kf.crypto {
        CryptoType::Core(_) => {
            let pass = cx.argument::<JsString>(2).unwrap().value();

            let tr = sign.try_into().expect("Invalid sign JSON");
            let pk = kf.decrypt_key(&pass).expect("Invalid password");
            let raw_tx = tr.to_signed_raw(pk, cfg.chain.get_chain_id()).expect("Expect to sign a transaction");
            format!("0x{}", raw_tx.to_hex())
        }
        _ => panic!("Unsupported crypto")
    };

    let value_js = cx.string(format!("{}", raw_hex));

    Ok(value_js)
}

register_module!(mut cx, {
    cx.export_function("listAccounts", list_accounts);
    cx.export_function("importAccount", import_account);
    cx.export_function("exportAccount", export_account);
    cx.export_function("updateAccount", update_account);
    cx.export_function("signTx", sign_tx);
    Ok(())
});
