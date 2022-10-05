use std::path::Path;
use std::str::FromStr;

use neon::handle::Handle;
use neon::object::{Object};
use neon::prelude::{FunctionContext, JsObject, JsString, JsArray, JsNumber};
use neon::types::{JsNull, JsUndefined};

use emerald_vault::{
    blockchain::chains::{EthereumChainId},
    storage::{default_path, vault::VaultStorage},
    structs::wallet::Wallet,
};
use uuid::Uuid;
use emerald_vault::structs::wallet::WalletEntry;
use emerald_vault::error::VaultError;
use errors::{JsonError, VaultNodeError};

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
                 obj: Handle<JsObject>) -> Result<AccountIndex, VaultNodeError> {
        let wallet_id = obj_get_str(cx, &obj, "walletId")
            .ok_or(VaultNodeError::JsonError(JsonError::MissingField("walletId".to_string())))?
            .parse::<Uuid>().map_err(|_| VaultNodeError::JsonError(JsonError::InvalidValue("walletId".to_string())))?;
        let entry_id = obj_get_number(cx, &obj, "entryId")
            .filter(|v| *v >= 0 && *v < 0x8fffffff)
            .map(|v| v as usize)
            .ok_or(VaultNodeError::JsonError(JsonError::MissingField("entryId".to_string())))?;
        let receive = obj_get_number(cx, &obj, "receive")
            .filter(|v| *v >= 0 && *v < 0x8fffffff)
            .map(|v| v as u32)
            .ok_or(VaultNodeError::JsonError(JsonError::MissingField("receive".to_string())))?;
        let change = obj_get_number(cx, &obj, "change")
            .filter(|v| *v >= 0 && *v < 0x8fffffff)
            .map(|v| v as u32)
            .ok_or(VaultNodeError::JsonError(JsonError::MissingField("change".to_string())))?;
        Ok(AccountIndex {
            wallet_id,
            entry_id,
            receive,
            change,
        })
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
    pub fn get_config(cx: &mut FunctionContext) -> Result<VaultConfig, VaultNodeError> {
        let config = cx
            .argument::<JsObject>(0)
            .map_err(|_| VaultNodeError::ArgumentMissing(0, "config".to_string()))?;

        let mut account_indexes: Vec<AccountIndex> = vec![];
        match config.get(cx, "accountIndexes") {
            Ok(value) => {
                let items: Handle<JsArray> = value.downcast(cx)
                    .map_err(|_| VaultNodeError::JsonError(JsonError::InvalidValue("accountIndexes".to_string())))?;
                let items_js = items.to_vec(cx)
                    .map_err(|_| VaultNodeError::JsonError(JsonError::InvalidValue("accountIndexes".to_string())))?;
                for item in items_js {
                    let val = item.downcast(cx)
                        .map_err(|_| VaultNodeError::JsonError(JsonError::InvalidValue("accountIndexes[]".to_string())))?;
                    account_indexes.push(AccountIndex::from_json(cx, val)?)
                }
            },
            _ => { }
        };

        let dir = match obj_get_str(cx, &config, "dir") {
            Some(val) => val,
            None => default_path()
                .to_str()
                .ok_or(VaultNodeError::VaultError("No default path for current OS".to_string()))?
                .to_string(),
        };

        let chain = match obj_get_str(cx, &config, "chain") {
            Some(chain) => Some(
                EthereumChainId::from_str(chain.as_str())
                    .map_err(|_| VaultNodeError::JsonError(JsonError::InvalidValue("chain".to_string())))?
            ),
            None => None,
        };

        return Ok(VaultConfig {
            chain,
            dir: dir.to_string(),
            account_indexes,
        });
    }

    pub fn get_storage(&self) -> VaultStorage {
        let dir = Path::new(&self.dir);
        let vault = VaultStorage::create(dir).expect("Vault is not created");
        vault
    }
}

impl MigrationConfig {
    pub fn get_config(cx: &mut FunctionContext) -> Result<MigrationConfig, VaultNodeError> {
        let config = cx
            .argument::<JsObject>(0)
            .map_err(|_| VaultNodeError::ArgumentMissing(0, "config".to_string()))?;
        let dir = match obj_get_str(cx, &config, "dir") {
            Some(val) => val,
            None => default_path()
                .to_str()
                .ok_or(VaultNodeError::VaultError("No default path for current OS".to_string()))?
                .to_string(),
        };
        return Ok(MigrationConfig {
            dir: dir.to_string(),
        });
    }
}

pub struct WrappedVault {
    pub cfg: VaultConfig,
}

impl WrappedVault {
    pub fn new(cfg: VaultConfig) -> WrappedVault {
        WrappedVault { cfg }
    }

    pub fn load_wallets(&self) -> Result<Vec<Wallet>, VaultNodeError> {
        let storage = &self.cfg.get_storage();
        let wallets: Vec<Wallet> = storage
            .wallets()
            .list()
            .map_err(|_| VaultNodeError::VaultError("Wallets are not loaded".to_string()))?
            .iter()
            .map(|id| storage.wallets().get(*id))
            .map(|w| w.ok())
            .filter(|w| w.is_some())
            .map(|w| w.unwrap())
            .collect();
        Ok(wallets)
    }

    pub fn get_entry(&self, wallet_id: Uuid, entry_id: usize) -> Result<WalletEntry, VaultError> {
        let storage = &self.cfg.get_storage();
        let wallet = storage
            .wallets()
            .get(wallet_id)?;
        wallet.get_entry(entry_id)
    }
}
