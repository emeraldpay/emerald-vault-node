use neon::prelude::*;
use uuid::Uuid;

use chrono::{DateTime, Utc};
use emerald_vault::util::none_if_empty;
use emerald_vault::{
    mnemonic::{Language, Mnemonic, MnemonicSize},
    error::VaultError,
    structs::{
        crypto::Encrypted,
        seed::{LedgerSource, Seed, SeedSource},
    },
    EthereumAddress
};
use hdpath::{StandardHDPath, AccountHDPath, CustomHDPath, HDPath};
use std::collections::HashMap;
use std::convert::TryFrom;
use emerald_vault::blockchain::chains::BlockchainType;
use emerald_vault::chains::Blockchain;
use bitcoin::Address;
use std::str::FromStr;
use emerald_hwkey::{
    ledger::{
        connect::{
            LedgerKeyShared,
            LedgerKey
        }
    }
};
use emerald_vault::structs::seed::WithFingerprint;
use emerald_vault::crypto::fingerprint::Fingerprints;
use crate::errors::{VaultNodeError};
use crate::instance::{Instance, WrappedVault};

#[derive(Serialize, Deserialize, Clone)]
struct HDPathAddress {
    address: String,
    hd_path: String,
}

#[derive(Deserialize, Clone)]
pub struct SeedUpdateJson {
    pub label: Option<String>,
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
    #[serde(rename = "raw")]
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
    #[serde(rename = "appVersion")]
    pub app_version: Option<String>,
    #[serde(rename = "seedId")]
    pub seed_id: Option<Uuid>,
}

impl Default for LedgerDetails {
    fn default() -> Self {
        LedgerDetails {
            json_type: "ledger".to_string(),
            connected: false,
            app: None,
            app_version: None,
            seed_id: None,
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

#[neon_frame_fn(channel=1)]
pub fn is_available<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<bool, VaultNodeError>) + Send + 'static {

    let json = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "json".to_string()))?
        .value(cx);
    let parsed: SeedDefinitionOrReferenceJson = serde_json::from_str(json.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(0))?;
    let vault = Instance::get_vault()?;

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let result: Result<bool, VaultNodeError> = match vault.is_available(parsed.clone()) {
            Ok(avail) => Ok(avail),
            Err(_) => Ok(false),
        };
        handler(result);
    });

    Ok(())
}

#[neon_frame_fn(channel=3)]
pub fn list_addresses<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<HashMap<String, String>, VaultNodeError>) + Send + 'static {
    let cfg = Instance::get_vault()?;

    let json = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "json".to_string()))?
        .value(cx);
    let parsed: SeedDefinitionOrReferenceJson = serde_json::from_str(json.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(0))?;

    let blockchain = cx
        .argument::<JsNumber>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "blockchain".to_string()))?
        .value(cx);
    let blockchain = Blockchain::try_from(blockchain as u32)
        .map_err(|_| VaultNodeError::InvalidArgument(1))?;

    let hd_path_all_js = cx
        .argument::<JsArray>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "hd_path".to_string()))?
        .to_vec(cx)
        .map_err(|_| VaultNodeError::InvalidArgument(2))?;

    let mut hd_path_all: Vec<String> = vec![];
    for item in hd_path_all_js {
        let s = item.downcast::<JsString, _>(cx)
            .map_err(|_| VaultNodeError::InvalidArgument(2))?
            .value(cx);
        hd_path_all.push(s)
    }

    std::thread::spawn(move || {
        let vault = cfg.lock().unwrap();

        let result: Result<HashMap<String, String>, VaultNodeError> = match vault.list_addresses(parsed.clone(), hd_path_all.clone(), blockchain) {
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
            Err(e) => Err(VaultNodeError::from(e))
        };
        handler(result);
    });
    Ok(())
}

#[neon_frame_fn(channel=1)]
pub fn add<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<Uuid, VaultNodeError>) + Send + 'static {
    let cfg = Instance::get_vault()?;

    let json = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "json".to_string()))?
        .value(cx);
    let parsed: SeedDefinitionOrReferenceJson = serde_json::from_str(json.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(0))?;
    let parsed = parsed.clean();


    std::thread::spawn(move || {
        let vault = cfg.lock().unwrap();
        let result = vault.add_seed(parsed)
            .map_err(VaultNodeError::from);
        handler(result);
    });

    Ok(())
}

fn list_internal(vault: &WrappedVault) -> Result<Vec<SeedJson>, VaultNodeError> {
    let seeds = vault.list_seeds().map_err(VaultNodeError::from)?;
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
    Ok(result)
}

#[neon_frame_fn(channel=0)]
pub fn list<H>(_cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<Vec<SeedJson>, VaultNodeError>) + Send + 'static {
    let cfg = Instance::get_vault()?;

    std::thread::spawn(move || {
        let vault = cfg.lock().unwrap();
        handler(list_internal(&vault));
    });

    Ok(())
}

fn generate_mnemonic_internal(size: usize) -> Result<String, VaultNodeError> {
    let size = MnemonicSize::from_length(size)
        .map_err(|_| VaultNodeError::InvalidArgumentValue("Invalid mnemonic size".to_string()))?;
    let mnemonic = Mnemonic::new(Language::English, size)
        .map_err(|_| VaultNodeError::InvalidArgumentValue("Failed to generate mnemonic".to_string()))?;
    let sentence = mnemonic.sentence();
    Ok(sentence)
}

