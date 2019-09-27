use emerald_rs::storage::{StorageController, AccountInfo};
use emerald_rs::core::Chain;
use emerald_rs::keystore::KeyFile;
use emerald_rs::Address;

use std::path::{Path};
use neon::prelude::{FunctionContext, JsString, JsObject};
use neon::object::{Object};
use std::str::FromStr;

pub struct VaultConfig {
    pub chain: Chain,
    pub dir: String,
    pub show_hidden: bool
}

impl VaultConfig {

    pub fn get_config(cx: &mut FunctionContext) -> VaultConfig {
        let config = cx.argument::<JsObject>(0).unwrap();
        let dir = config.get(cx, "dir").unwrap().downcast::<JsString>()
            .expect("Base Dir is not provided")
            .value();
        let chain = config.get(cx, "chain").unwrap().downcast::<JsString>()
            .expect("Chain is not provided")
            .value();
        return VaultConfig {
            chain: Chain::from_str(chain.as_str()).expect("Invalid chain"),
            dir: dir.to_string(),
            show_hidden: false
        }
    }

    pub fn get_storage(&self) -> StorageController {
        let dir = Path::new(&self.dir);
        let storage_ctrl = StorageController::new(dir);
        let s = storage_ctrl.expect("Unable to setup storage");
        s
    }

}

pub struct Vault {
    cfg: VaultConfig
}

impl Vault {

    pub fn new(cfg: VaultConfig) -> Vault {
        Vault{cfg}
    }

    pub fn list_accounts(&self) -> Vec<AccountInfo> {
        let storage = &self.cfg.get_storage();
        let ks = storage.get_keystore(&self.cfg.chain.get_path_element())
            .expect("Keyfile Storage not opened");
        ks.list_accounts(false).expect("No accounts loaded")
    }

    pub fn put(&self, pk: &KeyFile) {
        let storage = &self.cfg.get_storage();
        let ks = storage.get_keystore(&self.cfg.chain.get_path_element())
            .expect("Keyfile Storage not opened");
        ks.put(&pk).expect("Keyfile not saved");
    }

    pub fn get(&self, addr: &Address) -> KeyFile {
        let storage = &self.cfg.get_storage();
        let ks = storage.get_keystore(&self.cfg.chain.get_path_element())
            .expect("Keyfile Storage not opened");
        let (_, kf) = ks.search_by_address(&addr).expect("Address not found");
        kf
    }

    pub fn remove(&self, addr: &Address) {
        let storage = &self.cfg.get_storage();
        let ks = storage.get_keystore(&self.cfg.chain.get_path_element())
            .expect("Keyfile Storage not opened");
        ks.delete(&addr).expect("Address not deleted");
    }

}