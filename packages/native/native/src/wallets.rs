use std::convert::TryFrom;
use std::str::FromStr;

use neon::prelude::{FunctionContext, JsObject, JsResult, JsString, JsNumber};
use uuid::Uuid;

use access::{VaultConfig, WrappedVault, args_get_str};
use emerald_vault::{convert::{
    json::keyfile::EthereumJsonV3File
}, core::chains::Blockchain, mnemonic::HDPath, storage::error::VaultError, trim_hex, structs::wallet::Wallet, PrivateKey};
use json::StatusResult;
use emerald_vault::structs::wallet::AccountId;

#[derive(Deserialize, Clone)]
pub struct AddAccountJson {
    pub blockchain: u32,
    #[serde(flatten)]
    pub key_value: AddAccountType,
    pub password: Option<String>
}

#[derive(Deserialize, Clone)]
#[serde(tag = "type", content = "key")]
pub enum AddAccountType {
    #[serde(rename = "ethereum-json")]
    EthereumJson(String),
    #[serde(rename = "raw-pk-hex")]
    RawHex(String),
    #[serde(rename = "hd-path")]
    HdPath(SeedAccount),
    #[serde(rename = "generate-random")]
    GenerateRandom
}

#[derive(Deserialize, Clone)]
pub struct SeedAccount {
    #[serde(rename = "seedId")]
    pub seed_id: String,
    #[serde(rename = "hdPath")]
    pub hd_path: String,
    pub password: String,
    pub address: Option<String>
}

#[derive(Serialize, Clone)]
pub struct WalletAccountJson {
    pub id: String,
    pub blockchain: u32,
    pub address: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct WalletJson {
    pub id: String,
    pub name: Option<String>,
    pub accounts: Vec<WalletAccountJson>
}

impl From<Wallet> for WalletJson {
    fn from(wallet: Wallet) -> Self {
        let accounts: Vec<WalletAccountJson> = wallet.accounts.iter()
            .map(|a| WalletAccountJson {
                id: AccountId::from(&wallet, a).to_string(),
                blockchain: a.blockchain as u32,
                address: a.address.map(|v| v.to_string())
            })
            .collect();
        WalletJson {
            id: wallet.id.clone().to_string(),
            name: wallet.label,
            accounts
        }
    }
}

fn read_wallet_id(cx: &mut FunctionContext, pos: i32) -> Uuid {
    let wallet_id = cx.argument::<JsString>(pos).expect("wallet_id is not provided").value();
    let wallet_id = Uuid::parse_str(wallet_id.as_str()).expect("Invalid UUID");
    wallet_id
}

fn read_wallet_and_account_ids(cx: &mut FunctionContext, pos: i32) -> (Uuid, usize) {
    let wallet_id = cx.argument::<JsString>(pos).expect("wallet_id is not provided").value();
    let wallet_id = Uuid::parse_str(wallet_id.as_str()).expect("Invalid UUID");

    let account_id = cx.argument::<JsNumber>(pos + 1).expect("account_id is not provided").value();
    let account_id = account_id as usize;

    (wallet_id, account_id)
}

impl WrappedVault {

    fn create_wallet(&self, label: Option<String>) -> Result<Uuid, VaultError> {
        let storage = &self.cfg.get_storage();
        let id = Uuid::new_v4();
        storage.wallets().add(Wallet {
            id: id.clone(),
            label,
            accounts: vec![]
        }).map(|_| id)
    }

    fn create_account(&self, wallet_id: Uuid, account: AddAccountJson) -> Result<u32, VaultError> {
        let blockchain = Blockchain::try_from(account.blockchain)?;
        let storage = &self.cfg.get_storage();
        let result = match account.key_value {
            AddAccountType::EthereumJson(json) => {
                let json = EthereumJsonV3File::try_from(json)?;
                let id = storage.add_account(wallet_id)
                    .ethereum(&json, blockchain)?;
                id
            },
            AddAccountType::RawHex(hex) => {
                if account.password.is_none() {
                    return panic!("Password is required".to_string())
                }
                let hex = trim_hex(hex.as_str());
                let hex = hex::decode(hex)?;
                storage.add_account(wallet_id)
                    .raw_pk(hex, account.password.unwrap().as_str(), blockchain)?
            },
            AddAccountType::HdPath(hd) => {
                storage.add_account(wallet_id)
                    .seed_hd(Uuid::from_str(hd.seed_id.as_str())?,
                             HDPath::try_from(hd.hd_path.as_str())?,
                             blockchain,
                             Some(hd.password),
                             None)?
            },
            AddAccountType::GenerateRandom => {
                if account.password.is_none() {
                    return panic!("Password is required".to_string())
                }
                let pk = PrivateKey::gen();
                storage.add_account(wallet_id)
                    .raw_pk(pk.0.to_vec(), account.password.unwrap().as_str(), blockchain)?
            }
        };
        Ok(result)
    }

    pub fn update(&self, wallet: Wallet) -> Result<(), VaultError> {
        let storage = &self.cfg.get_storage();
        storage.wallets().update(wallet)?;
        Ok(())
    }

    fn set_title(&self, wallet_id: Uuid, title: Option<String>) -> Result<(), VaultError> {
        let storage = &self.cfg.get_storage();
        let mut wallet = storage.wallets().get(&wallet_id)?;
        wallet.label = title;
        storage.wallets().update(wallet)?;
        Ok(())
    }

    fn remove_account(&self, wallet_id: Uuid, account_id: usize) -> Result<bool, VaultError> {
        let storage = &self.cfg.get_storage();
        let mut wallet = storage.wallets().get(&wallet_id)?;
        let index = wallet.accounts.iter().position(|a| a.id == account_id);
        if index.is_none() {
            return Ok(false)
        }
        wallet.accounts.remove(index.unwrap());
        storage.wallets().update(wallet)
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

    let label = cx.argument::<JsString>(1)
        .ok()
        .map(|x| x.value());
    let id = vault.create_wallet(label).expect("Wallet not created");

    let status = StatusResult::Ok(id.to_string()).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}

pub fn add_account_to_wallet(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id =read_wallet_id(&mut cx, 1);
    let json = cx.argument::<JsString>(2).expect("Input JSON is not provided").value();

    let parsed: AddAccountJson = serde_json::from_str(json.as_str()).expect("Invalid JSON");

    let id = vault.create_account(wallet_id, parsed).expect("Account not created");

    let status = StatusResult::Ok(id).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}

pub fn update_label(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id =read_wallet_id(&mut cx, 1);

    let title = args_get_str(&mut cx, 2);
    let result = vault.set_title(wallet_id, title).is_ok();
    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}

pub fn remove_account(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let (wallet_id, account_id) = read_wallet_and_account_ids(&mut cx, 1);

    let result = vault.remove_account(wallet_id, account_id).expect("Not deleted");
    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}