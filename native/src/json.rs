use std::convert::TryInto;
use emerald_vault::{
    Transaction,
    to_even_str,
    trim_hex,
    to_u64,
    to_arr,
    align_bytes,
    Address,
    storage::addressbook::AddressBookmark,
    structs::book::{BookmarkDetails, AddressRef},
    core::chains::EthereumChainId,
    core::chains::Blockchain
};
use hex::FromHex;
use uuid::Uuid;

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