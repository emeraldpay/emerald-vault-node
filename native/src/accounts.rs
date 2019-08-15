use neon::prelude::*;
use emerald_rs::storage::AccountInfo;

pub struct AccountData {
    pub address: String,
    pub name: String,
    pub description: String,
    pub hidden: bool,
    pub hardware: bool
}

impl From<&AccountInfo> for AccountData {

    fn from(src: &AccountInfo) -> Self {
        AccountData {
            address: src.address.clone(),
            name: src.name.clone(),
            description: src.description.clone(),
            hidden: src.is_hidden,
            hardware: src.is_hardware
        }
    }
}

pub trait AsJsObject {
    fn as_js_object<'a, C: Context<'a>>(&self, cx: &mut C) -> Handle<'a, JsObject>;
}


impl AsJsObject for AccountData {

    fn as_js_object<'a, C: Context<'a>>(&self, cx: &mut C) -> Handle<'a, JsObject> {
        let account_js = JsObject::new(cx);

        let address_handle = cx.string(&self.address);
        account_js.set(cx, "address", address_handle).unwrap();
        let name_handle = cx.string(&self.name);
        account_js.set(cx, "name", name_handle).unwrap();
        let description_handle = cx.string(&self.description);
        account_js.set(cx, "description", description_handle).unwrap();
        let hidden_handle = cx.boolean(self.hidden);
        account_js.set(cx, "hidden", hidden_handle).unwrap();
        let hardware_handle = cx.boolean(self.hardware);
        account_js.set(cx, "hardware", hardware_handle).unwrap();

        return account_js
    }
}