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
mod seeds;

use neon::prelude::*;
use accounts::*;
use access::{VaultConfig, Vault};
use emerald_rs::{
    Address,
    rpc::common::{
        SignTxTransaction
    },
    core::{
        PrivateKey, PRIVATE_KEY_BYTES
    },
    keystore::{
        KeyFile, CryptoType, KdfDepthLevel, Kdf, os_random
    },
    util::{
        ToHex
    },
    mnemonic::{
        Mnemonic, HDPath, Language, generate_key, MnemonicSize
    },
    rpc::common::NewMnemonicAccount
};
use std::str::FromStr;

fn list_accounts(mut cx: FunctionContext) -> JsResult<JsArray> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = Vault::new(cfg);
    let accounts = vault.list_accounts();

    let result = JsArray::new(&mut cx, accounts.len() as u32);
    for (i, e) in accounts.iter().map(|acc| AccountData::from(acc)).enumerate() {
        let account_js = e.as_js_object(&mut cx);
        result.set(&mut cx, i as u32, account_js).unwrap();
    }

    Ok(result)
}

fn import_account(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = Vault::new(cfg);

    let raw = cx.argument::<JsString>(1).expect("Input JSON is not provided").value();
    let pk = KeyFile::decode(raw.as_str()).expect("Invalid JSON");
    vault.put(&pk);

    let result = JsObject::new(&mut cx);
    let id_handle = cx.string(pk.uuid.to_string());
    result.set(&mut cx, "id", id_handle).expect("Failed to set id");
    let addr_handle = cx.string("0x".to_owned() + pk.address.to_hex().as_str());
    result.set(&mut cx, "address", addr_handle).expect("Failed to set address");

    Ok(result)
}

fn import_pk(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = Vault::new(cfg);

    let raw = cx.argument::<JsString>(1).expect("Input JSON is not provided").value();
    let pk_data: ImportPrivateKey = serde_json::from_str::<ImportPrivateKey>(raw.as_str())
        .expect("Invalid JSON");
    let pk_hex = pk_data.pk;
    if pk_hex.len() != (PRIVATE_KEY_BYTES * 2 + 2) && pk_hex.starts_with("0x")
        && pk_hex.len() != PRIVATE_KEY_BYTES * 2  && !pk_hex.starts_with("0x"){
        panic!("Invalid PrivateKey string")
    }
    let pk_hex = if pk_hex.starts_with("0x") {
        pk_hex.split_at(2).1
    } else {
        pk_hex.as_str()
    };
    let pk_bytes = hex::decode(&pk_hex)
        .expect("PrivateKey is not in hex");

    let pk = PrivateKey::try_from(&pk_bytes.as_slice()).expect("Invalid PrivateKey");

    let mut rng = os_random();
    let key_file = KeyFile::new_custom(pk, pk_data.password.as_str(),
                                       Kdf::from(KdfDepthLevel::Normal), &mut rng,
                                       pk_data.name, pk_data.description)
        .expect("Failed to create KeyFile for input data");
    vault.put(&key_file);

    let result = JsObject::new(&mut cx);
    let id_handle = cx.string(key_file.uuid.to_string());
    result.set(&mut cx, "id", id_handle).expect("Failed to set id");
    let addr_handle = cx.string("0x".to_owned() + key_file.address.to_hex().as_str());
    result.set(&mut cx, "address", addr_handle).expect("Failed to set address");

    Ok(result)
}

fn export_account(mut cx: FunctionContext) -> JsResult<JsString> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = Vault::new(cfg);

    let address_js = cx.argument::<JsString>(1).unwrap().value();
    let address = Address::from_str(address_js.as_str()).expect("Invalid address");

    let kf= vault.get(&address);
    let value = serde_json::to_value(&kf).expect("Failed to encode JSON");
    let value_js = cx.string(format!("{}", value));

    Ok(value_js)
}

