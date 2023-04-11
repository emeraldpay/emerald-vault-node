use emerald_vault::convert::error::ConversionError;
use emerald_vault::error::VaultError;

#[derive(Debug, Clone)]
pub enum VaultNodeError {
    ArgumentMissing(usize, String),
    InvalidArgument(usize),
    InvalidArgumentByName(String),
    InvalidArgumentValue(String),
    JsonError(JsonError),
    VaultError(String),
    OtherInput(String),
    OtherProcessing(String),
    MissingData(String),
    Misconfigured,
}

#[derive(Debug, Clone)]
pub enum JsonError {
    InvalidData,
    MissingField(String),
    InvalidValue(String)
}

impl From<hex::FromHexError> for JsonError {
    fn from(_: hex::FromHexError) -> Self {
        JsonError::InvalidData
    }
}

impl From<hex::FromHexError> for VaultNodeError {
    fn from(_: hex::FromHexError) -> Self {
        VaultNodeError::InvalidArgumentValue("Invalid Hex format".to_string())
    }
}

impl From<JsonError> for VaultNodeError {
    fn from(e: JsonError) -> Self {
        VaultNodeError::JsonError(e)
    }
}

impl From<hdpath::Error> for VaultNodeError {
    fn from(_: hdpath::Error) -> Self {
        VaultNodeError::InvalidArgumentValue("Invalid HDPath".to_string())
    }
}

impl From<VaultError> for VaultNodeError {
    fn from(e: VaultError) -> Self {
        VaultNodeError::VaultError(format!("{:?}", e))
    }
}

impl From<ConversionError> for VaultNodeError {
    fn from(e: ConversionError) -> Self {
        VaultNodeError::from(VaultError::from(e))
    }
}

impl From<VaultNodeError> for (usize, String) {
    fn from(v: VaultNodeError) -> Self {
        match v {
            VaultNodeError::ArgumentMissing(pos, name) => (100, format!("Missing argument {} at #{}", name, pos)),
            VaultNodeError::InvalidArgument(pos) => (101, format!("Invalid value for argument at #{}", pos)),
            VaultNodeError::InvalidArgumentByName(name) => (101, format!("Invalid value for argument {}", name)),
            VaultNodeError::JsonError(jserror) => match jserror {
                JsonError::InvalidData => (120, "Invalid Data".to_string()),
                JsonError::MissingField(m) => (121, format!("Missing value for field {}", m)),
                JsonError::InvalidValue(m) => (122, format!("Invalid value for field {}", m)),
            },
            VaultNodeError::InvalidArgumentValue(msg) => (150, msg),
            VaultNodeError::OtherInput(msg) => (160, msg),
            VaultNodeError::OtherProcessing(msg) => (161, msg),
            VaultNodeError::MissingData(name) => (162, format!("Missing data: {}", name)),
            VaultNodeError::VaultError(msg) => (200, msg),
            VaultNodeError::Misconfigured => (300, format!("Vault Access is not properly configured")),
        }
    }
}