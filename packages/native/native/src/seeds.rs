use neon::prelude::*;
use uuid::Uuid;

use access::{VaultConfig, WrappedVault};
use emerald_vault::{
    Address,
    hdwallet::{
        bip32::HDPath, WManager
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
        seed::{Seed, SeedSource}
    },
};
use json::StatusResult;
use emerald_vault::util::optional::none_if_empty;

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
    Mnemonic(MnemonicSeedJson)
}

#[derive(Deserialize, Clone)]
pub struct MnemonicSeedJson {
    pub value: String,
    pub password: Option<String>
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

fn list_ledger_address(hd_path_all: Vec<String>) -> Vec<HDPathAddress> {
    let mut result = vec![];

    let id = HDPath::try_from("m/44'/60'/0'/0'/0").expect("Failed to create address");
    let mut wallet_manager = WManager::new(Some(id.to_bytes())).expect("Can't create HID endpoint");
    if !wallet_manager.open().is_ok() {
        return result;
    }
    wallet_manager.update(None).expect("Devices list not loaded");

    let fd = &wallet_manager.devices()[0].1;

    for item in hd_path_all {
        let hd_path = HDPath::try_from(item.as_str()).expect("Failed to create address");
        let address = wallet_manager.get_address(fd.as_str(), Some(hd_path.to_bytes()))
            .expect("Filed to get address from Ledger");
        result.push(HDPathAddress {address, hd_path: item})
    }

    result
}

fn list_mnemonic_address(hd_path_all: Vec<String>, mnemonic: Mnemonic, password: Option<String>) -> Vec<HDPathAddress> {
    let mut result = vec![];
    let seed = match password {
        Some(p) => mnemonic.seed(Some(p.as_str())),
        None => mnemonic.seed(None)
    };
    for item in hd_path_all {
        let hd_path = HDPath::try_from(item.as_str())
            .expect("Failed to create address");
        let pk = generate_key(&hd_path, &seed)
            .expect("Unable to generate private key");
        let address = pk.to_address();
        result.push(HDPathAddress {address, hd_path: item})
    }
    result
}

pub fn is_connected(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let id = HDPath::try_from("m/44'/60'/0'/0'/0").expect("Failed to create address");
    let wallet_manager = WManager::new(Some(id.to_bytes())).expect("Can't create HID endpoint");
    let is_connected = wallet_manager.open().is_ok();

    let result = cx.boolean(is_connected);
    Ok(result)
}

pub fn list_addresses(mut cx: FunctionContext) -> JsResult<JsObject> {
    let json = cx.argument::<JsString>(0).expect("Input JSON is not provided").value();

    let hd_path_all = cx.argument::<JsArray>(2)
        .expect("List of HD Path is not provided")
        .to_vec(&mut cx)
        .expect("Failed to convert to Rust vector")
        .into_iter()
        .map(|item| {
            item.downcast::<JsString>().expect("Expected string element in array").value()
        }).collect();

    let mut js_object = JsObject::new(&mut cx);

    let parsed: SeedDefinitionJson = serde_json::from_str(json.as_str()).expect("Invalid JSON");

    let addresses: Vec<HDPathAddress> = match parsed.seed_type {
//            SeedDefinitionType::Ledger => {
//                list_ledger_address(hd_path_all)
//            },
        SeedDefinitionType::Mnemonic(m) => {
            let mnemonic = Mnemonic::try_from(Language::English, m.value.as_str())
                .expect("Failed to parse mnemonic phrase");
            list_mnemonic_address(hd_path_all, mnemonic, m.password)
        }
    };

    for address in addresses {
        let address_js = cx.string(address.address.to_string());
        js_object.set(&mut cx, address.hd_path.as_str(), address_js)
            .expect("Failed to setup result");
    }

    Ok(js_object)
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
    pub fn list_seeds(&self) -> Result<Vec<Seed>, VaultError> {
        let storage = &self.cfg.get_storage();
        storage.seeds().list_entries()
    }

    pub fn add_seed(&self, seed: SeedDefinitionJson) -> Result<Uuid, VaultError> {
        let storage = &self.cfg.get_storage();
        let seed_source = match seed.seed_type {
//            SeedDefinitionType::Ledger => {
//                SeedSource::Ledger(LedgerSource {
//                    fingerprints: vec![]
//                })
//            },
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