use std::convert::{TryFrom, TryInto};
use std::str::FromStr;

use neon::prelude::{FunctionContext, JsNumber, JsString};
use uuid::Uuid;

use access::{args_get_str, VaultConfig, WrappedVault, AccountIndex};
use chrono::{DateTime, Utc};
use emerald_vault::{
    blockchain::{
        chains::Blockchain,
        chains::BlockchainType,
    },
    convert::json::keyfile::EthereumJsonV3File,
    storage::entry::AddEntryOptions,
    error::VaultError,
    structs::{
        wallet::Wallet,
        wallet::{EntryId, PKType, ReservedPath, WalletEntry, AddressRole, EntryAddress},
        seed::{LedgerSource, Seed, SeedSource},
        book::AddressRef,
    },
    trim_hex,
    EthereumAddress,
    EthereumPrivateKey,
};
use hdpath::{StandardHDPath, AccountHDPath};
use seeds::{SeedDefinitionOrReferenceJson, SeedDefinitionOrReferenceType};
use address::AddressRefJson;
use bitcoin::Address;
use emerald_vault::blockchain::bitcoin::XPub;
use errors::{VaultNodeError, JsonError};

#[derive(Deserialize, Clone)]
pub struct AddEntryJson {
    pub blockchain: u32,
    #[serde(flatten)]
    pub key_value: AddEntryType,
    pub password: Option<String>,
    #[serde(rename = "jsonPassword")]
    pub json_password: Option<String>,
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
    #[serde(rename = "seed")]
    pub seed: SeedDefinitionOrReferenceJson,
    #[serde(rename = "hdPath")]
    pub hd_path: String,
    pub password: Option<String>,
    pub address: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct WalletEntryJson {
    pub id: String,
    pub blockchain: u32,
    pub address: Option<AddressRefJson>,
    #[serde(rename = "receiveDisabled")]
    pub receive_disabled: bool,
    pub label: Option<String>,
    pub key: KeyRefJson,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    pub addresses: Vec<CurrentAddressJson>,
    pub xpub: Vec<CurrentXpubJson>
}

#[derive(Serialize, Clone)]
pub struct CurrentAddressJson {
    pub address: String,
    #[serde(rename = "hdPath")]
    pub hd_path: String,
    pub role: String,
}

#[derive(Serialize, Clone)]
pub struct CurrentXpubJson {
    pub xpub: String,
    pub role: String,
}

#[derive(Serialize, Clone)]
pub struct SeedHDPathJson {
    #[serde(rename = "seedId")]
    pub seed_id: String,
    #[serde(rename = "hdPath")]
    pub hd_path: String,
}

#[derive(Serialize, Clone)]
pub struct PkIdJson {
    #[serde(rename = "keyId")]
    pub id: String,
}

#[derive(Serialize, Clone)]
#[serde(tag = "type")]
pub enum KeyRefJson {
    #[serde(rename = "pk")]
    PrivateKey(PkIdJson),
    #[serde(rename = "hd-path")]
    HdPath(SeedHDPathJson),
}

#[derive(Serialize, Clone)]
pub struct WalletJson {
    pub id: String,
    pub name: Option<String>,
    pub entries: Vec<WalletEntryJson>,
    pub reserved: Vec<ReservedAccountJson>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
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

impl<T: ToString> From<&EntryAddress<T>> for CurrentAddressJson {
    fn from(value: &EntryAddress<T>) -> Self {
        CurrentAddressJson {
            address: value.address.to_string(),
            role: value.role.to_string(),
            hd_path: value.hd_path.as_ref().map_or("".to_string(), |p| p.to_string()),
        }
    }
}

impl TryFrom<(&WalletEntry, &Wallet, Option<&AccountIndex>)> for WalletEntryJson {
    type Error = VaultNodeError;

