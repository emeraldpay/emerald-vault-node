#[macro_use]
extern crate neon;
extern crate emerald_vault;
extern crate uuid;
extern crate hex;
extern crate serde_json;
#[macro_use]
extern crate serde_derive;

mod json;
mod accounts;
mod access;
mod seeds;

use neon::prelude::*;
use accounts::*;
use access::{VaultConfig, WrappedVault, MigrationConfig};
use json::{UnsignedTx, ImportPrivateKey, UpdateAccount, NewMnemonicAccount, NewAddressBookItem};
use emerald_vault::{
    Address,
    Transaction,
    trim_hex,
    core::{
        PrivateKey, PRIVATE_KEY_BYTES
    },
    keystore::{
        KeyFile, CryptoType, KdfDepthLevel, Kdf, os_random
    },
    convert::ethereum::{
        EthereumJsonV3File
    },
    util::{
        ToHex
    },
    mnemonic::{
        Mnemonic, HDPath, Language, generate_key, MnemonicSize
    },
    convert::proto::book::AddressRef,
    storage::vault::VaultAccess
};
use std::str::FromStr;
use std::convert::{TryFrom, TryInto};

fn list_accounts(mut cx: FunctionContext) -> JsResult<JsArray> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);
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
    let vault = WrappedVault::new(cfg);

    let raw = cx.argument::<JsString>(1).expect("Input JSON is not provided").value();
    let pk = EthereumJsonV3File::try_from(raw).expect("Invalid JSON");
    let id = vault.put(&pk);
    let address = vault.get_wallet_address(id).expect("Address not initialized");

    let result = JsObject::new(&mut cx);
    let id_handle = cx.string(id.to_string());
    result.set(&mut cx, "id", id_handle).expect("Failed to set id");
    let addr_handle = cx.string(address.to_string());
    result.set(&mut cx, "address", addr_handle).expect("Failed to set address");

    Ok(result)
}

fn import_pk(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let raw = cx.argument::<JsString>(1).expect("Input JSON is not provided").value();
    let pk_data: ImportPrivateKey = serde_json::from_str::<ImportPrivateKey>(raw.as_str())
        .expect("Invalid JSON");
    let pk_bytes = hex::decode(trim_hex(pk_data.pk.as_str()))
        .expect("PrivateKey is not in hex");

    let id = vault.import_pk(pk_bytes, &pk_data.password, pk_data.name);
    let address = vault.get_wallet_address(id).expect("Address not initialized");

    let result = JsObject::new(&mut cx);
    let id_handle = cx.string(id.to_string());
    result.set(&mut cx, "id", id_handle).expect("Failed to set id");

    let addr_handle = cx.string(address.to_string());
    result.set(&mut cx, "address", addr_handle).expect("Failed to set address");

    Ok(result)
}

fn export_account(mut cx: FunctionContext) -> JsResult<JsString> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let address_js = cx.argument::<JsString>(1).unwrap().value();
    let address = Address::from_str(address_js.as_str()).expect("Invalid address");

    let wallet = vault.get_wallet_by_addr(&address).expect("Wallet not found");
    let pk = vault.get(&address);
    let json = EthereumJsonV3File::from_wallet(&wallet, &pk).expect("JSON not created");
    let value = serde_json::to_value(&json).expect("Failed to encode JSON");
    let value_js = cx.string(format!("{}", value));

    Ok(value_js)
}

fn export_pk(mut cx: FunctionContext) -> JsResult<JsString> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let address = cx.argument::<JsString>(1).expect("Address is not provided").value();
    let address = Address::from_str(address.as_str()).expect("Invalid address");
    let password = cx.argument::<JsString>(2).expect("Password is not provided").value();

    let kf= vault.get(&address);
    let pk = kf.decrypt(password.as_str()).expect("Invalid password");

    let result = cx.string(format!("0x{}", hex::encode(pk)));
    Ok(result)
}

fn update_account(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let address_str = cx.argument::<JsString>(1).unwrap().value();
    let address = Address::from_str(address_str.as_str()).expect("Invalid address");
    let wallet = vault.get_wallet_by_addr(&address);
    let mut wallet = wallet.expect("No wallet for specified address");

    let update_js = cx.argument::<JsString>(2).unwrap().value();
    let update = serde_json::from_str::<UpdateAccount>(update_js.as_str())
        .expect("Invalid update JSON");

    wallet.label = update.name.or(wallet.label);
//    kf.description = update.description.or(kf.description);
    vault.update(wallet).expect("Not saved");

    let result = cx.boolean(true);
    Ok(result)
}

