use neon::prelude::{FunctionContext, JsArray, JsResult};

use access::MigrationConfig;

pub fn migrate(mut cx: FunctionContext) -> JsResult<JsArray> {
    let cfg = MigrationConfig::get_config(&mut cx);
    emerald_vault::migration::auto_migrate(cfg.dir.clone());

    //TODO
    let result = JsArray::new(&mut cx, 0 as u32);
    Ok(result)
}