fn export_pk(mut cx: FunctionContext) -> JsResult<JsString> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = Vault::new(cfg);

    let address = cx.argument::<JsString>(1).expect("Address is not provided").value();
    let address = Address::from_str(address.as_str()).expect("Invalid address");
    let password = cx.argument::<JsString>(2).expect("Password is not provided").value();

    let kf= vault.get(&address);
    let pk = kf.decrypt_key(password.as_str()).expect("Invalid password");

    let result = cx.string(format!("0x{}", hex::encode(pk.0)));
    Ok(result)
}

fn update_account(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = Vault::new(cfg);

    let address_str = cx.argument::<JsString>(1).unwrap().value();
    let address = Address::from_str(address_str.as_str()).expect("Invalid address");
    let mut kf = vault.get(&address);

    let update_js = cx.argument::<JsString>(2).unwrap().value();
    let update = serde_json::from_str::<UpdateAccount>(update_js.as_str())
        .expect("Invalid update JSON");

    kf.name = update.name.or(kf.name);
    kf.description = update.description.or(kf.description);
    vault.put(&kf);

    let result = cx.boolean(true);
    Ok(result)
}

fn remove_account(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = Vault::new(cfg);

    let address_str = cx.argument::<JsString>(1).unwrap().value();
    let address = Address::from_str(address_str.as_str()).expect("Invalid address");
    vault.remove(&address);
    let result = cx.boolean(true);
    Ok(result)
}

fn sign_tx(mut cx: FunctionContext) -> JsResult<JsString> {
    let cfg = VaultConfig::get_config(&mut cx);
    let chain_id = cfg.chain.get_chain_id();
    let vault = Vault::new(cfg);

    let sign_js = cx.argument::<JsString>(1).unwrap().value();
    let sign: SignTxTransaction = serde_json::from_str::<SignTxTransaction>(sign_js.as_str())
        .expect("Invalid sign JSON");

    let address = Address::from_str(sign.from.as_str()).expect("Invalid from address");
    let kf= vault.get(&address);

    let raw_hex = match kf.crypto {
        CryptoType::Core(_) => {
            let pass = cx.argument::<JsString>(2).unwrap().value();

            let tr = sign.try_into().expect("Invalid sign JSON");
            let pk = kf.decrypt_key(&pass).expect("Invalid password");
            let raw_tx = tr.to_signed_raw(pk, chain_id).expect("Expect to sign a transaction");
            format!("0x{}", raw_tx.to_hex())
        }
        _ => panic!("Unsupported crypto")
    };

    let value_js = cx.string(raw_hex);

    Ok(value_js)
}

fn generate_mnemonic(mut cx: FunctionContext) -> JsResult<JsString> {
    let size = cx.argument::<JsNumber>(0)
        .expect("Mnemonic size is not provided").value() as usize;

    let size = MnemonicSize::from_length(size).expect("Invalid mnemonic size");
    let mnemonic = Mnemonic::new(Language::English, size).expect("Failed to generate mnemonic");
    let sentence = mnemonic.sentence();

    let value_js = cx.string(sentence);

    Ok(value_js)
}

fn import_mnemonic(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = Vault::new(cfg);

    let raw = cx.argument::<JsString>(1).expect("Input JSON is not provided").value();
    let account: NewMnemonicAccount = serde_json::from_str(&raw).expect("Invalid JSON");

    if account.password.is_empty() {
        panic!("Empty password");
    }

    let mnemonic = Mnemonic::try_from(Language::English, &account.mnemonic).expect("Mnemonic is not valid");
    let hd_path = HDPath::try_from(&account.hd_path).expect("HDPath is not valid");
    let pk = generate_key(&hd_path, &mnemonic.seed(None)).expect("Unable to generate private key");

    let kdf = if cfg!(target_os = "windows") {
        Kdf::from_str("pbkdf2").expect("PBKDF not available")
    } else {
        Kdf::from(KdfDepthLevel::Normal)
    };

    let mut rng = os_random();
    let kf = KeyFile::new_custom(
        pk,
        &account.password,
        kdf,
        &mut rng,
        Some(account.name),
        Some(account.description),
    ).expect("Unable to generate KeyFile");

    vault.put(&kf);

    let result = JsObject::new(&mut cx);
    let id_handle = cx.string(kf.uuid.to_string());
    result.set(&mut cx, "id", id_handle).expect("Failed to set id");
    let addr_handle = cx.string("0x".to_owned()+kf.address.to_hex().as_str());
    result.set(&mut cx, "address", addr_handle).expect("Failed to set address");

    Ok(result)
}

