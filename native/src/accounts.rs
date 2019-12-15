use std::convert::TryFrom;
use std::str::FromStr;

use neon::prelude::*;
use uuid::Uuid;

use access::{VaultConfig, WrappedVault};
use emerald_vault::{Address, convert::json::keyfile::EthereumJsonV3File, core::chains::Blockchain, mnemonic::{generate_key, HDPath, Language, Mnemonic}, storage::{
    error::VaultError,
    keyfile::AccountInfo
}, structs::{
    pk::PrivateKeyHolder,
    wallet::{PKType, Wallet, WalletAccount}
}, trim_hex, PrivateKey, ToHex};
use json::{AsJsObject, StatusResult};

pub struct AccountData {
    pub address: String,
    pub name: String,
    pub description: String,
    pub hidden: bool,
    pub hardware: bool
}

impl From<&AccountInfo> for AccountData {

    fn from(src: &AccountInfo) -> Self {
        AccountData {
            address: src.address.clone(),
            name: src.name.clone(),
            description: src.description.clone(),
            hidden: src.is_hidden,
            hardware: src.is_hardware
        }
    }
}

#[derive(Deserialize)]
pub struct UpdateAccount {
    #[serde(default)]
    pub name: Option<String>,
    pub description: Option<String>
}

#[derive(Deserialize)]
pub struct ImportPrivateKey {
    pub pk: String,
    pub password: String,
    pub name: Option<String>,
    pub description: Option<String>
}


#[derive(Deserialize, Debug)]
pub struct NewMnemonicAccount {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    pub password: String,
    pub mnemonic: String,
    #[serde(alias = "hdPath")]
    pub hd_path: String,
}

impl WrappedVault {

    fn get_wallet_address(&self, id: Uuid) -> Result<Address, VaultError> {
        let storage = &self.cfg.get_storage();
        let wallet = storage.wallets().get(&id)?;
        match &wallet.accounts.first()
            .expect("Wallet without address")
            .address {
            Some(e) => Ok(e.clone()),
            None => Err(VaultError::IncorrectIdError)
        }
    }

    #[deprecated]
    fn remove_wallet(&self, addr: &Address) {
        let storage = &self.cfg.get_storage();

        let wallet = self.get_wallet_by_addr(addr);
        let wallet = wallet.expect("Account with specified address is not found");

        if wallet.accounts.len() != 1 {
            panic!("Wallet contains multiple addresses, deletion is not implemented");
        }

        storage.wallets().remove(&wallet.id)
            .expect("Previous wallet not removed");
        for acc in wallet.accounts {
            match acc.key {
                PKType::PrivateKeyRef(id) => { storage.keys().remove(&id); },
                PKType::SeedHd(_) => {}
            }
        };
    }

    fn import_pk(&self, pk: Vec<u8>, password: &str, label: Option<String>) -> Uuid {
        let storage = &self.cfg.get_storage();
        let id = storage.create_new()
            .raw_pk(pk, password, self.get_blockchain())
            .expect("PrivateKey not imported");
        id
    }

    pub fn list_accounts(&self) -> Vec<AccountInfo> {
        let storage = &self.cfg.get_storage();
        let wallets = storage.wallets().list().expect("Vault not opened");

        let result = wallets.iter()
            .map(|id| storage.wallets().get(id))
            .map(|w| w.ok())
            .filter(|w| w.is_some())
            .map(|w| w.unwrap())
            .filter(|w|
                //TODO workaround for compatibility, REMOVE IT
                w.accounts.len() == 1 && w.accounts.first().unwrap().blockchain == self.get_blockchain()
            )
            .map(|w| AccountInfo::from(w))
            .collect();

        result
    }

    fn put(&self, pk: &EthereumJsonV3File) -> Uuid {
        let storage = &self.cfg.get_storage();
        let id = storage.create_new().ethereum(pk, self.get_blockchain())
            .expect("Keyfile not saved");
        id
    }

    fn export_pk(&self, wallet_id: Uuid, account_id: usize, password: String) -> PrivateKey {
        let storage = &self.cfg.get_storage();

        let wallet = storage.wallets().get(&wallet_id).expect("Wallet doesn't exit");
        let account = wallet.get_account(account_id).expect("Account doesn't exist");
        account.export_pk(password, storage).expect("PrivateKey unavailable")
    }

    fn export_web3(&self, wallet_id: Uuid, account_id: usize, password: Option<String>) -> EthereumJsonV3File {
        let storage = &self.cfg.get_storage();

        let wallet = storage.wallets().get(&wallet_id).expect("Wallet doesn't exit");
        let account = wallet.get_account(account_id).expect("Account doesn't exist");
        account.export_web3(password, storage).expect("PrivateKey unavailable")
    }
}


impl AsJsObject for AccountData {

    fn as_js_object<'a, C: Context<'a>>(&self, cx: &mut C) -> Handle<'a, JsValue> {
        let account_js = JsObject::new(cx);

        let address_handle = cx.string(&self.address);
        account_js.set(cx, "address", address_handle).unwrap();
        let name_handle = cx.string(&self.name);
        account_js.set(cx, "name", name_handle).unwrap();
        let description_handle = cx.string(&self.description);
        account_js.set(cx, "description", description_handle).unwrap();
        let hidden_handle = cx.boolean(self.hidden);
        account_js.set(cx, "hidden", hidden_handle).unwrap();
        let hardware_handle = cx.boolean(self.hardware);
        account_js.set(cx, "hardware", hardware_handle).unwrap();

        return account_js.as_value(cx)
    }
}


pub fn list(mut cx: FunctionContext) -> JsResult<JsArray> {
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

pub fn import_ethereum(mut cx: FunctionContext) -> JsResult<JsObject> {
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

pub fn import_pk(mut cx: FunctionContext) -> JsResult<JsObject> {
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

pub fn export(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx.argument::<JsString>(1).expect("wallet_id not provided").value();
    let wallet_id = Uuid::from_str(wallet_id.as_str()).expect("Invalid wallet_id");
    let account_id = cx.argument::<JsNumber>(2).expect("account_id not provided").value() as usize;

    let password = match cx.argument_opt(3) {
        None => None,
        Some(v) => if v.is_a::<JsString>() {
            match v.downcast::<JsString>() {
                Ok(v) => Some(v.value()),
                Err(_) => None
            }
        } else {
            None
        }
    };

    let pk = vault.export_web3(wallet_id, account_id, password);
    let result = serde_json::to_string_pretty(&pk).expect("Failed to convert to JSON");
    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn export_pk(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx.argument::<JsString>(1).expect("wallet_id not provided").value();
    let wallet_id = Uuid::from_str(wallet_id.as_str()).expect("Invalid wallet_id");
    let account_id = cx.argument::<JsNumber>(2).expect("account_id not provided").value() as usize;
    let password = cx.argument::<JsString>(3).expect("Password is not provided").value();

    let pk = vault.export_pk(wallet_id, account_id, password);
    let result = format!("0x{}", pk.to_hex());
    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn update(mut cx: FunctionContext) -> JsResult<JsBoolean> {
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

pub fn remove(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let address_str = cx.argument::<JsString>(1).unwrap().value();
    let address = Address::from_str(address_str.as_str()).expect("Invalid address");
    vault.remove_wallet(&address);
    let result = cx.boolean(true);
    Ok(result)
}

pub fn import_mnemonic(mut cx: FunctionContext) -> JsResult<JsObject> {
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