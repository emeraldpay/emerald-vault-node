use std::convert::TryFrom;
use std::str::FromStr;

use neon::prelude::*;
use uuid::Uuid;

use access::{args_get_str, VaultConfig, WrappedVault};
use emerald_vault::{
    convert::json::keyfile::EthereumJsonV3File, storage::error::VaultError, EthereumAddress,
    EthereumPrivateKey,
};
use emerald_vault::structs::book::AddressRef;
use wallets::CurrentAddressJson;
use emerald_vault::structs::wallet::{AddressRole};
use emerald_vault::chains::BlockchainType;
use bitcoin::Address;
use errors::VaultNodeError;

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

#[derive(Serialize, Clone)]
pub struct ExportedWeb3Json {
    pub password: String,
    pub json: String,
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
            .ok_or(VaultError::DataNotFound)?
            .address
        {
            Some(e) => match e {
                AddressRef::EthereumAddress(address) => Ok(address.clone()),
                _ => Err(VaultError::UnsupportedDataError("No ethereum".to_string()))
            },
            None => Err(VaultError::IncorrectIdError),
        }
    }

    fn put(&self, pk: &EthereumJsonV3File, json_password: String, global_password: String) -> Result<Uuid, VaultNodeError> {
        let storage = &self.cfg.get_storage();
        let id = storage
            .create_new()
            .ethereum(pk, json_password.as_str(), self.get_blockchain()?, global_password.as_str())
            .map_err(|_| VaultNodeError::VaultError("Keyfile not saved".to_string()))?;
        Ok(id)
    }

    fn export_pk(&self, wallet_id: Uuid, entry_id: usize, password: String) -> Result<EthereumPrivateKey, VaultNodeError> {
        let storage = &self.cfg.get_storage();

        let wallet = storage
            .wallets()
            .get(wallet_id)
            .map_err(|_| VaultNodeError::MissingData(format!("Wallet {}", wallet_id)))?;
        let account = wallet.get_entry(entry_id)
            .map_err(|_| VaultNodeError::MissingData(format!("Entry {} on wallet {}", entry_id, wallet_id)))?;
        account
            .export_ethereum_pk(password, storage)
            .map_err(|_| VaultNodeError::VaultError("Private Kye Unavailable".to_string()))
    }

    fn export_web3(
        &self,
        wallet_id: Uuid,
        entry_id: usize,
        password: Option<String>,
    ) -> Result<(String, EthereumJsonV3File), VaultNodeError> {
        let storage = &self.cfg.get_storage();

        let wallet = storage
            .wallets()
            .get(wallet_id)
            .map_err(|_| VaultNodeError::MissingData(format!("Wallet {}", wallet_id)))?;
        let account = wallet.get_entry(entry_id)
            .map_err(|_| VaultNodeError::MissingData(format!("Entry {} on wallet {}", entry_id, wallet_id)))?;
        let password = password.ok_or(VaultNodeError::OtherProcessing("Password is not provided".to_string()))?;
        account
            .export_ethereum_web3(password.as_str(), storage)
            .map_err(|_| VaultNodeError::VaultError("Private Kye Unavailable".to_string()))
    }
}

#[neon_frame_fn]
pub fn export(cx: &mut FunctionContext) -> Result<String, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(1))?;
    let entry_id = cx
        .argument::<JsNumber>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "entry_id".to_string()))?
        .value(cx) as usize;

    let password = args_get_str(cx, 3);

    let pk = vault.export_web3(wallet_id, entry_id, password)?;

    let result_json = serde_json::to_string_pretty(&pk.1)
        .map_err(|_| VaultNodeError::OtherProcessing("Failed to convert to JSON".to_string()))?;
    let result = ExportedWeb3Json {
        password: pk.0,
        json: result_json,
    };
    // we export result as a string, not as an object, because that's how it expected to be user/saved/etc
    let result = serde_json::to_string(&result)
        .map_err(|_| VaultNodeError::OtherProcessing("Failed to convert to JSON".to_string()))?;
    Ok(result)
}

#[neon_frame_fn]
pub fn export_pk(cx: &mut FunctionContext) -> Result<String, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(1))?;
    let entry_id = cx
        .argument::<JsNumber>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "entry_id".to_string()))?
        .value(cx) as usize;
    let password = cx
        .argument::<JsString>(3)
        .map_err(|_| VaultNodeError::ArgumentMissing(3, "password".to_string()))?
        .value(cx);

    let pk = vault.export_pk(wallet_id, entry_id, password)?;
    let result = format!("0x{}", hex::encode(pk.0));
    Ok(result)
}

#[neon_frame_fn]
pub fn update_label(cx: &mut FunctionContext) -> Result<bool, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(1))?;
    let entry_id = cx
        .argument::<JsNumber>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "entry_id".to_string()))?
        .value(cx) as usize;
    let label = args_get_str(cx, 3);

    let result = vault.set_label(wallet_id, entry_id, label);
    Ok(result)
}

#[neon_frame_fn]
pub fn update_receive_disabled(cx: &mut FunctionContext) -> Result<bool, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(1))?;
    let entry_id = cx
        .argument::<JsNumber>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "entry_id".to_string()))?
        .value(cx) as usize;
    let disabled = cx
        .argument::<JsBoolean>(3)
        .map_err(|_| VaultNodeError::ArgumentMissing(3, "is_disabled".to_string()))?
        .value(cx);

    let result = vault.set_receive_disabled(wallet_id, entry_id, disabled);
    Ok(result)
}

#[neon_frame_fn]
pub fn list_addresses(cx: &mut FunctionContext) -> Result<Vec<CurrentAddressJson>, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(1))?;
    let entry_id = cx
        .argument::<JsNumber>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "entry_id".to_string()))?
        .value(cx) as usize;
    let role = args_get_str(cx, 3)
        .ok_or(VaultNodeError::ArgumentMissing(2, "address_role".to_string()))?;

    let start = cx
        .argument::<JsNumber>(4)
        .map_err(|_| VaultNodeError::ArgumentMissing(4, "start".to_string()))?
        .value(cx) as usize;
    let limit = cx
        .argument::<JsNumber>(5)
        .map_err(|_| VaultNodeError::ArgumentMissing(5, "limit".to_string()))?
        .value(cx) as usize;

    let result = vault.list_entry_addresses(wallet_id, entry_id, role, start, limit)?;
    Ok(result)
}
