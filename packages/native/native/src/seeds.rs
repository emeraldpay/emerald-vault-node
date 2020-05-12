use neon::prelude::*;
use uuid::Uuid;

use access::{VaultConfig, WrappedVault, args_get_str};
use emerald_vault::{
    Address,
    hdwallet::{
        bip32::HDPath, WManager,
    },
    mnemonic::{
        generate_key,
        Language,
        Mnemonic,
        MnemonicSize
    },
    storage::error::VaultError,
    structs::{
        crypto::Encrypted,
        seed::{Seed, SeedSource, LedgerSource}
    },
};
use json::StatusResult;
use emerald_vault::util::optional::none_if_empty;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone)]
struct HDPathAddress {
    address: Address,
    hd_path: String
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SeedJson {
    pub id: String,
    pub seed_type: SeedType,
    pub is_available: bool
}

#[derive(Serialize, Deserialize, Clone)]
pub enum SeedType {
    #[serde(rename = "ledger")]
    Ledger,
    #[serde(rename = "bytes")]
    Bytes
}

#[derive(Deserialize, Clone)]
pub struct SeedDefinitionJson {
    #[serde(flatten)]
    pub seed_type: SeedDefinitionType,
    pub password: Option<String>
}

#[derive(Deserialize, Clone)]
#[serde(tag = "type", content = "value")]
pub enum SeedDefinitionType {
    #[serde(rename = "mnemonic")]
    Mnemonic(MnemonicSeedJson),
    #[serde(rename = "ledger")]
    Ledger(LedgerSeedJson),
}

#[derive(Deserialize, Clone)]
pub struct MnemonicSeedJson {
    pub value: String,
    pub password: Option<String>,
}

#[derive(Deserialize, Clone)]
pub struct LedgerSeedJson {}

#[derive(Deserialize, Clone)]
pub struct SeedReferenceJson {
    #[serde(flatten)]
    pub seed_type: SeedReferenceType,
    pub password: Option<String>,
}

#[derive(Deserialize, Clone)]
#[serde(tag = "type", content = "value")]
pub enum SeedReferenceType {
    #[serde(rename = "id")]
    Reference(Uuid),
    #[serde(rename = "ledger")]
    Ledger(LedgerSeedJson),
    #[serde(rename = "mnemonic")]
    Mnemonic(MnemonicSeedJson),
}

impl From<Seed> for SeedJson {
    fn from(value: Seed) -> Self {
        SeedJson {
            id: value.id.to_string(),
            seed_type: match value.source {
                SeedSource::Bytes(_) => SeedType::Bytes,
                SeedSource::Ledger(_) => SeedType::Ledger,
            },
            is_available: match value.source {
                SeedSource::Bytes(_) => true,
                SeedSource::Ledger(_) => false, //TODO
            }
        }
    }
}

impl SeedDefinitionJson {
    fn clean(self) -> Self {
        SeedDefinitionJson {
            seed_type: self.seed_type,
            password: match self.password {
                None => None,
                Some(s) => none_if_empty(s.as_str())
            }
        }
    }
}

pub fn is_available(mut cx: FunctionContext) -> JsResult<JsObject> {
    let json = cx.argument::<JsString>(1).expect("Input JSON is not provided").value();
    let parsed: SeedReferenceJson = serde_json::from_str(json.as_str()).expect("Invalid JSON");

    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);
    let status = match vault.is_available(parsed) {
        Ok(avail) => StatusResult::Ok(avail).as_json(),
        Err(e) => StatusResult::Error(0, format!("{}", e)).as_json()
    };
    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}

pub fn list_addresses(mut cx: FunctionContext) -> JsResult<JsObject> {
    let json = cx.argument::<JsString>(1).expect("Input JSON is not provided").value();
    let parsed: SeedReferenceJson = serde_json::from_str(json.as_str()).expect("Invalid JSON");
    // blockchain (#1) is dropped
    let hd_path_all = cx.argument::<JsArray>(3)
        .expect("List of HD Path is not provided")
        .to_vec(&mut cx)
        .expect("Failed to convert to Rust vector")
        .into_iter()
        .map(|item| {
            item.downcast::<JsString>().expect("Expected string element in array").value()
        }).collect();

    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let status = match vault.list_addresses(parsed, hd_path_all) {
        Ok(addresses) => {
            let mut result = HashMap::new();
            for address in addresses {
                result.insert(address.hd_path.as_str().to_string(), address.address.to_string());
            }
            StatusResult::Ok(result).as_json()
        },
        Err(e) => StatusResult::Error(0, format!("{}", e)).as_json()
    };

    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}

