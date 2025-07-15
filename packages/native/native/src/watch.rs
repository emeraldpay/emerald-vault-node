use std::convert::TryFrom;
use emerald_vault::storage::{
    watch::{
        Request, Event, ConnectedDevice,
    }
};

use neon::prelude::FunctionContext;
use crate::access::{args_require_str};
use emerald_vault::chains::Blockchain;
use emerald_vault::storage::watch::{DeviceDetails};
use crate::errors::{JsonError, VaultNodeError};
use crate::instance::Instance;
use crate::seeds::LedgerDetails;

#[derive(Deserialize, Clone)]
struct RequestJson {
    #[serde(rename = "type")]
    pub entry_type: String,
    pub version: Option<usize>,
    pub blockchain: Option<u32>,
}

#[derive(Serialize, Clone)]
pub(crate) struct EventJson {
    pub version: usize,
    pub devices: Vec<DeviceJson>,
}

#[derive(Serialize, Clone)]
pub(crate) struct DeviceJson {
    pub id: String,
    pub seed: Option<String>,
    pub blockchains: Vec<u32>,
    pub device: Option<LedgerDetails>,
}

impl TryFrom<RequestJson> for Request {
    type Error = JsonError;

    fn try_from(value: RequestJson) -> Result<Self, Self::Error> {
        match value.entry_type.as_str() {
            "get-current" => Ok(Request::GetCurrent),
            "change" => if let Some(version) = value.version {
                Ok(Request::Change { version })
            } else {
                Err(JsonError::MissingField("version".to_string()))
            },
            "available" => if let Some(blockchain) = value.blockchain {
                let blockchain = Blockchain::try_from(blockchain)
                    .map_err(|_| JsonError::InvalidValue("blockchain".to_string()))?;
                Ok(Request::Available { blockchain: Some(blockchain), hw_key_id: None})
            } else {
                Ok(Request::Available { blockchain: None, hw_key_id: None})
            },
            _ => Err(JsonError::InvalidValue("type".to_string()))
        }
    }
}

impl From<DeviceDetails> for LedgerDetails {
    fn from(value: DeviceDetails) -> Self {
        match value {
            DeviceDetails::Ledger(ledger) => LedgerDetails {
                json_type: "ledger".to_string(),
                connected: true,
                app: Some(ledger.app),
                app_version: Some(ledger.app_version),
                ..LedgerDetails::default()
            }
        }
    }
}

impl From<ConnectedDevice> for DeviceJson {
    fn from(value: ConnectedDevice) -> Self {
        DeviceJson {
            id: value.id.to_string(),
            seed: value.seed_id.as_ref().map(|v| v.to_string()),
            blockchains: value.blockchains.iter().map(|v| v.clone().into()).collect(),
            device: value.device.clone().map(|d| LedgerDetails {
                seed_id: value.seed_id,
                ..d.into()
            })
        }
    }
}

impl From<Event> for EventJson {
    fn from(value: Event) -> Self {
        EventJson {
            version: value.version,
            devices: value.devices.iter().map(|v| v.clone().into()).collect()
        }
    }
}

#[neon_frame_fn(channel=1)]
pub(crate) fn watch<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<EventJson, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;

    let json = args_require_str(cx, 0, "request")?;
    let json: RequestJson = serde_json::from_str(json.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(1))?;
    let request = Request::try_from(json)?;

    std::thread::spawn(move || {
        let event = {
            // the whole watching takes time, so make sure we lock the vault only for the period of adding the request
            let vault = vault.lock().unwrap();
            vault.cfg.get_storage().watch(request)
        };
        let result = event.recv()
            .map_err(|_| VaultNodeError::OtherProcessing("No response".to_string()))
            .map(|event| event.into());
        handler(result);
    });

    Ok(())
}