fn remove_account(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let address_str = cx.argument::<JsString>(1).unwrap().value();
    let address = Address::from_str(address_str.as_str()).expect("Invalid address");
    vault.remove(&address);
    let result = cx.boolean(true);
    Ok(result)
}

fn sign_tx(mut cx: FunctionContext) -> JsResult<JsString> {
    let cfg = VaultConfig::get_config(&mut cx);
    let chain_id = cfg.chain;
    let vault = WrappedVault::new(cfg);

    let sign_js = cx.argument::<JsString>(1).unwrap().value();
    let sign = serde_json::from_str::<UnsignedTx>(sign_js.as_str())
        .expect("Invalid sign JSON");

    let pass = cx.argument::<JsString>(2).unwrap().value();
    let address = Address::from_str(sign.from.as_str()).expect("Invalid from address");
    let key = vault.get(&address);
    let key = key.decrypt(pass.as_str()).expect("Invalid password");
    let key = PrivateKey::try_from(key.as_slice()).expect("Invalid PrivateKey");

    let tr: Transaction = sign.try_into().expect("Invalid sign JSON");
    let raw_tx = tr.to_signed_raw(key, chain_id).expect("Expect to sign a transaction");
    let raw_hex = format!("0x{}", raw_tx.to_hex());

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
    let vault = WrappedVault::new(cfg);

    let raw = cx.argument::<JsString>(1).expect("Input JSON is not provided").value();
    let account: NewMnemonicAccount = serde_json::from_str(&raw).expect("Invalid JSON");

    if account.password.is_empty() {
        panic!("Empty password");
    }

    let mnemonic = Mnemonic::try_from(Language::English, &account.mnemonic).expect("Mnemonic is not valid");
    let hd_path = HDPath::try_from(&account.hd_path).expect("HDPath is not valid");
    let pk = generate_key(&hd_path, &mnemonic.seed(None)).expect("Unable to generate private key");

    let id = vault.import_pk(pk.to_vec(), &account.password, Some(account.name));
    let address = vault.get_wallet_address(id).expect("Address not initialized");

    let result = JsObject::new(&mut cx);
    let id_handle = cx.string(id.to_string());
    result.set(&mut cx, "id", id_handle).expect("Failed to set id");
    let addr_handle = cx.string(address.to_string());
    result.set(&mut cx, "address", addr_handle).expect("Failed to set address");

    Ok(result)
}

fn list_address_book(mut cx: FunctionContext) -> JsResult<JsArray> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let list = vault.list_addressbook();

    let result = JsArray::new(&mut cx, list.len() as u32);
    for (i, e) in list.iter().enumerate() {
        let book_js = JsObject::new(&mut cx);

        match &e.details.address {
            AddressRef::EthereumAddress(address) => {
                let handle = cx.string(address.to_string());
                book_js.set(&mut cx, "address", handle)
                    .expect("Failed to set address");
            }
        }
        match &e.details.label {
            Some(val) => {
                let val = cx.string(val.as_str());
                book_js.set(&mut cx, "name", val)
                    .expect("Failed to set name");
            },
            None => {}
        };
        match &e.details.description {
            Some(val) => {
                let val = cx.string(val.as_str());
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
    let vault = WrappedVault::new(cfg);


    let add_js = cx.argument::<JsString>(1)
        .expect("Address Book item not provided").value();
    let item = serde_json::from_str::<NewAddressBookItem>(add_js.as_str())
        .expect("Invalid input JSON");
    let result = vault.add_to_addressbook(item);

    let result = cx.boolean(result);
    Ok(result)
}

fn remove_address_book(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let cfg = VaultConfig::get_config(&mut cx);
    let chain_code = cfg.chain.clone();
    let vault = WrappedVault::new(cfg);

    let address = cx.argument::<JsString>(1).expect("Address no provided").value();
    let address = Address::from_str(address.as_str()).expect("Invalid address");

    let removed = vault.remove_addressbook_by_addr(&address);

    let result = cx.boolean(removed);
    Ok(result)
}

fn auto_migrate(mut cx: FunctionContext) -> JsResult<JsArray> {
    let cfg = MigrationConfig::get_config(&mut cx);
    emerald_vault::migration::auto_migrate(cfg.dir.clone());

    //TODO
    let result = JsArray::new(&mut cx, 0 as u32);
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

    cx.export_function("auto_migrate", auto_migrate).expect("auto_migrate not exported");


    Ok(())
});
