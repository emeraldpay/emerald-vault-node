use std::convert::TryInto;
use emerald_vault::{
    Transaction,
    to_even_str,
    trim_hex,
    to_u64,
    to_arr,
    align_bytes,
    Address,
    storage::{
        addressbook::AddressBookmark,
        error::VaultError
    },
    structs::book::{BookmarkDetails, AddressRef},
    core::{
        chains::EthereumChainId,
        chains::Blockchain
    },
};
use hex::FromHex;
use uuid::Uuid;
use emerald_vault::structs::wallet::{Wallet, WalletAccount};
use serde::{Serialize, Serializer};
use accounts::AsJsObject;
use neon::prelude::{Context, Handle, JsObject, Object, JsArray, Value, JsValue};

#[derive(Debug, Copy, Clone)]
pub enum JsonError {
    InvalidData
}

impl std::convert::From<hex::FromHexError> for JsonError {
    fn from(_: hex::FromHexError) -> Self {
        JsonError::InvalidData
    }
}

#[derive(Deserialize)]
pub struct UpdateAccount {
    #[serde(default)]
    pub name: Option<String>,
    pub description: Option<String>
}

#[derive(Deserialize)]
pub struct ImportPrivateKey {
    pub pk: String,
    pub password: String,
    pub name: Option<String>,
    pub description: Option<String>
}

#[derive(Deserialize, Debug, Clone)]
pub struct UnsignedTx {
    pub from: String,
    pub to: String,
    pub gas: String,
    #[serde(rename = "gasPrice")]
    pub gas_price: String,
    #[serde(default)]
    pub value: String,
    #[serde(default)]
    pub data: String,
    pub nonce: String,
    #[serde(default)]
    pub passphrase: Option<String>,
}


#[derive(Deserialize, Debug)]
pub struct NewMnemonicAccount {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    pub password: String,
    pub mnemonic: String,
    #[serde(alias = "hdPath")]
    pub hd_path: String,
}

#[derive(Deserialize, Debug)]
pub struct NewAddressBookItem {
    pub name: Option<String>,
    pub description: Option<String>,
    pub address: Address
}

#[derive(Serialize)]
pub struct StatusErrorJson {
    pub code: u32,
    pub message: String
}

#[derive(Serialize)]
pub struct StatusJson<T> {
    pub succeeded: bool,
    pub result: Option<T>,
    pub error: Option<StatusErrorJson>
}

pub enum StatusResult<T> {
    Ok(T),
    Error(u32, String)
}

impl <T> StatusResult<T> where T: Clone {
    pub fn as_json(&self) -> StatusJson<T> {
        match self {
            StatusResult::Ok(ref t) => StatusJson {
                succeeded: true,
                result: Some(t.clone()),
                error: None
            },
            StatusResult::Error(code, message) => StatusJson {
                succeeded: false,
                result: None,
                error: Some(StatusErrorJson {
                    code: *code,
                    message: message.clone()
                })
            }
        }
    }
}

#[derive(Serialize, Clone)]
pub struct WalletAccountJson {
    pub blockchain: u32,
    pub address: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct WalletJson {
    pub id: String,
    pub name: Option<String>,
    pub accounts: Vec<WalletAccountJson>
}

#[derive(Deserialize, Clone)]
pub struct AddAccountJson {
    pub blockchain: u32,
    #[serde(flatten)]
    pub key_value: AddAccountType,
    pub password: Option<String>
}

#[derive(Deserialize, Clone)]
#[serde(tag = "type", content = "key")]
pub enum AddAccountType {
    #[serde(rename = "ethereum-json")]
    EthereumJson(String),
    #[serde(rename = "raw-pk-hex")]
    RawHex(String)
}

impl <T> From<Result<T, VaultError>> for StatusResult<T> {
    fn from(r: Result<T, VaultError>) -> Self {
        match r {
            Ok(t) => StatusResult::Ok(t),
            Err(e) => StatusResult::Error(2, "Vault Error".to_string())
        }
    }
}

impl From<Wallet> for WalletJson {
    fn from(wallet: Wallet) -> Self {
        let accounts: Vec<WalletAccountJson> = wallet.accounts.iter()
            .map(|a| WalletAccountJson {
                blockchain: a.blockchain as u32,
                address: a.address.map(|v| v.to_string())
            })
            .collect();
        WalletJson {
            id: wallet.id.clone().to_string(),
            name: wallet.label,
            accounts
        }
    }
}

impl TryInto<Transaction> for UnsignedTx {
    type Error = JsonError;

