use std::convert::TryFrom;
use std::path::Path;
use std::str::FromStr;

use neon::handle::Handle;
use neon::object::{Object};
use neon::prelude::{FunctionContext, JsObject, JsString, JsArray, JsNumber};
use neon::types::{JsNull, JsUndefined};

use emerald_vault::{
    blockchain::chains::{Blockchain, EthereumChainId},
    storage::{default_path, vault::VaultStorage},
    structs::wallet::Wallet,
};
use uuid::Uuid;
use emerald_vault::structs::wallet::WalletEntry;
use emerald_vault::storage::error::VaultError;
use neon::context::Context;

#[derive(Clone, Eq, PartialEq, Debug)]
pub struct VaultConfig {
    pub chain: Option<EthereumChainId>,
    pub dir: String,
    pub account_indexes: Vec<AccountIndex>,
}

pub struct MigrationConfig {
    pub dir: String,
}

#[derive(Clone, Eq, PartialEq, Debug, Deserialize)]
pub struct AccountIndex {
    #[serde(rename = "walletId")]
    pub wallet_id: Uuid,
    #[serde(rename = "entryId")]
    pub entry_id: usize,
    pub receive: u32,
    pub change: u32,
}

impl AccountIndex {
    fn from_json(cx: &mut FunctionContext,
                 obj: Handle<JsObject>) -> AccountIndex {
        let wallet_id = obj_get_str(cx, &obj, "walletId")
            .map(|s| Uuid::from_str(s.as_str()).expect("Invalid UUID for walletId"))
            .expect("No walletId field");
        let entry_id = obj_get_number(cx, &obj, "entryId")
            .filter(|v| *v >= 0 && *v < 0x8fffffff)
            .map(|v| v as usize)
            .expect("No entryId field");
        let receive = obj_get_number(cx, &obj, "receive")
            .filter(|v| *v >= 0 && *v < 0x8fffffff)
            .map(|v| v as u32)
            .expect("No receive field");
        let change = obj_get_number(cx, &obj, "change")
            .filter(|v| *v >= 0 && *v < 0x8fffffff)
            .map(|v| v as u32)
            .expect("No change field");
        AccountIndex {
            wallet_id,
            entry_id,
            receive,
            change,
        }
    }
}

pub fn obj_get_str(cx: &mut FunctionContext, obj: &Handle<JsObject>, name: &str) -> Option<String> {
    match obj.get(cx, name) {
        Ok(val) => {
            if val.is_a::<JsNull, _>(cx) {
                None
            } else if val.is_a::<JsUndefined, _>(cx) {
                None
            } else {
                Some(val.downcast::<JsString, _>(cx).expect("Not a string").value(cx))
            }
        }
        Err(_) => None,
    }
}

pub fn obj_get_number(cx: &mut FunctionContext, obj: &Handle<JsObject>, name: &str) -> Option<i64> {
    match obj.get(cx, name) {
        Ok(val) => {
            if val.is_a::<JsNull, _>(cx) {
                None
            } else if val.is_a::<JsUndefined, _>(cx) {
                None
            } else {
                let f = val.downcast::<JsNumber, _>(cx).expect("Not a number").value(cx);
                if f.round() == f {
                    Some(f as i64)
                } else {
                    println!("not round");
                    None
                }
            }
        }
        Err(_) => None,
    }
}

pub fn args_get_str(cx: &mut FunctionContext, pos: i32) -> Option<String> {
    match cx.argument_opt(pos) {
        None => None,
        Some(v) => {
            if v.is_a::<JsString, _>(cx) {
                match v.downcast::<JsString, _>(cx) {
                    Ok(v) => Some(v.value(cx)),
                    Err(_) => None,
                }
            } else {
                None
            }
        }
    }
}

impl VaultConfig {
    pub fn get_config(cx: &mut FunctionContext) -> VaultConfig {
        let config = cx
            .argument::<JsObject>(0)
            .expect("Vault Config is not provided");

        let account_indexes: Vec<AccountIndex> = match config.get(cx, "accountIndexes") {
            Ok(value) => {
                let items: Handle<JsArray> = value.downcast(cx).expect("accountIndexes is not an array");
                items.to_vec(cx).expect("accountIndexes is not a vector").iter()
                    .map(|it| {
                        let val = it.downcast(cx).expect("Not an object");
                        AccountIndex::from_json(cx, val)
                    })
                    .collect()
            },
            _ => vec![]
        };

        let dir = match obj_get_str(cx, &config, "dir") {
            Some(val) => val,
            None => default_path()
                .to_str()
                .expect("No default path for current OS")
                .to_string(),
        };

        let chain = match obj_get_str(cx, &config, "chain") {
            Some(chain) => Some(EthereumChainId::from_str(chain.as_str()).expect("Invalid chain")),
            None => None,
        };

        return VaultConfig {
            chain,
            dir: dir.to_string(),
            account_indexes,
        };
    }

    pub fn get_storage(&self) -> VaultStorage {
        let dir = Path::new(&self.dir);
        let vault = VaultStorage::create(dir).expect("Vault is not created");
        vault
    }
}

impl MigrationConfig {
    pub fn get_config(cx: &mut FunctionContext) -> MigrationConfig {
        let config = cx
            .argument::<JsObject>(0)
            .expect("Vault Config is not provided");
        let dir = match obj_get_str(cx, &config, "dir") {
            Some(val) => val,
            None => default_path()
                .to_str()
                .expect("No default path for current OS")
                .to_string(),
        };
        return MigrationConfig {
            dir: dir.to_string(),
        };
    }
}

pub struct WrappedVault {
    pub cfg: VaultConfig,
}

impl WrappedVault {
    pub fn new(cfg: VaultConfig) -> WrappedVault {
        WrappedVault { cfg }
    }

    pub fn get_blockchain(&self) -> Blockchain {
        Blockchain::try_from(self.cfg.chain.unwrap()).expect("Unsupported chain")
    }

    pub fn load_wallets(&self) -> Vec<Wallet> {
        let storage = &self.cfg.get_storage();
        let wallets: Vec<Wallet> = storage
            .wallets()
            .list()
            .expect("Wallets are not loaded")
            .iter()
            .map(|id| storage.wallets().get(*id))
            .map(|w| w.ok())
            .filter(|w| w.is_some())
            .map(|w| w.unwrap())
            .collect();
        wallets
    }

    pub fn get_entry(&self, wallet_id: Uuid, entry_id: usize) -> Result<WalletEntry, VaultError> {
        let storage = &self.cfg.get_storage();
        let wallet = storage
            .wallets()
            .get(wallet_id)?;
        wallet.get_entry(entry_id)
    }
}
