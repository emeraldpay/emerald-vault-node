use neon::object::Object;
use neon::prelude::{FunctionContext, JsString};
use uuid::Uuid;

use access::{MigrationConfig, VaultConfig, WrappedVault};
use emerald_vault::storage::admin::VaultAdmin;
use emerald_vault::storage::global_key::LegacyEntryRef;
use errors::VaultNodeError;

#[neon_frame_fn]
pub fn migrate(cx: &mut FunctionContext) -> Result<bool, VaultNodeError> {
    let cfg = MigrationConfig::get_config(cx)?;
    emerald_vault::migration::auto_migrate(cfg.dir.clone());

    Ok(true)
}

#[neon_frame_fn]
pub fn autofix(cx: &mut FunctionContext) -> Result<usize, VaultNodeError> {
    let cfg = VaultConfig::get_config( cx)?;
    let storage = cfg.get_storage();

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

#[neon_frame_fn(channel=1)]
pub fn list_odd<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<Vec<LegacyEntryRefJson>, VaultNodeError>) + Send + 'static {

    let cfg = VaultConfig::get_config(cx)?;

    std::thread::spawn(move || {
        let storage = cfg.get_storage();
        let result: Result<Vec<LegacyEntryRefJson>, VaultNodeError> = storage.get_global_key_missing()
            .map(|l| l.iter().map(|r| LegacyEntryRefJson::from(r)).collect())
            .map_err(VaultNodeError::from);
        handler(result);
    });
    Ok(())
}

#[neon_frame_fn(channel=3)]
pub fn upgrade_odd<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<Vec<Uuid>, VaultNodeError>) + Send + 'static {

    let password = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "legacy_password".to_string()))?
        .value(cx);
    let global_password = cx
        .argument::<JsString>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "new_password".to_string()))?
        .value(cx);

    let cfg = VaultConfig::get_config(cx)?;

    std::thread::spawn(move || {
        let storage = cfg.get_storage();
        let admin = VaultAdmin::create(storage);
        let result = admin.upgrade_all_legacy(password.as_str(), global_password.as_str());
        handler(Ok(result));
    });
    Ok(())
}