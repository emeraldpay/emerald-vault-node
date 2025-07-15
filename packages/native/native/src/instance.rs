use std::path::{Path};
use std::str::FromStr;
use std::sync::{Arc, Mutex, RwLock};
use lazy_static::lazy_static;
use neon::prelude::*;
use uuid::Uuid;
use crate::access::{obj_get_number, obj_get_str};
use emerald_vault::chains::EthereumChainId;
use emerald_vault::error::VaultError;
use emerald_vault::storage::default_path;
use emerald_vault::storage::vault::VaultStorage;
use emerald_vault::structs::wallet::{Wallet, WalletEntry};
use crate::errors::{JsonError, VaultNodeError};


#[derive(Clone, Eq, PartialEq, Debug)]
pub struct VaultConfig {
  pub chain: Option<EthereumChainId>,
  pub dir: String,
  pub account_indexes: Vec<AccountIndex>,
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

impl VaultConfig {

  fn get_account_indexes(cx: &mut FunctionContext, arg: NeonResult<Handle<JsValue>>) -> Result<Vec<AccountIndex>, VaultNodeError> {
    let mut account_indexes: Vec<AccountIndex> = vec![];
    match arg {
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
    Ok(account_indexes)
  }

  fn get_config(cx: &mut FunctionContext) -> Result<VaultConfig, VaultNodeError> {
    let config = cx
        .argument::<JsObject>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "config".to_string()))?;

    let value: NeonResult<Handle<JsValue>> = config.get(cx, "accountIndexes");
    let account_indexes: Vec<AccountIndex> = VaultConfig::get_account_indexes(cx, value)?;

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

enum VaultRef {
  UNINITIALIZED,
  INITIALIZED(Arc<Mutex<WrappedVault>>),
}

impl VaultRef {
  fn is_ready(&self) -> bool {
    match self {
      VaultRef::INITIALIZED(_) => true,
      _ => false
    }
  }

  fn expect(&self) -> Arc<Mutex<WrappedVault>> {
    match self {
      VaultRef::INITIALIZED(r) => r.clone(),
      _ => panic!("Not ready")
    }
  }
}

pub(crate) struct Instance {}

lazy_static! {
    static ref CURRENT: RwLock<Arc<VaultRef>> = RwLock::new(Arc::new(VaultRef::UNINITIALIZED));
}

impl Instance {
  fn init(config: VaultConfig) -> Result<(), VaultNodeError> {
    let current = CURRENT.read().unwrap().clone();
    if current.is_ready() {
      return Err(VaultNodeError::Misconfigured)
    }
    let vault = WrappedVault::new(config);
    let mut w = CURRENT.write().unwrap();
    *w = Arc::new(VaultRef::INITIALIZED(Arc::new(Mutex::new(vault))));
    Ok(())
  }

  fn close() -> Result<(), VaultNodeError> {
    let mut w = CURRENT.write().unwrap();
    *w = Arc::new(VaultRef::UNINITIALIZED);
    Ok(())
  }


  pub(crate) fn get_vault() -> Result<Arc<Mutex<WrappedVault>>, VaultNodeError> {
    let current = CURRENT.read().unwrap().clone();
    if !current.is_ready() {
      return Err(VaultNodeError::Misconfigured)
    }
    let storage = current.clone().expect();
    Ok(storage)
  }
}


// ------
// NAPI functions
// ------

#[neon_frame_fn]
pub fn open(cx: &mut FunctionContext) -> Result<bool, VaultNodeError> {
  let cfg = VaultConfig::get_config(cx)?;

  Instance::init(cfg)
    .map(|_| true)
}

#[neon_frame_fn]
pub fn close(_cx: &mut FunctionContext) ->  Result<bool, VaultNodeError> {
  Instance::close()
    .map(|_| true)
}

#[neon_frame_fn]
pub fn update(cx: &mut FunctionContext) -> Result<bool, VaultNodeError> {
  let vault = Instance::get_vault()?;
  let mut current = vault.lock().unwrap();
  let existing_config: VaultConfig = current.cfg.clone();
  let arg = cx.argument::<JsValue>(0);
  let account_indexes = VaultConfig::get_account_indexes(cx, arg)?;
  current.cfg = VaultConfig {
    account_indexes,
    ..existing_config
  };
  Ok(true)
}