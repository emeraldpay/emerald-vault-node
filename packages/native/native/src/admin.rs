use neon::prelude::{FunctionContext, JsString};
use uuid::Uuid;

use emerald_vault::storage::admin::VaultAdmin;
use emerald_vault::storage::global_key::LegacyEntryRef;
use errors::VaultNodeError;
use instance::{Instance};

#[neon_frame_fn]
pub fn migrate(_cx: &mut FunctionContext) -> Result<bool, VaultNodeError> {
    let vault = Instance::get_vault()?;
    let vault = vault.lock().unwrap();

    emerald_vault::migration::auto_migrate(vault.cfg.dir.clone());

    Ok(true)
}

#[neon_frame_fn]
pub fn autofix(_cx: &mut FunctionContext) -> Result<usize, VaultNodeError> {
    let vault = Instance::get_vault()?;
    let vault = vault.lock().unwrap();
    let storage = vault.cfg.get_storage();

    storage.revert_backups()
        .map_err(|e| VaultNodeError::OtherProcessing(format!("Failed to recover Vault. {:?}", e)))
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", content = "id")]
pub enum LegacyEntryRefJson {
    #[serde(rename = "seed")]
    Seed(String),
    #[serde(rename = "key")]
    PrivateKey(String),
}

impl From<&LegacyEntryRef> for LegacyEntryRefJson {
    fn from(r: &LegacyEntryRef) -> Self {
        match r {
            LegacyEntryRef::Seed(id) => LegacyEntryRefJson::Seed(id.to_string()),
            LegacyEntryRef::PrivateKey(id) => LegacyEntryRefJson::PrivateKey(id.to_string()),
        }
    }
}

#[neon_frame_fn(channel=0)]
pub fn list_odd<H>(_cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<Vec<LegacyEntryRefJson>, VaultNodeError>) + Send + 'static {

    let vault = Instance::get_vault()?;

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let storage = vault.cfg.get_storage();
        let result: Result<Vec<LegacyEntryRefJson>, VaultNodeError> = storage.get_global_key_missing()
            .map(|l| l.iter().map(|r| LegacyEntryRefJson::from(r)).collect())
            .map_err(VaultNodeError::from);
        handler(result);
    });
    Ok(())
}

#[neon_frame_fn(channel=2)]
pub fn upgrade_odd<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<Vec<Uuid>, VaultNodeError>) + Send + 'static {

    let password = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "legacy_password".to_string()))?
        .value(cx);
    let global_password = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "new_password".to_string()))?
        .value(cx);

    let vault = Instance::get_vault()?;

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let storage = vault.cfg.get_storage();
        let admin = VaultAdmin::create(storage);
        let result = admin.upgrade_all_legacy(password.as_str(), global_password.as_str());
        handler(Ok(result));
    });
    Ok(())
}