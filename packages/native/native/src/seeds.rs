use neon::prelude::*;
use uuid::Uuid;

use access::{VaultConfig, WrappedVault};
use chrono::{DateTime, Utc};
use emerald_vault::util::none_if_empty;
use emerald_vault::{mnemonic::{Language, Mnemonic, MnemonicSize}, storage::error::VaultError, structs::{
    crypto::Encrypted,
    seed::{LedgerSource, Seed, SeedSource},
}, EthereumAddress};
use hdpath::{StandardHDPath, AccountHDPath, CustomHDPath, HDPath};
use json::StatusResult;
use std::collections::HashMap;
use std::convert::TryFrom;
use emerald_vault::blockchain::chains::BlockchainType;
use emerald_vault::chains::Blockchain;
use bitcoin::Address;
use std::str::FromStr;
use emerald_hwkey::ledger::manager::LedgerKey;
use emerald_hwkey::errors::HWKeyError;
use emerald_hwkey::ledger::app_bitcoin::{BitcoinApp, BitcoinApps};
use emerald_hwkey::ledger::traits::LedgerApp;
use emerald_hwkey::ledger::app_ethereum::{EthereumApp, EthereumApps};

#[derive(Serialize, Deserialize, Clone)]
struct HDPathAddress {
    address: String,
    hd_path: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SeedJson {
    pub id: String,
    #[serde(rename = "type")]
    pub seed_type: SeedType,
    #[serde(rename = "available")]
    pub is_available: bool,
    pub label: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum SeedType {
    #[serde(rename = "ledger")]
    Ledger,
    #[serde(rename = "bytes")]
    Bytes,
}

#[derive(Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct SeedDefinitionOrReferenceJson {
    #[serde(flatten)]
    pub value: SeedDefinitionOrReferenceType,
    pub password: Option<String>,
    pub label: Option<String>,
}

#[derive(Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(tag = "type", content = "value")]
pub enum SeedDefinitionOrReferenceType {
    #[serde(rename = "mnemonic")]
    Mnemonic(MnemonicSeedJson),
    #[serde(rename = "id")]
    Reference(Uuid),
    #[serde(rename = "ledger")]
    Ledger,
}

#[derive(Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct MnemonicSeedJson {
    pub value: String,
    pub password: Option<String>,
}

#[derive(Serialize, Clone, Debug, Eq, PartialEq)]
pub struct LedgerDetails {
    #[serde(rename = "type")]
    pub json_type: String,
    pub connected: bool,
    pub app: Option<String>,
}

impl Default for LedgerDetails {
    fn default() -> Self {
        LedgerDetails {
            json_type: "ledger".to_string(),
            connected: false,
            app: None,
        }
    }
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
            },
            label: value.label,
            created_at: value.created_at,
        }
    }
}

impl SeedDefinitionOrReferenceJson {
    fn clean(self) -> Self {
        SeedDefinitionOrReferenceJson {
            password: match self.password {
                None => None,
                Some(s) => none_if_empty(s.as_str()),
            },
            ..self
        }
    }
}

struct IsAvailableTask {
    cfg: VaultConfig,
    parsed: SeedDefinitionOrReferenceJson,
}

impl Task for IsAvailableTask {
    type Output = bool;
    type Error = String;
    type JsEvent = JsObject;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        let vault = WrappedVault::new(self.cfg.clone());
        match vault.is_available(self.parsed.clone()) {
            Ok(avail) => Ok(avail),
            Err(_) => Ok(false),
        }
    }

    fn complete(self, mut cx: TaskContext, result: Result<Self::Output, Self::Error>) -> JsResult<Self::JsEvent> {
        let status = StatusResult::from(result).as_json();
        let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
        Ok(js_value.downcast().unwrap())
    }
}

