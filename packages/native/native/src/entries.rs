use std::convert::TryFrom;
use std::str::FromStr;

use neon::prelude::*;
use uuid::Uuid;

use access::{args_get_str, VaultConfig, WrappedVault};
use emerald_vault::{
    convert::json::keyfile::EthereumJsonV3File, storage::error::VaultError, EthereumAddress,
    EthereumPrivateKey,
};
use json::StatusResult;
use emerald_vault::structs::book::AddressRef;
use wallets::CurrentAddressJson;
use emerald_vault::structs::wallet::{AddressRole};
use emerald_vault::chains::BlockchainType;
use bitcoin::Address;

#[derive(Deserialize)]
pub struct UpdateAccount {
    #[serde(default)]
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct ImportPrivateKey {
    pub pk: String,
    pub password: String,
    pub name: Option<String>,
    pub description: Option<String>,
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
    fn list_entry_addresses(&self, wallet_id: Uuid, entry_id: usize, role: String, start: usize, limit: usize)
                            -> Result<Vec<CurrentAddressJson>, VaultError> {
        let storage = &self.cfg.get_storage();
        let wallet = storage.wallets().get(wallet_id)?;
        let entry = wallet.get_entry(entry_id)?;
        let role = AddressRole::from_str(role.as_str())?;

        let addresses = match entry.blockchain.get_type() {
            BlockchainType::Bitcoin => entry.get_addresses::<Address>(role, start as u32, limit as u32)?
                .iter()
                .map(|a| CurrentAddressJson::from(a))
                .collect(),
            BlockchainType::Ethereum => entry.get_addresses::<EthereumAddress>(role, start as u32, limit as u32)?.
                iter()
                .map(|a| CurrentAddressJson::from(a))
                .collect()
        };

        Ok(addresses)
    }

    fn set_label(&self, wallet_id: Uuid, entry_id: usize, label: Option<String>) -> bool {
        let storage = &self.cfg.get_storage();
        let result = storage.update_entry(wallet_id, entry_id).set_label(label);
        result.is_ok()
    }

    fn set_receive_disabled(
        &self,
        wallet_id: Uuid,
        entry_id: usize,
        receive_disabled: bool,
    ) -> bool {
        let storage = &self.cfg.get_storage();
        let result = storage
            .update_entry(wallet_id, entry_id)
            .set_receive_disabled(receive_disabled);
        result.is_ok()
    }

    fn get_wallet_address(&self, id: Uuid) -> Result<EthereumAddress, VaultError> {
        let storage = &self.cfg.get_storage();
        let wallet = storage.wallets().get(id)?;
        match &wallet
            .entries
            .first()
            .expect("Wallet without address")
            .address
        {
            Some(e) => match e {
                AddressRef::EthereumAddress(address) => Ok(address.clone()),
                _ => Err(VaultError::UnsupportedDataError("No ethereum".to_string()))
            },
            None => Err(VaultError::IncorrectIdError),
        }
    }

    fn put(&self, pk: &EthereumJsonV3File) -> Uuid {
        let storage = &self.cfg.get_storage();
        let id = storage
            .create_new()
            .ethereum(pk, self.get_blockchain())
            .expect("Keyfile not saved");
        id
    }

    fn export_pk(&self, wallet_id: Uuid, entry_id: usize, password: String) -> EthereumPrivateKey {
        let storage = &self.cfg.get_storage();

        let wallet = storage
            .wallets()
            .get(wallet_id)
            .expect("Wallet doesn't exit");
        let account = wallet.get_entry(entry_id).expect("Entry doesn't exist");
        account
            .export_ethereum_pk(password, storage)
            .expect("PrivateKey unavailable")
    }

    fn export_web3(
        &self,
        wallet_id: Uuid,
        entry_id: usize,
        password: Option<String>,
    ) -> EthereumJsonV3File {
        let storage = &self.cfg.get_storage();

        let wallet = storage
            .wallets()
            .get(wallet_id)
            .expect("Wallet doesn't exit");
        let account = wallet.get_entry(entry_id).expect("Account doesn't exist");
        account
            .export_ethereum_web3(password, storage)
            .expect("PrivateKey unavailable")
    }
}

pub fn import_ethereum(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let raw = cx
        .argument::<JsString>(1)
        .expect("Input JSON is not provided")
        .value();
    let pk = EthereumJsonV3File::try_from(raw).expect("Invalid JSON");
    let id = vault.put(&pk);
    let address = vault
        .get_wallet_address(id)
        .expect("Address not initialized");

    let result = JsObject::new(&mut cx);
    let id_handle = cx.string(id.to_string());
    result
        .set(&mut cx, "id", id_handle)
        .expect("Failed to set id");
    let addr_handle = cx.string(address.to_string());
    result
        .set(&mut cx, "address", addr_handle)
        .expect("Failed to set address");

    Ok(result)
}

pub fn export(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .expect("wallet_id not provided")
        .value();
    let wallet_id = Uuid::from_str(wallet_id.as_str()).expect("Invalid wallet_id");
    let entry_id = cx
        .argument::<JsNumber>(2)
        .expect("entry_id not provided")
        .value() as usize;

    let password = args_get_str(&mut cx, 3);

    let pk = vault.export_web3(wallet_id, entry_id, password);
    let result = serde_json::to_string_pretty(&pk).expect("Failed to convert to JSON");
    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn export_pk(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .expect("wallet_id not provided")
        .value();
    let wallet_id = Uuid::from_str(wallet_id.as_str()).expect("Invalid wallet_id");
    let entry_id = cx
        .argument::<JsNumber>(2)
        .expect("entry_id not provided")
        .value() as usize;
    let password = cx
        .argument::<JsString>(3)
        .expect("Password is not provided")
        .value();

    let pk = vault.export_pk(wallet_id, entry_id, password);
    let result = format!("0x{}", hex::encode(pk.0));
    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn update_label(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .expect("wallet_id not provided")
        .value();
    let wallet_id = Uuid::from_str(wallet_id.as_str()).expect("Invalid wallet_id");
    let entry_id = cx
        .argument::<JsNumber>(2)
        .expect("entry_id not provided")
        .value() as usize;
    let label = args_get_str(&mut cx, 3);

    let result = vault.set_label(wallet_id, entry_id, label);

    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn update_receive_disabled(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .expect("wallet_id not provided")
        .value();
    let wallet_id = Uuid::from_str(wallet_id.as_str()).expect("Invalid wallet_id");
    let entry_id = cx
        .argument::<JsNumber>(2)
        .expect("entry_id not provided")
        .value() as usize;
    let disabled = cx
        .argument::<JsBoolean>(3)
        .expect("receive_disabled not provided")
        .value();

    let result = vault.set_receive_disabled(wallet_id, entry_id, disabled);

    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn list_addresses(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .expect("wallet_id not provided")
        .value();
    let wallet_id = Uuid::from_str(wallet_id.as_str()).expect("Invalid wallet_id");
    let entry_id = cx
        .argument::<JsNumber>(2)
        .expect("entry_id not provided")
        .value() as usize;
    let role = args_get_str(&mut cx, 3).expect("address_role not provided");
    let start = cx
        .argument::<JsNumber>(4)
        .expect("entry_id not provided")
        .value() as usize;
    let limit = cx
        .argument::<JsNumber>(5)
        .expect("entry_id not provided")
        .value() as usize;

    let result = vault.list_entry_addresses(wallet_id, entry_id, role, start, limit)
        .expect("failed to get addresses");

    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}
