use std::convert::TryFrom;
use std::str::FromStr;

use neon::prelude::{FunctionContext, JsObject, JsResult, JsString, JsNumber};
use uuid::Uuid;

use access::{VaultConfig, WrappedVault, args_get_str};
use emerald_vault::{convert::{
    json::keyfile::EthereumJsonV3File
}, core::chains::Blockchain, mnemonic::HDPath, storage::error::VaultError, trim_hex, structs::wallet::Wallet, PrivateKey};
use json::StatusResult;
use emerald_vault::structs::wallet::{EntryId, ReservedPath};

#[derive(Deserialize, Clone)]
pub struct AddEntryJson {
    pub blockchain: u32,
    #[serde(flatten)]
    pub key_value: AddEntryType,
    pub password: Option<String>,
}

#[derive(Deserialize, Clone)]
#[serde(tag = "type", content = "key")]
pub enum AddEntryType {
    #[serde(rename = "ethereum-json")]
    EthereumJson(String),
    #[serde(rename = "raw-pk-hex")]
    RawHex(String),
    #[serde(rename = "hd-path")]
    HdPath(SeedEntry),
    #[serde(rename = "generate-random")]
    GenerateRandom,
}

#[derive(Deserialize, Clone)]
pub struct SeedEntry {
    #[serde(rename = "seedId")]
    pub seed_id: String,
    #[serde(rename = "hdPath")]
    pub hd_path: String,
    pub password: String,
    pub address: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct WalletEntryJson {
    pub id: String,
    pub blockchain: u32,
    pub address: Option<String>,
    #[serde(rename = "receiveDisabled")]
    pub receive_disabled: bool,
}

#[derive(Serialize, Clone)]
pub struct WalletJson {
    pub id: String,
    pub name: Option<String>,
    pub entries: Vec<WalletEntryJson>,
    pub reserved: Vec<ReservedAccountJson>,
}

#[derive(Deserialize, Clone)]
pub struct AddWalletJson {
    pub name: Option<String>,
    pub reserved: Option<Vec<ReservedAccountJson>>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct ReservedAccountJson {
    #[serde(rename = "seedId")]
    pub seed_id: Uuid,
    #[serde(rename = "accountId")]
    pub account_id: u32,
}

impl From<ReservedPath> for ReservedAccountJson {
    fn from(rp: ReservedPath) -> Self {
        ReservedAccountJson {
            seed_id: rp.seed_id,
            account_id: rp.account_id,
        }
    }
}

impl From<ReservedAccountJson> for ReservedPath {
    fn from(value: ReservedAccountJson) -> Self {
        ReservedPath {
            seed_id: value.seed_id,
            account_id: value.account_id,
        }
    }
}

impl From<Wallet> for WalletJson {
    fn from(wallet: Wallet) -> Self {
        let entries: Vec<WalletEntryJson> = wallet.entries.iter()
            .map(|a| WalletEntryJson {
                id: EntryId::from(&wallet, a).to_string(),
                blockchain: a.blockchain as u32,
                address: a.address.map(|v| v.to_string()),
                receive_disabled: a.receive_disabled,
            })
            .collect();
        let reserved: Vec<ReservedAccountJson> = wallet.reserved.iter()
            .map(|x| ReservedAccountJson::from(x.clone()))
            .collect();
        WalletJson {
            id: wallet.id.clone().to_string(),
            name: wallet.label,
            entries,
            reserved,
        }
    }
}

fn read_wallet_id(cx: &mut FunctionContext, pos: i32) -> Uuid {
    let wallet_id = cx.argument::<JsString>(pos).expect("wallet_id is not provided").value();
    let wallet_id = Uuid::parse_str(wallet_id.as_str()).expect("Invalid UUID");
    wallet_id
}

fn read_wallet_and_entry_ids(cx: &mut FunctionContext, pos: i32) -> (Uuid, usize) {
    let wallet_id = cx.argument::<JsString>(pos).expect("wallet_id is not provided").value();
    let wallet_id = Uuid::parse_str(wallet_id.as_str()).expect("Invalid UUID");

    let entry_id = cx.argument::<JsNumber>(pos + 1).expect("entry_id is not provided").value();
    let entry_id = entry_id as usize;

    (wallet_id, entry_id)
}

impl WrappedVault {
    fn create_wallet(&self, options: AddWalletJson) -> Result<Uuid, VaultError> {
        let storage = &self.cfg.get_storage();
        let id = Uuid::new_v4();
        let reserved = options.reserved
            .unwrap_or(Vec::new())
            .iter()
            .map(|r| ReservedPath::from(r.clone()))
            .collect();
        storage.wallets().add(Wallet {
            id: id.clone(),
            label: options.name,
            reserved,
            ..Wallet::default()
        }).map(|_| id)
    }