pub fn is_available(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let json = cx
        .argument::<JsString>(1)
        .expect("Input JSON is not provided")
        .value();
    let parsed: SeedDefinitionOrReferenceJson =
        serde_json::from_str(json.as_str()).expect("Invalid JSON");

    let cfg = VaultConfig::get_config(&mut cx);
    let task = IsAvailableTask {
        cfg,
        parsed,
    };
    let f = cx.argument::<JsFunction>(2)?;
    task.schedule(f);
    Ok(cx.undefined())
}

struct ListAddressesTask {
    cfg: VaultConfig,
    parsed: SeedDefinitionOrReferenceJson,
    hd_path_all: Vec<String>,
    blockchain: Blockchain,
}

impl Task for ListAddressesTask {
    type Output = HashMap<String, String>;
    type Error = String;
    type JsEvent = JsObject;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        let vault = WrappedVault::new(self.cfg.clone());
        match vault.list_addresses(self.parsed.clone(), self.hd_path_all.clone(), self.blockchain) {
            Ok(addresses) => {
                let mut result = HashMap::new();
                for address in addresses {
                    result.insert(
                        address.hd_path.as_str().to_string(),
                        address.address.to_string(),
                    );
                }
                Ok(result)
            }
            Err(e) => Err(format!("{:?}", e))
        }
    }

    fn complete(self, mut cx: TaskContext, result: Result<Self::Output, Self::Error>) -> JsResult<Self::JsEvent> {
        let status = StatusResult::from(result).as_json();
        let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
        Ok(js_value.downcast().unwrap())
    }
}

pub fn list_addresses(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let json = cx
        .argument::<JsString>(1)
        .expect("Input JSON is not provided")
        .value();
    let parsed: SeedDefinitionOrReferenceJson =
        serde_json::from_str(json.as_str()).expect("Invalid JSON");

    let blockchain = cx
        .argument::<JsNumber>(2)
        .expect("Input JSON is not provided")
        .value();
    let blockchain = Blockchain::try_from(blockchain as u32)
        .expect("Invalid blockchain id");

    let hd_path_all = cx
        .argument::<JsArray>(3)
        .expect("List of HD Path is not provided")
        .to_vec(&mut cx)
        .expect("Failed to convert to Rust vector")
        .into_iter()
        .map(|item| {
            item.downcast::<JsString>()
                .expect("Expected string element in array")
                .value()
        })
        .collect();

    let cfg = VaultConfig::get_config(&mut cx);

    let f = cx.argument::<JsFunction>(4)?;
    let task = ListAddressesTask {
        cfg,
        parsed,
        hd_path_all,
        blockchain,
    };
    task.schedule(f);
    Ok(cx.undefined())
}

