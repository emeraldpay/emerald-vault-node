use emerald_rs::storage::{
    KeyfileStorage, StorageController, default_path,
    keyfile::{KeystoreError}
};
use std::path::{Path, PathBuf};
use neon::prelude::{FunctionContext, CallContext, Context, JsString, JsObject};
use neon::object::{This, Object, PropertyKey};


pub struct VaultConfig {
    pub chain: String,
    pub dir: Option<String>,
    pub show_hidden: bool
}


impl VaultConfig {

    pub fn get_config(cx: &mut FunctionContext) -> VaultConfig {
        let config = cx.argument::<JsObject>(0).unwrap();
        let dir = config.get(cx, "dir").unwrap().downcast::<JsString>().unwrap().value();
        let chain = config.get(cx, "chain").unwrap().downcast::<JsString>().unwrap().value();
        return VaultConfig {
            chain: chain.to_string(),
            dir: Some(dir.to_string()),
            show_hidden: false
        }
    }

    pub fn get_storage(&self) -> StorageController {
        let dir = match &self.dir {
            Some(p) => PathBuf::from(p),
            None => default_path()
        };
        let storage_ctrl = StorageController::new(dir);
        return storage_ctrl.unwrap();
    }

    pub fn get_keystore<'a>(&self, storage: &'a StorageController) -> &'a Box<KeyfileStorage> {
        return Box::new(storage.get_keystore(self.chain.as_str())).unwrap()
    }
}