#[neon_frame_fn(channel=1)]
pub fn generate_mnemonic<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<String, VaultNodeError>) + Send + 'static {
    let size = cx
        .argument::<JsNumber>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "size".to_string()))?
        .value(cx) as usize;

    std::thread::spawn(move || {
        handler(generate_mnemonic_internal(size));
    });

    Ok(())
}

fn list_hwkey_internal(vault: &WrappedVault) -> Result<Vec<LedgerDetails>, VaultNodeError> {
    match LedgerKeyShared::instance() {
        Ok(k) => {
            let mut result: Vec<LedgerDetails> = Vec::new();
            let app = k.get_app_details().ok();
            let seed_id = if let Ok(fps) = k.find_fingerprints() {
                if let Ok(seeds) = vault.list_seeds() {
                    let seed = seeds.iter().find(|seed| {
                        fps.iter().any(|fp| seed.is_same(fp))
                    });
                    seed.map(|seed| seed.id)
                } else {
                    None
                }
            } else {
                None
            };
            result.push(LedgerDetails {
                connected: true,
                app: app.clone().map(|a| a.name),
                app_version: app.map(|a| a.version),
                seed_id,
                ..LedgerDetails::default()
            });
            Ok(result)
        },
        Err(e) => Err(VaultNodeError::from(VaultError::HWKeyFailed(e)))
    }
}

#[neon_frame_fn(channel=0)]
pub fn list_hwkey<H>(_cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<Vec<LedgerDetails>, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let result = list_hwkey_internal(&vault);
        handler(result.map_err(VaultNodeError::from));
    });

    Ok(())
}

#[neon_frame_fn(channel=2)]
pub fn update<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<bool, VaultNodeError>) + Send + 'static {

    let vault = Instance::get_vault()?;

    let json = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "seed".to_string()))?
        .value(cx);
    let seed_id = Uuid::parse_str(json.as_str())
        .map_err(|_| VaultNodeError::InvalidArgumentByName("seed".to_string()))?;

    let json = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "details".to_string()))?
        .value(cx);
    let update: SeedUpdateJson = serde_json::from_str(json.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(1))?;

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let seed_storage = vault.cfg.get_storage().seeds();
        let result = match seed_storage.get(seed_id) {
            Ok(mut seed) => {
                seed.label = update.label;
                seed_storage.update(seed)
            },
            Err(e) => Err(e)
        };
        handler(result.map_err(|e| VaultNodeError::from(e)));
    });

    Ok(())
}

impl WrappedVault {
    pub fn is_ledger_connected() -> Result<bool, VaultError> {
        Ok(LedgerKeyShared::instance()
            .map_err(|_| VaultError::PrivateKeyUnavailable)?
            .is_connected())
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
                StandardHDPath::from_str(s.as_str())
            )
            .filter(|a| a.is_ok())
            .map(|a| a.unwrap())
            .collect();
        let storage = &self.cfg.get_storage();
        let global = storage.global_key().get_if_exists()?;
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
                    seed.get_xpub(password.clone(), &global, &hd_path_acc, blockchain)?.iter()
                        .map(|a| HDPathAddress {
                            hd_path: a.0.as_custom().to_string(), // convert to custom to encode as standrd hd path
                            address: a.1.to_string(),
                        })
                        .for_each(|a| result.push(a));
                };

                seed.get_addresses::<Address>(password, global, &hd_path_std, blockchain)?
                    .iter()
                    .map(|a| HDPathAddress {
                        hd_path: a.0.to_string(),
                        address: a.1.to_string(),
                    })
                    .for_each(|a| result.push(a));

                result
            },
            BlockchainType::Ethereum => {
                seed.get_addresses::<EthereumAddress>(password, global, &hd_path_std, blockchain)?
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
                    .map_err(|_| VaultError::InvalidDataError("Failed to parse mnemonic phrase".to_string()))?;
                let temp_seed = SeedSource::create_raw(mnemonic.seed(m.password))?;
                self.list_seed_addresses(temp_seed, Some("NONE".to_string()), hd_path_all, blockchain)?
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
            SeedDefinitionOrReferenceType::Ledger => SeedSource::Ledger(LedgerSource::default()),
            SeedDefinitionOrReferenceType::Mnemonic(value) => {
                if seed.password.is_none() {
                    return Err(VaultError::PasswordRequired);
                }
                if !storage.global_key().is_set() {
                    return Err(VaultError::GlobalKeyRequired);
                }
                let global = storage.global_key().get_if_exists()?;
                let mnemonic = Mnemonic::try_from(Language::English, value.value.as_str())
                    .map_err(|_| VaultError::InvalidDataError("mnemonic".to_string()))?;
                let raw = mnemonic.seed(value.password);
                SeedSource::Bytes(Encrypted::encrypt(raw, seed.password.unwrap().as_bytes(), global)?)
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
    use crate::seeds::{MnemonicSeedJson, SeedDefinitionOrReferenceJson, SeedDefinitionOrReferenceType};
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