fn list_address_book(mut cx: FunctionContext) -> JsResult<JsArray> {
    let cfg = VaultConfig::get_config(&mut cx);
    let chain_code = cfg.chain.clone();
    let storage = cfg.get_storage();

    let storage = storage.get_addressbook(chain_code.get_code().as_str())
        .expect("Unable to access address book");
    let list = storage.list();
    let result = JsArray::new(&mut cx, list.len() as u32);
    for (i, e) in list.iter().enumerate() {
        let book_js = JsObject::new(&mut cx);
        let handle = cx.string(e.get("address")
            .expect("Address not set").as_str()
            .expect("Address is not string"));
        book_js.set(&mut cx, "address", handle)
            .expect("Failed to set address");
        match e.get("name") {
            Some(val) => {
                let val = cx.string(val.as_str()
                    .expect("Expect string for the name field"));;
                book_js.set(&mut cx, "name", val)
                    .expect("Failed to set name");
            },
            None => {}
        };
        match e.get("description") {
            Some(val) => {
                let val = cx.string(val.as_str()
                    .expect("Expect string for the description field"));
                book_js.set(&mut cx, "description", val)
                    .expect("Failed to set description");
            },
            None => {}
        };

        result.set(&mut cx, i as u32, book_js).unwrap();
    };
    Ok(result)
}

fn add_address_book(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let cfg = VaultConfig::get_config(&mut cx);
    let chain_code = cfg.chain.clone();
    let storage = cfg.get_storage();

    let storage = storage.get_addressbook(chain_code.get_code().as_str())
        .expect("Unable to access address book");

    let add_js = cx.argument::<JsString>(1)
        .expect("Address Book item not provided").value();
    let item = serde_json::from_str::<serde_json::Value>(add_js.as_str())
        .expect("Invalid input JSON");
    storage.add(&item).expect("Failed to add to Address Book");

    let result = cx.boolean(true);
    Ok(result)
}

fn remove_address_book(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let cfg = VaultConfig::get_config(&mut cx);
    let chain_code = cfg.chain.clone();
    let storage = cfg.get_storage();

    let storage = storage.get_addressbook(chain_code.get_code().as_str())
        .expect("Unable to access address book");
    let address = cx.argument::<JsString>(1).expect("Address no provided").value();
    let address = Address::from_str(address.as_str()).expect("Invalid address");
    storage.delete(&serde_json::Value::String(address.to_string())).expect("Failed to remove from Address Book");

    let result = cx.boolean(true);
    Ok(result)
}

register_module!(mut cx, {
    cx.export_function("listAccounts", list_accounts).expect("listAccounts not exported");
    cx.export_function("importAccount", import_account).expect("importAccount not exported");
    cx.export_function("exportAccount", export_account).expect("exportAccount not exported");
    cx.export_function("updateAccount", update_account).expect("updateAccount not exported");
    cx.export_function("removeAccount", remove_account).expect("removeAccount not exported");

    cx.export_function("importPk", import_pk).expect("importPk not exported");
    cx.export_function("exportPk", export_pk).expect("exportPk not exported");

    cx.export_function("signTx", sign_tx).expect("signTx not exported");

    cx.export_function("importMnemonic", import_mnemonic).expect("importMnemonic not exported");
    cx.export_function("generateMnemonic", generate_mnemonic).expect("generateMnemonic not exported");

    cx.export_function("listAddressBook", list_address_book).expect("listAddressBook not exported");
    cx.export_function("addToAddressBook", add_address_book).expect("addToAddressBook not exported");
    cx.export_function("removeFromAddressBook", remove_address_book).expect("removeFromAddressBook not exported");

    cx.export_function("ledger_isConnected", seeds::is_connected).expect("ledger_isConnected not exported");
    cx.export_function("ledger_listAddresses", seeds::list_addresses).expect("ledger_listAddresses not exported");


    Ok(())
});
