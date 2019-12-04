use emerald_rs::storage::{ AccountInfo, default_path};
use emerald_rs::core::chains::{Blockchain, EthereumChainId};
use emerald_rs::keystore::KeyFile;
use emerald_rs::{Address};
use emerald_rs::storage::{
    error::VaultError,
    vault::{
        VaultStorage, VaultAccess
    }
};
use emerald_rs::convert::ethereum::EthereumJsonV3File;

use std::path::{Path};
use neon::prelude::{FunctionContext, JsString, JsObject};
use neon::object::{Object};
use std::str::FromStr;
use neon::types::{JsNull, JsUndefined,};
use neon::handle::Handle;
use uuid::Uuid;
use emerald_rs::convert::proto::{
    types::HasUuid,
    wallet::{AddressType, Wallet, WalletAccount},
    pk::PrivateKeyHolder
};
use std::convert::TryFrom;

pub struct VaultConfig {
    pub chain: EthereumChainId,
    pub dir: String,
    pub show_hidden: bool
}

fn get_str(cx: &mut FunctionContext, obj: &Handle<JsObject>, name: &str) -> Option<String> {
    match obj.get(cx, name) {
        Ok(val) => {
            if val.is_a::<JsNull>() {
                None
            } else if val.is_a::<JsUndefined>() {
                None
            } else {
                Some(val.downcast::<JsString>().expect("Not a string").value())
            }
        },
        Err(_) => None
    }
}

impl VaultConfig {

    pub fn get_config(cx: &mut FunctionContext) -> VaultConfig {
        let config = cx.argument::<JsObject>(0).unwrap();
        let dir = match get_str(cx, &config, "dir") {
            Some(val) => val,
            None => default_path().to_str().expect("No default path for current OS").to_string()
        };
        let chain = config.get(cx, "chain").unwrap().downcast::<JsString>()
            .expect("Chain is not provided")
            .value();
        return VaultConfig {
            chain: EthereumChainId::from_str(chain.as_str()).expect("Invalid chain"),
            dir: dir.to_string(),
            show_hidden: false
        }
    }

    pub fn get_storage(&self) -> VaultStorage {
        let dir = Path::new(&self.dir);
        let vault = VaultStorage::create(dir)
            .expect("Vault is not created");
        vault
    }
}

fn find_account<'a>(w: &'a Wallet, addr: &Address, blockchain: Blockchain) -> Option<&'a WalletAccount> {
    w.accounts.iter()
        .find(|a| {
            let address_match = match &a.address {
                AddressType::Ethereum(e) => e.address.is_some() && e.address.unwrap() == *addr
            };
            address_match && a.blockchain == blockchain
        })
}

pub struct WrappedVault {
    cfg: VaultConfig
}

impl WrappedVault {

    pub fn new(cfg: VaultConfig) -> WrappedVault {
        WrappedVault {cfg}
    }

    fn get_blockchain(&self) -> Blockchain {
        Blockchain::try_from(self.cfg.chain).expect("Unsupported chain")
    }

    fn load_wallets(&self) -> Vec<Wallet> {
        let storage = &self.cfg.get_storage();
        let wallets: Vec<Wallet> = storage.wallets().list().expect("Wallets are not loaded")
            .iter()
            .map(|id| storage.wallets().get(id))
            .map(|w| w.ok())
            .filter(|w| w.is_some())
            .map(|w| w.unwrap())
            .collect();
        wallets
    }

    pub fn list_accounts(&self) -> Vec<AccountInfo> {
        let storage = &self.cfg.get_storage();
        let wallets = storage.wallets().list().expect("Vault not opened");

        let result = wallets.iter()
            .map(|id| storage.wallets().get(id))
            .map(|w| w.ok())
            .filter(|w| w.is_some())
            .map(|w| w.unwrap())
            .filter(|w|
                //TODO workaround for compatibility, REMOVE IT
                w.accounts.len() == 1 && w.accounts.first().unwrap().blockchain == self.get_blockchain()
            )
            .map(|w| AccountInfo::from(w))
            .collect();

        result
    }

    pub fn import_pk(&self, pk: Vec<u8>, password: &str, label: Option<String>) -> Uuid {
        let storage = &self.cfg.get_storage();
        let id = storage.create_new()
            .raw_pk(pk, password, self.get_blockchain())
            .expect("PrivateKey not imported");
        id
    }

    pub fn put(&self, pk: &EthereumJsonV3File) -> Uuid {
        let storage = &self.cfg.get_storage();
        let id = storage.create_new().ethereum(pk, self.get_blockchain())
            .expect("Keyfile not saved");
        id
    }

    pub fn get_wallet_by_addr(&self, addr: &Address) -> Option<Wallet> {
        let storage = &self.cfg.get_storage();

        let wallets = self.load_wallets();
        let wallet = wallets.iter()
            .find( |w| find_account(w, addr, self.get_blockchain()).is_some());

        wallet.cloned()
    }

    pub fn update(&self, wallet: Wallet) -> Result<(), VaultError> {
        let storage = &self.cfg.get_storage();
        //TODO remove after!!!
        storage.wallets().remove(&wallet.id)?;
        storage.wallets().add(wallet)?;
        Ok(())
    }

    pub fn get(&self, addr: &Address) -> PrivateKeyHolder {
        let storage = &self.cfg.get_storage();

        let wallet = self.get_wallet_by_addr(addr);

        let wallet = wallet.expect("Account with specified address is not found");
        let account = find_account(&wallet, addr, self.get_blockchain()).unwrap();
        let key = storage.keys().get(&account.get_id()).expect("Private Key not found");

        key
    }

    pub fn get_wallet_address(&self, id: Uuid) -> Result<Address, VaultError> {
        let storage = &self.cfg.get_storage();
        let wallet = storage.wallets().get(&id)?;
        match &wallet.accounts.first()
            .expect("Wallet without address")
            .address {
            AddressType::Ethereum(e) => Ok(e.address.unwrap())
        }
    }

    pub fn remove(&self, addr: &Address) {
        let storage = &self.cfg.get_storage();

        let wallet = self.get_wallet_by_addr(addr);
        let wallet = wallet.expect("Account with specified address is not found");

        if wallet.accounts.len() != 1 {
            panic!("Wallet contains multiple addresses, deletion is not implemented");
        }

        storage.wallets().remove(&wallet.id)
            .expect("Previous wallet not removed");
        storage.keys().remove(&wallet.accounts.first().unwrap().get_id())
            .expect("Wallet not created");
    }

}