    fn try_into(self) -> Result<Transaction, Self::Error> {
        let gas_price = to_even_str(trim_hex(self.gas_price.as_str()));
        let value = to_even_str(trim_hex(self.value.as_str()));
        let gas_limit = to_even_str(trim_hex(self.gas.as_str()));

        let gas_limit = Vec::from_hex(gas_limit)?;
        let gas_price = Vec::from_hex(gas_price)?;
        let value = Vec::from_hex(value)?;
        let nonce = Vec::from_hex(to_even_str(trim_hex(self.nonce.as_str())))?;
        let data = to_even_str(trim_hex(self.data.as_str()));

        let result = Transaction {
            nonce: to_u64(&nonce),
            gas_price: to_arr(&align_bytes(&gas_price, 32)),
            gas_limit: to_u64(&gas_limit),
            to: self.to.as_str().parse::<Address>().ok(),
            value: to_arr(&align_bytes(&value, 32)),
            data: Vec::from_hex(data)?,
        };

        Ok(result)
    }
}

impl NewAddressBookItem {
    pub fn into_bookmark(self, blockchain: Blockchain) -> AddressBookmark {
        AddressBookmark {
            id: Uuid::new_v4(),
            details: BookmarkDetails {
                blockchains: vec![blockchain],
                label: self.name,
                description: self.description,
                address: AddressRef::EthereumAddress(self.address)
            }
        }
    }
}

impl<T> AsJsObject for StatusResult<T> where T: AsJsObject {
    fn as_js_object<'a, C: Context<'a>>(&self, cx: &mut C) -> Handle<'a, JsValue> {
        let mut js = JsObject::new(cx);

        match self {
            StatusResult::Ok(t) => {
                let handle = cx.boolean(true);
                js.set(cx, "succeeded", handle).unwrap();

                let handle = t.as_js_object(cx);
                js.set(cx, "result", handle).unwrap();
            },
            StatusResult::Error(code, msg) => {
                let handle = cx.boolean(false);
                js.set(cx, "succeeded", handle).unwrap();

                let error = JsObject::new(cx);
                let handle = cx.number(*code as f64);
                js.set(cx, "code", handle).unwrap();
                let handle = cx.string(msg);
                js.set(cx, "message", handle).unwrap();

                js.set(cx, "error", error).unwrap();
            }
        };

        js.as_value(cx)
    }
}

//impl <T> AsJsObject for Vec<T> where T: AsJsObject {
//    fn as_js_object<'a, C: Context<'a>>(&self, cx: &mut C) -> Handle<'a, JsValue> {
//        let js = JsArray::new(cx, self.len() as u32);
//
//        for (i, item) in self.iter().enumerate() {
//            let value = item.as_js_object(cx);
//            js.set(cx, i as u32, value).unwrap();
//        }
//
//        js.as_value(cx)
//    }
//}
//
//impl AsJsObject for WalletAccountJson {
//    fn as_js_object<'a, C: Context<'a>>(&self, cx: &mut C) -> Handle<'a, JsValue> {
//        let mut js = JsObject::new(cx);
//
//        match self.address {
//            Some(address) => {
//                let handle = cx.string(address.to_string());
//                js.set(cx, "address", handle).unwrap();
//            },
//            None => {}
//        }
//
//        let handle = cx.number(self.blockchain as u32);
//        js.set(cx, "blockchain", handle).unwrap();
//
//        js.as_value(cx)
//    }
//}
//
//impl AsJsObject for WalletJson {
//    fn as_js_object<'a, C: Context<'a>>(&self, cx: &mut C) -> Handle<'a, JsValue> {
//        let mut js = JsObject::new(cx);
//
//        let handle = cx.string(&self.id);
//        js.set(cx, "id", handle).unwrap();
//
//        if self.name.is_some() {
//            let handle = cx.string(self.name.clone().unwrap());
//            js.set(cx, "name", handle).unwrap();
//        }
//
//        let accounts = JsArray::new(cx, self.accounts.len() as u32);
//
//        for (i, account) in self.accounts.iter().enumerate() {
//            let value = account.as_js_object(cx);
//            accounts.set(cx, i as u32, value).unwrap();
//        }
//
//        js.set(cx, "accounts", accounts).unwrap();
//
//        js.as_value(cx)
//    }
//}