    fn create_entry(&self, wallet_id: Uuid, entry: AddEntryJson) -> Result<usize, VaultError> {
        let blockchain = Blockchain::try_from(entry.blockchain)?;
        let storage = &self.cfg.get_storage();
        let result = match entry.key_value {
            AddEntryType::EthereumJson(json) => {
                let json = EthereumJsonV3File::try_from(json)?;
                let id = storage.add_entry(wallet_id)
                    .ethereum(&json, blockchain)?;
                id
            },
            AddEntryType::RawHex(hex) => {
                if entry.password.is_none() {
                    panic!("Password is required".to_string())
                }
                let hex = trim_hex(hex.as_str());
                let hex = hex::decode(hex)?;
                storage.add_entry(wallet_id)
                    .raw_pk(hex, entry.password.unwrap().as_str(), blockchain)?
            },
            AddEntryType::HdPath(hd) => {
                storage.add_entry(wallet_id)
                    .seed_hd(Uuid::from_str(hd.seed_id.as_str())?,
                             HDPath::try_from(hd.hd_path.as_str())?,
                             blockchain,
                             Some(hd.password),
                             None)?
            },
            AddEntryType::GenerateRandom => {
                if entry.password.is_none() {
                    panic!("Password is required".to_string())
                }
                let pk = PrivateKey::gen();
                storage.add_entry(wallet_id)
                    .raw_pk(pk.0.to_vec(), entry.password.unwrap().as_str(), blockchain)?
            }
        };
        Ok(result)
    }

    fn set_title(&self, wallet_id: Uuid, title: Option<String>) -> Result<(), VaultError> {
        let storage = &self.cfg.get_storage();
        let mut wallet = storage.wallets().get(wallet_id)?;
        wallet.label = title;
        storage.wallets().update(wallet)?;
        Ok(())
    }

    fn remove_entry(&self, wallet_id: Uuid, entry_id: usize) -> Result<bool, VaultError> {
        let storage = &self.cfg.get_storage();
        let mut wallet = storage.wallets().get(wallet_id)?;
        let index = wallet.entries.iter().position(|a| a.id == entry_id);
        if index.is_none() {
            return Ok(false)
        }
        wallet.entries.remove(index.unwrap());
        storage.wallets().update(wallet)
    }

    fn remove(&self, wallet_id: Uuid) -> Result<bool, VaultError> {
        let storage = &self.cfg.get_storage();
        storage.remove_wallet(wallet_id)
    }
}

pub fn list(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);
    let wallets = vault.load_wallets();

    let mut result = Vec::new();
    for w in wallets {
        result.push(WalletJson::from(w));
    }

    let status = StatusResult::Ok(result).as_json();

    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}

pub fn add(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let json = cx.argument::<JsString>(1).expect("Input JSON with options is not provided").value();
    let parsed: AddWalletJson = serde_json::from_str(json.as_str()).expect("Invalid JSON with options");

    let id = vault.create_wallet(parsed).expect("Wallet not created");

    let status = StatusResult::Ok(id.to_string()).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}

pub fn add_entry_to_wallet(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = read_wallet_id(&mut cx, 1);
    let json = cx.argument::<JsString>(2).expect("Input JSON is not provided").value();

    let parsed: AddEntryJson = serde_json::from_str(json.as_str()).expect("Invalid JSON");

    let id = vault.create_entry(wallet_id, parsed).expect("Entry not created");

    let status = StatusResult::Ok(id).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}

pub fn update_label(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = read_wallet_id(&mut cx, 1);

    let title = args_get_str(&mut cx, 2);
    let result = vault.set_title(wallet_id, title).is_ok();
    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}

pub fn remove_entry(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let (wallet_id, entry_id) = read_wallet_and_entry_ids(&mut cx, 1);

    let result = vault.remove_entry(wallet_id, entry_id).expect("Not deleted");
    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}

pub fn remove(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = read_wallet_id(&mut cx, 1);
    let result = vault.remove(wallet_id).expect("Not deleted");

    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}