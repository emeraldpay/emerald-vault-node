use std::str::FromStr;

use neon::prelude::*;
use uuid::Uuid;

use access::{args_get_str};
use emerald_vault::{
    convert::json::keyfile::EthereumJsonV3File, error::VaultError, EthereumAddress,
    EthereumPrivateKey,
};
use wallets::CurrentAddressJson;
use emerald_vault::structs::wallet::{AddressRole};
use emerald_vault::chains::BlockchainType;
use bitcoin::Address;
use errors::VaultNodeError;
use instance::{Instance, WrappedVault};

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

fn export_internal(vault: &WrappedVault, wallet_id: Uuid, entry_id: usize, password: Option<String>) -> Result<String, VaultNodeError> {
    let pk = vault.export_web3(wallet_id, entry_id, password)?;

    let result_json = serde_json::to_string_pretty(&pk.1)
        .map_err(|_| VaultNodeError::OtherProcessing("Failed to convert to JSON".to_string()))?;
    let result = ExportedWeb3Json {
        password: pk.0,
        json: result_json,
    };
    // we export result as a string, not as an object, because that's how it expected to be user/saved/etc
    serde_json::to_string(&result)
        .map_err(|_| VaultNodeError::OtherProcessing("Failed to convert to JSON".to_string()))
}

#[neon_frame_fn(channel=3)]
pub fn export<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<String, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;

    let wallet_id = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(1))?;
    let entry_id = cx
        .argument::<JsNumber>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "entry_id".to_string()))?
        .value(cx) as usize;

    let password = args_get_str(cx, 2);

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();

        handler(export_internal(&vault, wallet_id, entry_id, password));
    });

    Ok(())
}

fn export_pk_internal(vault: &WrappedVault, wallet_id: Uuid, entry_id: usize, password: String) -> Result<String, VaultNodeError> {
    let pk = vault.export_pk(wallet_id, entry_id, password)?;
    let result = format!("0x{}", hex::encode(pk.0));
    Ok(result)
}

#[neon_frame_fn(channel=3)]
pub fn export_pk<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<String, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;

    let wallet_id = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(1))?;
    let entry_id = cx
        .argument::<JsNumber>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "entry_id".to_string()))?
        .value(cx) as usize;
    let password = cx
        .argument::<JsString>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "password".to_string()))?
        .value(cx);

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();

        handler(export_pk_internal(&vault, wallet_id, entry_id, password));
    });

    Ok(())
}

#[neon_frame_fn(channel=3)]
pub fn update_label<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<bool, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;

    let wallet_id = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(0))?;
    let entry_id = cx
        .argument::<JsNumber>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "entry_id".to_string()))?
        .value(cx) as usize;
    let label = args_get_str(cx, 2);

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let result = vault.set_label(wallet_id, entry_id, label);

        handler(Ok(result));
    });

    Ok(())
}

#[neon_frame_fn(channel=3)]
pub fn update_receive_disabled<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<bool, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;

    let wallet_id = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(0))?;
    let entry_id = cx
        .argument::<JsNumber>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "entry_id".to_string()))?
        .value(cx) as usize;
    let disabled = cx
        .argument::<JsBoolean>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "is_disabled".to_string()))?
        .value(cx);

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let result = vault.set_receive_disabled(wallet_id, entry_id, disabled);

        handler(Ok(result));
    });

    Ok(())
}

#[neon_frame_fn(channel=5)]
pub fn list_addresses<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<Vec<CurrentAddressJson>, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;

    let wallet_id = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(0))?;
    let entry_id = cx
        .argument::<JsNumber>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "entry_id".to_string()))?
        .value(cx) as usize;
    let role = args_get_str(cx, 2)
        .ok_or(VaultNodeError::ArgumentMissing(2, "address_role".to_string()))?;

    let start = cx
        .argument::<JsNumber>(3)
        .map_err(|_| VaultNodeError::ArgumentMissing(3, "start".to_string()))?
        .value(cx) as usize;
    let limit = cx
        .argument::<JsNumber>(4)
        .map_err(|_| VaultNodeError::ArgumentMissing(4, "limit".to_string()))?
        .value(cx) as usize;


    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let result = vault
            .list_entry_addresses(wallet_id, entry_id, role, start, limit)
            .map_err(|e| VaultNodeError::from(e));

        handler(result);
    });

    Ok(())
}
