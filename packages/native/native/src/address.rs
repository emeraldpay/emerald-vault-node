use emerald_vault::structs::book::AddressRef;
use std::convert::TryFrom;
use emerald_vault::EthereumAddress;
use std::str::FromStr;
use emerald_vault::blockchain::bitcoin::XPub;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", content = "value")]
pub enum AddressRefJson {
    #[serde(rename = "single")]
    Single(String),
    #[serde(rename = "xpub")]
    XPub(String),
}

impl From<AddressRef> for AddressRefJson {
    fn from(value: AddressRef) -> Self {
        match value {
            AddressRef::EthereumAddress(value) => AddressRefJson::Single(value.to_string()),
            AddressRef::ExtendedPub(value) => AddressRefJson::XPub(value.to_string())
        }
    }
}

impl TryFrom<AddressRefJson> for AddressRef {
    type Error = ();

    fn try_from(value: AddressRefJson) -> Result<Self, Self::Error> {
        let result = match value {
            AddressRefJson::Single(value) => AddressRef::EthereumAddress(
                EthereumAddress::from_str(value.as_str()).map_err(|_| ())?
            ),
            AddressRefJson::XPub(value) => AddressRef::ExtendedPub(
                XPub::from_str(value.as_str()).map_err(|_| ())?
            )
        };
        Ok(result)
    }
}
