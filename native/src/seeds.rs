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
    let id = HDPath::try_from("m/44'/60'/0'/0'/0").expect("Failed to create address");
    let mut wallet_manager = WManager::new(Some(id.to_bytes())).expect("Can't create HID endpoint");
    let is_connected = wallet_manager.open().is_ok();

    let result = cx.boolean(is_connected);
    Ok(result)
}

pub fn list_addresses(mut cx: FunctionContext) -> JsResult<JsObject> {
    let id = HDPath::try_from("m/44'/60'/0'/0'/0").expect("Failed to create address");
    let mut wallet_manager = WManager::new(Some(id.to_bytes())).expect("Can't create HID endpoint");
    let mut js_object = JsObject::new(&mut cx);
    if !wallet_manager.open().is_ok() {
        return Ok(js_object);
    }
    wallet_manager.update(None).expect("Devices list not loaded");

    let hd_path_all = cx.argument::<JsArray>(1)
        .expect("List of HD Path is not provided")
        .to_vec(&mut cx)
        .expect("Failed to convert to Rust vector");

    let fd = &wallet_manager.devices()[0].1;

    for item in hd_path_all {
        let hd_path_str = item.downcast::<JsString>().expect("Expected string element in array").value();
        let hd_path = HDPath::try_from(hd_path_str.as_str()).expect("Failed to create address");

        let address = wallet_manager.get_address(fd.as_str(), Some(hd_path.to_bytes()))
            .expect("Filed to get address from Ledger");

        let address = cx.string(address.to_string());
        js_object.set(&mut cx, hd_path.to_string().as_str(), address).expect("Failed to setup result");
    }

    Ok(js_object)
}