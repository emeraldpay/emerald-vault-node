use neon::prelude::{FunctionContext, JsArray, JsNumber, JsResult};

use access::{MigrationConfig, VaultConfig};

pub fn migrate(mut cx: FunctionContext) -> JsResult<JsArray> {
    let cfg = MigrationConfig::get_config(&mut cx);
    emerald_vault::migration::auto_migrate(cfg.dir.clone());

    //TODO
    let result = JsArray::new(&mut cx, 0 as u32);
    Ok(result)
}

pub fn autofix(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let cfg = VaultConfig::get_config(&mut cx);
    let storage = cfg.get_storage();
    let recovered = match storage.revert_backups() {
        Ok(count) => count as i32,
        Err(e) => {
            println!("Failed to recover Vault. {:?}", e); //TODO use log
            -1
        }
    };

    //TODO
    let result = JsNumber::new(&mut cx, recovered);
    Ok(result)
}