    fn try_from(value: (&WalletEntry, &Wallet, Option<&AccountIndex>)) -> Result<Self, Self::Error> {
        let a = value.0;
        let wallet = value.1;
        let index = value.2;
        let result = WalletEntryJson {
            id: EntryId::from(wallet, a).to_string(),
            blockchain: a.blockchain as u32,
            address: a.address.as_ref().map(|v| v.clone().into()),
            receive_disabled: a.receive_disabled,
            label: a.label.clone(),
            key: match &a.key {
                PKType::SeedHd(seed) => KeyRefJson::HdPath(SeedHDPathJson {
                    seed_id: seed.seed_id.to_string(),
                    hd_path: seed.hd_path.to_string(),
                }),
                PKType::PrivateKeyRef(pk_id) => KeyRefJson::PrivateKey(PkIdJson {
                    id: pk_id.to_string(),
                }),
            },
            created_at: a.created_at,
            addresses: with_std_addresses(a, index),
            xpub: match &a.address {
                Some(address) => {
                    match address {
                        AddressRef::ExtendedPub(xpub) => {
                            if xpub.is_account() {
                                vec![
                                    CurrentXpubJson {
                                        xpub: xpub.for_receiving()
                                            .map_err(|_| VaultNodeError::MissingData("no receive address".to_string()))?
                                            .to_string(),
                                        role: "receive".to_string(),
                                    },
                                    CurrentXpubJson {
                                        xpub: xpub.for_change()
                                            .map_err(|_| VaultNodeError::MissingData("no change address".to_string()))?
                                            .to_string(),
                                        role: "change".to_string(),
                                    }
                                ]
                            } else {
                                vec![
                                    CurrentXpubJson {
                                        xpub: xpub.to_string(),
                                        role: "receive".to_string(),
                                    }
                                ]
                            }
                        },
                        _ => vec![]
                    }
                },
                None => vec![]
            }
        };
        Ok(result)
    }
}

fn indexes_for_entry<'a>(wallet: &Wallet, entry: &WalletEntry, all: &'a Vec<AccountIndex>) -> Option<&'a AccountIndex> {
    all.iter().find(|s| s.wallet_id == wallet.id && s.entry_id == entry.id)
}

impl From<(Wallet, &Vec<AccountIndex>)> for WalletJson {
    fn from(value: (Wallet, &Vec<AccountIndex>)) -> Self {
        let wallet = value.0;
        let indexes = value.1;
        let entries: Vec<WalletEntryJson> = wallet
            .entries
            .iter()
            .map(|a| (a, &wallet, indexes_for_entry(&wallet, &a, indexes)))
            .map(|a| a.try_into())
            .filter(|a| a.is_ok()) //TODO return error?
            .map(|a| a.unwrap())
            .collect();
        let reserved: Vec<ReservedAccountJson> = wallet
            .reserved
            .iter()
            .map(|x| ReservedAccountJson::from(x.clone()))
            .collect();
        WalletJson {
            id: wallet.id.clone().to_string(),
            name: wallet.label,
            entries,
            reserved,
            created_at: wallet.created_at,
        }
    }
}

fn read_wallet_id(cx: &mut FunctionContext, pos: i32) -> Result<Uuid, VaultNodeError> {
    let wallet_id = cx
        .argument::<JsString>(pos)
        .map_err(|_| VaultNodeError::ArgumentMissing(pos as usize, "wallet_id".to_string()))?
        .value(cx);
    Uuid::parse_str(wallet_id.as_str()).map_err(|_| VaultNodeError::InvalidArgument(pos as usize))
}