pub fn add(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let json = cx.argument::<JsString>(1).expect("Input JSON is not provided").value();
    let parsed: SeedDefinitionJson = serde_json::from_str(json.as_str()).expect("Invalid JSON");
    let parsed = parsed.clean();

    let result = vault.add_seed(parsed).expect("Seed not added");

    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn list(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);
    let seeds = vault.list_seeds().expect("List not loaded");

    let result: Vec<SeedJson> = seeds.iter().map(|s| SeedJson::from(s.clone())).collect();
    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn generate_mnemonic(mut cx: FunctionContext) -> JsResult<JsObject> {
    let size = cx.argument::<JsNumber>(0)
        .expect("Mnemonic size is not provided").value() as usize;

    let size = MnemonicSize::from_length(size).expect("Invalid mnemonic size");
    let mnemonic = Mnemonic::new(Language::English, size).expect("Failed to generate mnemonic");
    let sentence = mnemonic.sentence();

    let status = StatusResult::Ok(sentence).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

impl WrappedVault {
    pub fn is_ledger_connected() -> Result<bool, VaultError> {
        let id = HDPath::try_from("m/44'/60'/0'/0/0").expect("Failed to create address");
        let mut wallet_manager = WManager::new(None).expect("Can't create HID endpoint");
        wallet_manager.update(Some(id.to_bytes())).expect("Devices list not loaded");
        let opened = wallet_manager.open();
        match opened {
            Ok(_) => Ok(true),
            Err(e) => Err(VaultError::HDKeyFailed(e))
        }
    }

    pub fn is_available(&self, seed_ref: SeedReferenceJson) -> Result<bool, VaultError> {
        let storage = &self.cfg.get_storage();
        let connected = match seed_ref.seed_type {
            SeedReferenceType::Reference(id) => {
                let seed = storage.seeds().get(id)?;
                match seed.source {
                    SeedSource::Bytes(_) => true,
                    SeedSource::Ledger(_) => WrappedVault::is_ledger_connected()?
                }
            },
            SeedReferenceType::Ledger(_) => WrappedVault::is_ledger_connected()?,
            SeedReferenceType::Mnemonic(m) => Mnemonic::try_from(Language::English, m.value.as_str()).is_ok()
        };
        Ok(connected)
    }

    fn list_ledger_addresses(hd_path_all: Vec<String>) -> Vec<HDPathAddress> {
        let mut result = vec![];

        let id = HDPath::try_from("m/44'/60'/0'/0/0").expect("Failed to create address");
        let mut wallet_manager = WManager::new(None).expect("Can't create HID endpoint");
        wallet_manager.update(Some(id.to_bytes())).expect("Devices list not loaded");
        if !wallet_manager.open().is_ok() {
            return result;
        }

        let fd = &wallet_manager.devices()[0].1;

        for item in hd_path_all {
            let hd_path = HDPath::try_from(item.as_str()).expect("Failed to create address");
            let address = wallet_manager.get_address(fd.as_str(), Some(hd_path.to_bytes()))
                .expect("Filed to get address from Ledger");
            result.push(HDPathAddress { address, hd_path: item })
        }

        result
    }

    fn list_seed_addresses(hd_path_all: Vec<String>, seed: Vec<u8>) -> Vec<HDPathAddress> {
        let mut result = vec![];
        for item in hd_path_all {
            let hd_path = HDPath::try_from(item.as_str())
                .expect("Failed to create address");
            let pk = generate_key(&hd_path, &seed)
                .expect("Unable to generate private key");
            let address = pk.to_address();
            result.push(HDPathAddress { address, hd_path: item })
        }
        result
    }

    fn list_mnemonic_addresses(hd_path_all: Vec<String>, mnemonic: Mnemonic, password: Option<String>) -> Vec<HDPathAddress> {
        let seed = match password {
            Some(p) => mnemonic.seed(Some(p.as_str())),
            None => mnemonic.seed(None)
        };
        WrappedVault::list_seed_addresses(hd_path_all, seed)
    }

    pub fn list_addresses(&self, seed_ref: SeedReferenceJson, hd_path_all: Vec<String>) -> Result<Vec<HDPathAddress>, VaultError> {
        let storage = &self.cfg.get_storage();
        let addresses = match seed_ref.seed_type {
            SeedReferenceType::Reference(id) => {
                let seed = storage.seeds().get(id)?;
                match seed.source {
                    SeedSource::Bytes(source) => {
                        let password = seed_ref.password.expect("Password is required");
                        let source = source.decrypt(password.as_str())?;
                        WrappedVault::list_seed_addresses(hd_path_all, source)
                    },
                    SeedSource::Ledger(_) => WrappedVault::list_ledger_addresses(hd_path_all)
                }
            },
            SeedReferenceType::Ledger(_) => WrappedVault::list_ledger_addresses(hd_path_all),
            SeedReferenceType::Mnemonic(m) => {
                let mnemonic = Mnemonic::try_from(Language::English, m.value.as_str())
                    .expect("Failed to parse mnemonic phrase");
                WrappedVault::list_mnemonic_addresses(hd_path_all, mnemonic, m.password)
            }
        };
        Ok(addresses)
    }

    pub fn list_seeds(&self) -> Result<Vec<Seed>, VaultError> {
        let storage = &self.cfg.get_storage();
        storage.seeds().list_entries()
    }

    pub fn add_seed(&self, seed: SeedDefinitionJson) -> Result<Uuid, VaultError> {
        let storage = &self.cfg.get_storage();
        let seed_source = match seed.seed_type {
            SeedDefinitionType::Ledger(_) => {
                SeedSource::Ledger(LedgerSource {
                    fingerprints: vec![]
                })
            },
            SeedDefinitionType::Mnemonic(value) => {
                if seed.password.is_none() {
                    return Err(VaultError::PasswordRequired)
                }
                let mnemonic = Mnemonic::try_from(Language::English, value.value.as_str())
                    .map_err(|_| VaultError::InvalidDataError("mnemonic".to_string()))?;
//                let mnemonic_password = value.password.as_deref();
                let mnemonic_password = value.password.as_ref().map(|x| &**x);
                let raw = mnemonic.seed(mnemonic_password);
                SeedSource::Bytes(Encrypted::encrypt(raw, seed.password.unwrap().as_str())?)
            }
        };
        let id = storage.seeds().add(Seed { id: Uuid::new_v4(), source: seed_source })?;
        Ok(id)
    }
}