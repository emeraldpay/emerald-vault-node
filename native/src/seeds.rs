use neon::prelude::*;
use emerald_rs::{
    hdwallet::{
        WManager,
        bip32::{HDPath, path_to_arr}
    }
};

//fn list_seed(mut cx: FunctionContext) -> JsResult<JsArray> {
//
//}

pub fn is_connected(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let hd = path_to_arr("m/50'/0'/0'/0'").expect("Failed to create address");
    let wallet_manager = WManager::new(Some(hd)).expect("Can't create HID endpoint");
    let is_connected = wallet_manager.open().is_ok();

    let result = cx.boolean(is_connected);
    Ok(result)
}

// pub fn list_address(mut cx: FunctionContext) -> JsResult<JsArray> {
//
// }