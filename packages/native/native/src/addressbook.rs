use std::str::FromStr;

use neon::prelude::*;
use uuid::Uuid;

use access::{VaultConfig, WrappedVault};
use chrono::{DateTime, Utc};
use emerald_vault::{
    blockchain::chains::Blockchain,
    storage::{addressbook::AddressBookmark, vault::VaultAccess},
    structs::{book::AddressRef, book::BookmarkDetails},
    EthereumAddress,
};
use json::StatusResult;
use std::convert::{TryFrom, TryInto};
use address::AddressRefJson;

#[derive(Serialize, Clone)]
struct AddressBookmarkJson {
    pub address: AddressRefJson,
    pub name: Option<String>,
    pub description: Option<String>,
    pub blockchain: u32,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Deserialize, Debug)]
pub struct NewAddressBookItem {
    pub name: Option<String>,
    pub description: Option<String>,
    pub address: AddressRefJson,
    pub blockchain: u32,
}

impl From<&AddressBookmark> for AddressBookmarkJson {
    fn from(value: &AddressBookmark) -> Self {
        AddressBookmarkJson {
            address: value.details.address.clone().into(),
            name: value.details.label.clone(),
            description: value.details.description.clone(),
            blockchain: value.details.blockchain as u32,
            created_at: value.details.created_at,
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
                address: self.address.try_into().expect("Invalid address"),
                created_at: Utc::now(),
            },
        }
    }
}

impl WrappedVault {
    fn list_addressbook(&self) -> Vec<AddressBookmark> {
        let storage = &self.cfg.get_storage();
        let all = storage
            .addressbook()
            .get_all()
            .expect("Addressbook unavailable");

        let for_chain = all.iter().map(|b| b.clone()).collect();

        for_chain
    }

    fn add_to_addressbook(&self, item: NewAddressBookItem) -> bool {
        let storage = &self.cfg.get_storage();
        let blockchain = Blockchain::try_from(item.blockchain).expect("Invalid blockchain id");
        storage
            .addressbook()
            .add(item.into_bookmark(blockchain))
            .is_ok()
    }

    //TODO support bitcoin addresses
    fn remove_addressbook_by_addr(&self, address: &EthereumAddress) -> bool {
        let storage = &self.cfg.get_storage();

        let list = self.list_addressbook();
        let found = list.iter().find(|x| match x.details.address {
            AddressRef::EthereumAddress(a) => a == *address,
            AddressRef::BitcoinAddress(_) => false, //TODO
            AddressRef::ExtendedPub(_) => false
        });

        if found.is_some() {
            match storage.addressbook().remove(found.unwrap().id) {
                Ok(r) => r,
                Err(_) => false,
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

    let result: Vec<AddressBookmarkJson> =
        list.iter().map(|b| AddressBookmarkJson::from(b)).collect();

    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn add(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let add_js = cx
        .argument::<JsString>(1)
        .expect("Address Book item not provided")
        .value();
    let item =
        serde_json::from_str::<NewAddressBookItem>(add_js.as_str()).expect("Invalid input JSON");
    let result = vault.add_to_addressbook(item);

    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}

pub fn remove(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let address = cx
        .argument::<JsString>(1)
        .expect("Address no provided")
        .value();
    let address = EthereumAddress::from_str(address.as_str()).expect("Invalid address");

    let removed = vault.remove_addressbook_by_addr(&address);

    let status = StatusResult::Ok(removed).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}