pub fn add(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let json = cx
        .argument::<JsString>(1)
        .expect("Input JSON is not provided")
        .value();
    let parsed: SeedDefinitionOrReferenceJson =
        serde_json::from_str(json.as_str()).expect("Invalid JSON");
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

    let mut result: Vec<SeedJson> = seeds.iter().map(|s| SeedJson::from(s.clone())).collect();

    let has_ledger = result.iter().any(|e| match e.seed_type {
        SeedType::Ledger => true,
        SeedType::Bytes => false,
    });

    if has_ledger {
        let ledger_connected = WrappedVault::is_ledger_connected().map_or(false, |v| v);
        result = result
            .iter()
            .cloned()
            .map(|e| match e.seed_type {
                SeedType::Ledger => SeedJson {
                    is_available: ledger_connected,
                    ..e
                },
                SeedType::Bytes => e,
            })
            .collect()
    }

    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn generate_mnemonic(mut cx: FunctionContext) -> JsResult<JsObject> {
    let size = cx
        .argument::<JsNumber>(0)
        .expect("Mnemonic size is not provided")
        .value() as usize;

    let size = MnemonicSize::from_length(size).expect("Invalid mnemonic size");
    let mnemonic = Mnemonic::new(Language::English, size).expect("Failed to generate mnemonic");
    let sentence = mnemonic.sentence();

    let status = StatusResult::Ok(sentence).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

fn get_bitcoin_app(k: &LedgerKey) -> Option<String> {
    BitcoinApp::new(&k).is_open().map(
        |app| match app {
            BitcoinApps::Mainnet => "bitcoin".to_string(),
            BitcoinApps::Testnet => "bitcoin-test".to_string()
        },
    )
}

fn get_ethereum_app(k: &LedgerKey) -> Option<String> {
    EthereumApp::new(&k).is_open().map(
        |app| match app {
            EthereumApps::Ethereum => "ethereum".to_string(),
            EthereumApps::EthereumClassic => "ethereum-classic".to_string()
        },
    )
}

struct ListHWKeyTask;

impl Task for ListHWKeyTask {
    type Output = Vec<LedgerDetails>;
    type Error = String;
    type JsEvent = JsObject;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        let mut result: Vec<LedgerDetails> = Vec::new();

        match LedgerKey::new_connected() {
            Ok(k) => {
                let name = get_bitcoin_app(&k).or_else(|| get_ethereum_app(&k));
                result.push(LedgerDetails {
                    connected: true,
                    app: name,
                    ..LedgerDetails::default()
                })
            },
            Err(_) => {}
        };
        Ok(result)
    }

    fn complete(self, mut cx: TaskContext, result: Result<Self::Output, Self::Error>) -> JsResult<Self::JsEvent> {
        let status = StatusResult::from(result).as_json();
        let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
        Ok(js_value.downcast().unwrap())
    }
}

pub fn list_hwkey(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let f = cx.argument::<JsFunction>(1)?;
    ListHWKeyTask.schedule(f);
    Ok(cx.undefined())
}

impl WrappedVault {
    pub fn is_ledger_connected() -> Result<bool, VaultError> {
        let opened = LedgerKey::new_connected().and_then(|a| a.open());
        match opened {
            Ok(_) => Ok(true),
            Err(HWKeyError::Unavailable) => Ok(false),
            Err(e) => Err(VaultError::HWKeyFailed(e)),
        }
    }

    pub fn is_available(
        &self,
        seed_ref: SeedDefinitionOrReferenceJson,
    ) -> Result<bool, VaultError> {
        let storage = &self.cfg.get_storage();
        let connected = match seed_ref.value {
            SeedDefinitionOrReferenceType::Reference(id) => {
                let seed = storage.seeds().get(id)?;
                match seed.source {
                    SeedSource::Bytes(_) => true,
                    SeedSource::Ledger(_) => WrappedVault::is_ledger_connected()?,
                }
            }
            SeedDefinitionOrReferenceType::Ledger => WrappedVault::is_ledger_connected()?,
            SeedDefinitionOrReferenceType::Mnemonic(m) => {
                Mnemonic::try_from(Language::English, m.value.as_str()).is_ok()
            }
        };
        Ok(connected)
    }

    fn list_seed_addresses(&self,
                           seed: SeedSource,
                           password: Option<String>,
                           hd_path_all: Vec<String>,
                           blockchain: Blockchain) -> Result<Vec<HDPathAddress>, VaultError> {
        let hd_path_std: Vec<StandardHDPath> = hd_path_all.iter()
            .map(|s|
                StandardHDPath::from_str(s.as_str().clone())
            )
            .filter(|a| a.is_ok())
            .map(|a| a.unwrap())
            .collect();
        let addresses = match blockchain.get_type() {
            BlockchainType::Bitcoin => {
                let hd_path_acc: Vec<AccountHDPath> = hd_path_all.iter()
                    .map(|s|
                        CustomHDPath::from_str(s).and_then(|p|
                            if p.len() == 3 {
                                AccountHDPath::try_from(p)
                            } else {
                                Err(hdpath::Error::InvalidLength(p.len() as usize))
                            }
                        )
                    )
                    .filter(|a| a.is_ok())
                    .map(|a| a.unwrap())
                    .collect();
                let mut result: Vec<HDPathAddress> = Vec::with_capacity(hd_path_std.len() + hd_path_acc.len());
                if !hd_path_acc.is_empty() {
                    seed.get_xpub(password.clone(), &hd_path_acc, blockchain)?.iter()
                        .map(|a| HDPathAddress {
                            hd_path: a.0.as_custom().to_string(), // convert to custom to encode as standrd hd path
                            address: a.1.to_string(),
                        })
                        .for_each(|a| result.push(a));
                };

                seed.get_addresses::<Address>(password, &hd_path_std, blockchain)?
                    .iter()
                    .map(|a| HDPathAddress {
                        hd_path: a.0.to_string(),
                        address: a.1.to_string(),
                    })
                    .for_each(|a| result.push(a));

                result
            },
            BlockchainType::Ethereum => {
                seed.get_addresses::<EthereumAddress>(password, &hd_path_std, blockchain)?
                    .iter()
                    .map(|a| HDPathAddress {
                        hd_path: a.0.to_string(),
                        address: a.1.to_string(),
                    })
                    .collect()
            }
        };
        Ok(addresses)
    }

    fn list_addresses(
        &self,
        seed_ref: SeedDefinitionOrReferenceJson,
        hd_path_all: Vec<String>,
        blockchain: Blockchain,
    ) -> Result<Vec<HDPathAddress>, VaultError> {

        let storage = &self.cfg.get_storage();
        let addresses = match seed_ref.value {
            SeedDefinitionOrReferenceType::Reference(id) => {
                let seed = storage.seeds().get(id)?;
                self.list_seed_addresses(seed.source, seed_ref.password, hd_path_all, blockchain)?
            }
            SeedDefinitionOrReferenceType::Mnemonic(m) => {
                let mnemonic = Mnemonic::try_from(Language::English, m.value.as_str())
                    .expect("Failed to parse mnemonic phrase");
                let temp_seed = SeedSource::create_bytes(mnemonic.seed(m.password), "temp")?;
                self.list_seed_addresses(temp_seed, Some("temp".to_string()), hd_path_all, blockchain)?
            }
            SeedDefinitionOrReferenceType::Ledger => {
                self.list_seed_addresses(SeedSource::Ledger(LedgerSource::default()), None, hd_path_all, blockchain)?
            }
        };
        Ok(addresses)
    }

    pub fn list_seeds(&self) -> Result<Vec<Seed>, VaultError> {
        let storage = &self.cfg.get_storage();
        storage.seeds().list_entries()
    }

    pub fn add_seed(&self, seed: SeedDefinitionOrReferenceJson) -> Result<Uuid, VaultError> {
        let storage = &self.cfg.get_storage();
        let seed_source = match seed.value {
            SeedDefinitionOrReferenceType::Ledger => SeedSource::Ledger(LedgerSource {
                fingerprints: vec![],
            }),
            SeedDefinitionOrReferenceType::Mnemonic(value) => {
                if seed.password.is_none() {
                    return Err(VaultError::PasswordRequired);
                }
                let mnemonic = Mnemonic::try_from(Language::English, value.value.as_str())
                    .map_err(|_| VaultError::InvalidDataError("mnemonic".to_string()))?;
                let raw = mnemonic.seed(value.password);
                SeedSource::Bytes(Encrypted::encrypt(raw, seed.password.unwrap().as_str())?)
            }
            SeedDefinitionOrReferenceType::Reference(_) => {
                return Err(VaultError::UnsupportedDataError(
                    "Cannot create Seed from existing seed".to_string(),
                ))
            }
        };
        let id = storage.seeds().add(Seed {
            id: Uuid::new_v4(),
            source: seed_source,
            label: seed.label,
            created_at: Utc::now(),
        })?;
        Ok(id)
    }
}

#[cfg(test)]
mod tests {
    use seeds::{MnemonicSeedJson, SeedDefinitionOrReferenceJson, SeedDefinitionOrReferenceType};
    use std::str::FromStr;
    use uuid::Uuid;

    #[test]
    fn parse_ledger_ref() {
        let json = "{\"type\": \"ledger\"}";
        let parsed: SeedDefinitionOrReferenceJson = serde_json::from_str(json).expect("parsed");

        assert_eq!(
            SeedDefinitionOrReferenceJson {
                value: SeedDefinitionOrReferenceType::Ledger,
                password: None,
                label: None
            },
            parsed
        );
    }

    #[test]
    fn parse_id_ref() {
        let json = "{\"type\": \"id\", \"value\": \"4f3a7696-af3a-445d-9aa5-b556d78736da\"}";
        let parsed: SeedDefinitionOrReferenceJson = serde_json::from_str(json).expect("parsed");

        assert_eq!(
            SeedDefinitionOrReferenceJson {
                value: SeedDefinitionOrReferenceType::Reference(
                    Uuid::from_str("4f3a7696-af3a-445d-9aa5-b556d78736da").unwrap()
                ),
                password: None,
                label: None
            },
            parsed
        );
    }

    #[test]
    fn parse_id_ref_with_password() {
        let json = "{\"type\": \"id\", \"value\": \"4f3a7696-af3a-445d-9aa5-b556d78736da\", \"password\": \"test\"}";
        let parsed: SeedDefinitionOrReferenceJson = serde_json::from_str(json).expect("parsed");

        assert_eq!(
            SeedDefinitionOrReferenceJson {
                value: SeedDefinitionOrReferenceType::Reference(
                    Uuid::from_str("4f3a7696-af3a-445d-9aa5-b556d78736da").unwrap()
                ),
                password: Some("test".to_string()),
                label: None
            },
            parsed
        );
    }

    #[test]
    fn parse_mnemonic() {
        let json = "{\"type\": \"mnemonic\", \"value\": {\"value\": \"test test\"}}";
        let parsed: SeedDefinitionOrReferenceJson = serde_json::from_str(json).expect("parsed");

        assert_eq!(
            SeedDefinitionOrReferenceJson {
                value: SeedDefinitionOrReferenceType::Mnemonic(MnemonicSeedJson {
                    value: "test test".to_string(),
                    password: None,
                }),
                password: None,
                label: None,
            },
            parsed
        );
    }

    #[test]
    fn parse_mnemonic_with_label() {
        let json = "{\"type\": \"mnemonic\", \"value\": {\"value\": \"test test\"}, \"label\": \"My Seed\"}";
        let parsed: SeedDefinitionOrReferenceJson = serde_json::from_str(json).expect("parsed");

        assert_eq!(
            SeedDefinitionOrReferenceJson {
                value: SeedDefinitionOrReferenceType::Mnemonic(MnemonicSeedJson {
                    value: "test test".to_string(),
                    password: None,
                }),
                password: None,
                label: Some("My Seed".to_string()),
            },
            parsed
        );
    }

    #[test]
    fn parse_mnemonic_with_passphrase() {
        let json = "{\"type\": \"mnemonic\", \"value\": {\"value\": \"test test\", \"password\": \"hello\"}}";
        let parsed: SeedDefinitionOrReferenceJson = serde_json::from_str(json).expect("parsed");

        assert_eq!(
            SeedDefinitionOrReferenceJson {
                value: SeedDefinitionOrReferenceType::Mnemonic(MnemonicSeedJson {
                    value: "test test".to_string(),
                    password: Some("hello".to_string()),
                }),
                password: None,
                label: None
            },
            parsed
        );
    }

    #[test]
    fn parse_mnemonic_with_passphrase_and_encryption_password() {
        let json = "{\"type\": \"mnemonic\", \"password\": \"word!\", \"value\": {\"value\": \"test test\", \"password\": \"hello\"}}";
        let parsed: SeedDefinitionOrReferenceJson = serde_json::from_str(json).expect("parsed");

        assert_eq!(
            SeedDefinitionOrReferenceJson {
                value: SeedDefinitionOrReferenceType::Mnemonic(MnemonicSeedJson {
                    value: "test test".to_string(),
                    password: Some("hello".to_string()),
                }),
                password: Some("word!".to_string()),
                label: None
            },
            parsed
        );
    }
}