fn read_wallet_and_entry_ids(cx: &mut FunctionContext, pos: i32) -> Result<(Uuid, usize), VaultNodeError> {
    let wallet_id = cx
        .argument::<JsString>(pos)
        .map_err(|_| VaultNodeError::ArgumentMissing(pos as usize, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::parse_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(pos as usize))?;

    let entry_id = cx
        .argument::<JsNumber>(pos + 1)
        .map_err(|_| VaultNodeError::ArgumentMissing(pos as usize + 1, "entry_id".to_string()))?
        .value(cx);
    let entry_id = entry_id as usize;

    Ok((wallet_id, entry_id))
}

fn with_std_addresses(entry: &WalletEntry, index: Option<&AccountIndex>) -> Vec<CurrentAddressJson> {
    let index = match index {
        None =>
        //start from beginning
            AccountIndex {
                wallet_id: Default::default(),
                entry_id: 0,
                receive: 0,
                change: 0,
            },
        Some(value) => value.clone()
    };
    match entry.blockchain.get_type() {
        BlockchainType::Bitcoin => {
            // we need two addresses, one for Receiving, and one for Change
            let mut results = vec![];
            entry.get_addresses::<Address>(AddressRole::Receive, index.receive, 1)
                .or_else::<Vec<Address>, _>(|_| Ok(vec![]))
                .unwrap()
                .iter()
                .map(|a| CurrentAddressJson::from(a))
                .for_each(|a| results.push(a));
            entry.get_addresses::<Address>(AddressRole::Change, index.change, 1)
                .or_else::<Vec<Address>, _>(|_| Ok(vec![]))
                .unwrap()
                .iter()
                .map(|a| CurrentAddressJson::from(a))
                .for_each(|a| results.push(a));
            results
        },
        _ => vec![]
    }
}

impl WrappedVault {
    fn create_wallet(&self, options: AddWalletJson) -> Result<Uuid, VaultError> {
        let storage = &self.cfg.get_storage();
        let id = Uuid::new_v4();
        let reserved = options
            .reserved
            .unwrap_or(Vec::new())
            .iter()
            .map(|r| ReservedPath::from(r.clone()))
            .collect();
        storage
            .wallets()
            .add(Wallet {
                id: id.clone(),
                label: options.name,
                reserved,
                ..Wallet::default()
            })
            .map(|_| id)
    }

    fn create_entry(&self, wallet_id: Uuid, entry: AddEntryJson) -> Result<usize, VaultNodeError> {
        let blockchain = Blockchain::try_from(entry.blockchain)
            .map_err(|_| VaultNodeError::InvalidArgumentByName("Blockchain".to_string()))?;
        let storage = &self.cfg.get_storage();
        let result = match entry.key_value {
            AddEntryType::EthereumJson(json) => {
                let json = EthereumJsonV3File::try_from(json)
                    .map_err(|_| VaultNodeError::InvalidArgumentValue("Invalid Web3 JSON format".to_string()))?;
                let json_password = entry.json_password
                    .ok_or(VaultNodeError::JsonError(JsonError::MissingField("json_password".to_string())))?;
                if entry.password.is_none() {
                    return Err(VaultNodeError::from(JsonError::MissingField("password".to_string())));
                }
                let id = storage.add_ethereum_entry(wallet_id)
                    .json(&json, json_password.as_str(), blockchain, entry.password.unwrap().as_str())?;
                id
            }
            AddEntryType::RawHex(hex) => {
                if entry.password.is_none() {
                    return Err(VaultNodeError::from(JsonError::MissingField("password".to_string())));
                }
                let hex = trim_hex(hex.as_str());
                let hex = hex::decode(hex)?;
                storage.add_ethereum_entry(wallet_id).raw_pk(
                    hex,
                    entry.password.unwrap().as_str(),
                    blockchain,
                )?
            }
            AddEntryType::HdPath(hd) => {
                let expected_ethereum_address = match &hd.address {
                    Some(s) => EthereumAddress::from_str(s.as_str()).ok(),
                    None => None
                };
                let bitcoin_opts = AddEntryOptions {
                    seed_password: hd.seed.password.clone(),
                    xpub: hd.address.and_then(|xpub| XPub::from_str(xpub.as_str()).ok()),
                    ..Default::default()
                };
                match hd.seed.value {
                    SeedDefinitionOrReferenceType::Reference(seed_id) => {
                        //TODO duplicate with ledger
                        match blockchain.get_type() {
                            BlockchainType::Ethereum =>
                                storage.add_ethereum_entry(wallet_id).seed_hd(
                                    seed_id,
                                    StandardHDPath::from_str(hd.hd_path.as_str())?,
                                    blockchain,
                                    hd.seed.password,
                                    expected_ethereum_address,
                                )?,
                            BlockchainType::Bitcoin =>
                                storage.add_bitcoin_entry(wallet_id).seed_hd(
                                    seed_id,
                                    AccountHDPath::from_str(hd.hd_path.as_str())?,
                                    blockchain,
                                    bitcoin_opts,
                                )?
                        }
                    }
                    SeedDefinitionOrReferenceType::Ledger => {
                        let seeds = storage.seeds().list_entries()?;
                        let ledger = seeds.iter().find(|s| match s.source {
                            SeedSource::Ledger(_) => true,
                            _ => false,
                        });
                        let seed_id = match ledger {
                            Some(seed) => seed.id,
                            None => storage.seeds().add(Seed {
                                id: Uuid::new_v4(),
                                source: SeedSource::Ledger(LedgerSource {
                                    fingerprints: vec![],
                                }),
                                label: None,
                                created_at: Utc::now(),
                            })?,
                        };
                        match blockchain.get_type() {
                            BlockchainType::Ethereum =>
                                storage.add_ethereum_entry(wallet_id).seed_hd(
                                    seed_id,
                                    StandardHDPath::from_str(hd.hd_path.as_str())?,
                                    blockchain,
                                    hd.seed.password,
                                    expected_ethereum_address,
                                )?,
                            BlockchainType::Bitcoin =>
                                storage.add_bitcoin_entry(wallet_id).seed_hd(
                                    seed_id,
                                    AccountHDPath::from_str(hd.hd_path.as_str())?,
                                    blockchain,
                                    bitcoin_opts,
                                )?
                        }
                    }
                    SeedDefinitionOrReferenceType::Mnemonic(_) =>
                        return Err(VaultNodeError::OtherInput("Direct creation from Mnemonic is not implemented. Create Seed first".to_string()))
                }
            }
            AddEntryType::GenerateRandom => {
                if entry.password.is_none() {
                    return Err(VaultNodeError::from(JsonError::MissingField("password".to_string())));
                }
                let pk = EthereumPrivateKey::gen();
                storage.add_ethereum_entry(wallet_id).raw_pk(
                    pk.0.to_vec(),
                    entry.password.unwrap().as_str(),
                    blockchain,
                )?
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
            return Ok(false);
        }
        wallet.entries.remove(index.unwrap());
        storage.wallets().update(wallet)
    }

    fn remove(&self, wallet_id: Uuid) -> Result<bool, VaultError> {
        let storage = &self.cfg.get_storage();
        storage.remove_wallet(wallet_id)
    }
}

#[neon_frame_fn]
pub fn list(cx: &mut FunctionContext) -> Result<Vec<WalletJson>, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg.clone());
    let wallets = vault.load_wallets()?;

    let mut result = Vec::new();
    for w in wallets {
        result.push(WalletJson::from((w, &cfg.account_indexes)));
    }

    Ok(result)
}

