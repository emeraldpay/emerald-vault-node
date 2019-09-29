use emerald_rs::storage::{StorageController, AccountInfo, default_path};
use emerald_rs::core::Chain;
use emerald_rs::keystore::KeyFile;
use emerald_rs::Address;

use std::path::{Path};
use neon::prelude::{FunctionContext, JsString, JsObject};
use neon::object::{Object};
use std::str::FromStr;
use neon::types::{JsNull, JsUndefined,};
use neon::handle::Handle;

pub struct VaultConfig {
    pub chain: Chain,
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