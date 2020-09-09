use neon::prelude::*;
use uuid::Uuid;

use access::{VaultConfig, WrappedVault};
use chrono::{DateTime, Utc};
use emerald_vault::util::none_if_empty;
use emerald_vault::{hdwallet::WManager, mnemonic::{Language, Mnemonic, MnemonicSize}, storage::error::VaultError, structs::{
    crypto::Encrypted,
    seed::{LedgerSource, Seed, SeedSource},
}, EthereumAddress, sign::bip32::generate_key, EthereumPrivateKey};
use hdpath::StandardHDPath;
use json::StatusResult;
use std::collections::HashMap;
use std::convert::TryFrom;

#[derive(Serialize, Deserialize, Clone)]
struct HDPathAddress {
    address: EthereumAddress,
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

pub fn is_available(mut cx: FunctionContext) -> JsResult<JsObject> {
    let json = cx
        .argument::<JsString>(1)
        .expect("Input JSON is not provided")
        .value();
    let parsed: SeedDefinitionOrReferenceJson =
        serde_json::from_str(json.as_str()).expect("Invalid JSON");

    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);
    let status = match vault.is_available(parsed) {
        Ok(avail) => StatusResult::Ok(avail).as_json(),
        Err(_) => StatusResult::Ok(false).as_json(),
    };
    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
}

pub fn list_addresses(mut cx: FunctionContext) -> JsResult<JsObject> {
    let json = cx
        .argument::<JsString>(1)
        .expect("Input JSON is not provided")
        .value();
    let parsed: SeedDefinitionOrReferenceJson =
        serde_json::from_str(json.as_str()).expect("Invalid JSON");
    // blockchain (#1) is dropped
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
    let vault = WrappedVault::new(cfg);

    let status = match vault.list_addresses(parsed, hd_path_all) {
        Ok(addresses) => {
            let mut result = HashMap::new();
            for address in addresses {
                result.insert(
                    address.hd_path.as_str().to_string(),
                    address.address.to_string(),
                );
            }
            StatusResult::Ok(result).as_json()
        }
        Err(e) => StatusResult::Error(0, format!("{}", e)).as_json(),
    };

    let js_value = neon_serde::to_value(&mut cx, &status)?;
    Ok(js_value.downcast().unwrap())
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

impl WrappedVault {
    pub fn is_ledger_connected() -> Result<bool, VaultError> {
        let id = StandardHDPath::try_from("m/44'/60'/0'/0/0").expect("Failed to create address");
        let mut wallet_manager = WManager::new(None).expect("Can't create HID endpoint");
        wallet_manager
            .update(Some(id.to_bytes()))
            .expect("Devices list not loaded");
        let opened = wallet_manager.open();
        match opened {
            Ok(_) => Ok(true),
            Err(e) => Err(VaultError::HDKeyFailed(e)),
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

    fn list_ledger_addresses(hd_path_all: Vec<String>) -> Vec<HDPathAddress> {
        let mut result = vec![];

        let id = StandardHDPath::try_from("m/44'/60'/0'/0/0").expect("Failed to create address");
        let mut wallet_manager = WManager::new(None).expect("Can't create HID endpoint");
        wallet_manager
            .update(Some(id.to_bytes()))
            .expect("Devices list not loaded");
        if !wallet_manager.open().is_ok() {
            return result;
        }

        let fd = &wallet_manager.devices()[0].1;

        for item in hd_path_all {
            let hd_path =
                StandardHDPath::try_from(item.as_str()).expect("Failed to create address");
            let address = wallet_manager
                .get_address(fd.as_str(), Some(hd_path.to_bytes()))
                .expect("Filed to get address from Ledger");
            result.push(HDPathAddress {
                address,
                hd_path: item,
            })
        }

        result
    }

    fn list_seed_addresses(hd_path_all: Vec<String>, seed: Vec<u8>) -> Vec<HDPathAddress> {
        let mut result = vec![];
        for item in hd_path_all {
            let hd_path =
                StandardHDPath::try_from(item.as_str()).expect("Failed to create address");
            let pk = generate_key(&hd_path, &seed).expect("Unable to generate private key");
            let pk: EthereumPrivateKey = pk.private_key.key.into();
            let address = pk.to_address();
            result.push(HDPathAddress {
                address,
                hd_path: item,
            })
        }
        result
    }

    fn list_mnemonic_addresses(
        hd_path_all: Vec<String>,
        mnemonic: Mnemonic,
        password: Option<String>,
    ) -> Vec<HDPathAddress> {
        let seed = match password {
            Some(p) => mnemonic.seed(Some(p.as_str())),
            None => mnemonic.seed(None),
        };
        WrappedVault::list_seed_addresses(hd_path_all, seed)
    }

    fn list_addresses(
        &self,
        seed_ref: SeedDefinitionOrReferenceJson,
        hd_path_all: Vec<String>,
    ) -> Result<Vec<HDPathAddress>, VaultError> {
        let storage = &self.cfg.get_storage();
        let addresses = match seed_ref.value {
            SeedDefinitionOrReferenceType::Reference(id) => {
                let seed = storage.seeds().get(id)?;
                match seed.source {
                    SeedSource::Bytes(source) => {
                        let password = seed_ref.password.expect("Password is required");
                        let source = source.decrypt(password.as_str())?;
                        WrappedVault::list_seed_addresses(hd_path_all, source)
                    }
                    SeedSource::Ledger(_) => WrappedVault::list_ledger_addresses(hd_path_all),
                }
            }
            SeedDefinitionOrReferenceType::Mnemonic(m) => {
                let mnemonic = Mnemonic::try_from(Language::English, m.value.as_str())
                    .expect("Failed to parse mnemonic phrase");
                WrappedVault::list_mnemonic_addresses(hd_path_all, mnemonic, m.password)
            }
            SeedDefinitionOrReferenceType::Ledger => {
                WrappedVault::list_ledger_addresses(hd_path_all)
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
                //                let mnemonic_password = value.password.as_deref();
                let mnemonic_password = value.password.as_ref().map(|x| &**x);
                let raw = mnemonic.seed(mnemonic_password);
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