#[neon_frame_fn]
pub fn add(cx: &mut FunctionContext) -> Result<Uuid, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg);

    let json = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "json".to_string()))?
        .value(cx);
    let parsed: AddWalletJson = serde_json::from_str(json.as_str())
        .map_err(|_| JsonError::InvalidData)?;

     vault.create_wallet(parsed).map_err(VaultNodeError::from)
}

#[neon_frame_fn]
pub fn add_entry_to_wallet(cx: &mut FunctionContext) -> Result<usize, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg);

    let wallet_id = read_wallet_id(cx, 1)?;
    let json = cx
        .argument::<JsString>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "json".to_string()))?
        .value(cx);

    let parsed: AddEntryJson = serde_json::from_str(json.as_str())
        .map_err(|_| JsonError::InvalidData)?;

    vault.create_entry(wallet_id, parsed).map_err(VaultNodeError::from)
}

#[neon_frame_fn]
pub fn update_label(cx: &mut FunctionContext) -> Result<bool, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg);

    let wallet_id = read_wallet_id(cx, 1)?;

    let title = args_get_str(cx, 2);
    vault.set_title(wallet_id, title).map(|_| true).map_err(VaultNodeError::from)
}

#[neon_frame_fn]
pub fn remove_entry(cx: &mut FunctionContext) -> Result<bool, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg);

    let (wallet_id, entry_id) = read_wallet_and_entry_ids(cx, 1)?;

    vault.remove_entry(wallet_id, entry_id).map_err(VaultNodeError::from)
}

#[neon_frame_fn]
pub fn remove(cx: &mut FunctionContext) -> Result<bool, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg);

    let wallet_id = read_wallet_id(cx, 1)?;
    vault.remove(wallet_id).map_err(VaultNodeError::from)
}
