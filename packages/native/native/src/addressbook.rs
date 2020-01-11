use std::str::FromStr;

use neon::prelude::*;
use uuid::Uuid;

use access::{VaultConfig, WrappedVault};
use emerald_vault::{
    Address,
    core::chains::Blockchain,
    storage::{
        addressbook::AddressBookmark,
        vault::VaultAccess
    },
    structs::{
        book::AddressRef,
        book::BookmarkDetails
    },
};
use json::StatusResult;
use std::convert::TryFrom;

#[derive(Serialize, Clone)]
struct AddressBookmarkJson {
    pub address: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub blockchain: u32
}

#[derive(Deserialize, Debug)]
pub struct NewAddressBookItem {
    pub name: Option<String>,
    pub description: Option<String>,
    pub address: Address,
    pub blockchain: u32
}

impl From<&AddressBookmark> for AddressBookmarkJson {
    fn from(value: &AddressBookmark) -> Self {
        AddressBookmarkJson {
            address: match &value.details.address {
                AddressRef::EthereumAddress(address) => {
                    address.to_string()
                }
            },
            name: value.details.label.clone(),
            description: value.details.description.clone(),
            blockchain: value.details.blockchain as u32
        }
    }
}

impl NewAddressBookItem {
    pub fn into_bookmark(self, blockchain: Blockchain) -> AddressBookmark {
        AddressBookmark {
            id: Uuid::new_v4(),
            details: BookmarkDetails {
                blockchain,
                label: self.name,
                description: self.description,
                address: AddressRef::EthereumAddress(self.address)
            }
        }
    }
}

impl WrappedVault {
    fn list_addressbook(&self) -> Vec<AddressBookmark> {
        let storage = &self.cfg.get_storage();
        let all = storage.addressbook().get_all().expect("Addressbook unavailable");

        let for_chain = all.iter()
            .map(|b| b.clone())
            .collect();

        for_chain
    }

    fn add_to_addressbook(&self, item: NewAddressBookItem) -> bool {
        let storage = &self.cfg.get_storage();
        let blockchain = Blockchain::try_from(item.blockchain).expect("Invalid blockchain id");
        storage.addressbook().add(item.into_bookmark(blockchain)).is_ok()
    }

    fn remove_addressbook_by_addr(&self, address: &Address) -> bool {
        let storage = &self.cfg.get_storage();

        let list = self.list_addressbook();
        let found = list.iter().find(|x| match x.details.address {
            AddressRef::EthereumAddress(a) => a == *address
        });

        if found.is_some() {
            match storage.addressbook().remove(found.unwrap().id) {
                Ok(r) => r,
                Err(_) => false
            }
        } else {
            false
        }
    }
}

pub fn list(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let list = vault.list_addressbook();

    let result: Vec<AddressBookmarkJson> = list.iter()
        .map(|b| AddressBookmarkJson::from(b))
        .collect();

    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn add(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let chain_code = cfg.chain.clone();
    let vault = WrappedVault::new(cfg);


    let add_js = cx.argument::<JsString>(1)
        .expect("Address Book item not provided").value();
    let item = serde_json::from_str::<NewAddressBookItem>(add_js.as_str())
        .expect("Invalid input JSON");
    let result = vault.add_to_addressbook(item);

    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())

}

pub fn remove(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let chain_code = cfg.chain.clone();
    let vault = WrappedVault::new(cfg);

    let address = cx.argument::<JsString>(1).expect("Address no provided").value();
    let address = Address::from_str(address.as_str()).expect("Invalid address");

    let removed = vault.remove_addressbook_by_addr(&address);

    let status = StatusResult::Ok(removed).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}