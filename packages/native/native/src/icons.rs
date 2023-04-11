use base64::Engine;
use emerald_vault::storage::icons::Icon;
use neon::prelude::{FunctionContext};
use neon::prelude::JsArrayBuffer;
use neon::types::buffer::TypedArray;
use neon::types::{JsTypedArray, JsValue};
use uuid::Uuid;
use access::{args_get_uuid};
use emerald_vault::storage::vault::VaultStorage;
use errors::VaultNodeError;
use instance::Instance;

#[derive(Serialize, Clone)]
pub struct IconDetailsJson {
    pub id: String,
    pub entry: IconEntryRefJson,
    pub format: String,
}

#[derive(Serialize, Clone)]
pub struct IconEntryRefJson {
    pub id: String,
    #[serde(rename = "type")]
    pub entry_type: String,
}

impl From<&Icon> for IconDetailsJson {
    fn from(value: &Icon) -> Self {
        IconDetailsJson {
            id: value.id.to_string(),
            entry: IconEntryRefJson {
                id: value.id.to_string(),
                entry_type: format!("{:?}", value.entity_type).to_ascii_lowercase()
            },
            format: "png".to_string()
        }
    }
}

fn list_internal(vault: VaultStorage) -> Result<Vec<IconDetailsJson>, VaultNodeError> {
    let icons = vault.icons().list()?
        .iter()
        .map(|i| IconDetailsJson::from(i))
        .collect();
    Ok(icons)
}

#[neon_frame_fn(channel=0)]
pub fn list<H>(_cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<Vec<IconDetailsJson>, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let result = list_internal(vault.cfg.get_storage());
        handler(result);
    });

    Ok(())
}


fn set_internal(vault: VaultStorage, id: Uuid, image: Option<Vec<u8>>) -> Result<(), VaultNodeError> {
    vault.icons().update(id, image)
        .map_err(VaultNodeError::from)
}

#[neon_frame_fn(channel=2)]
pub fn set<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<bool, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;

    let id = args_get_uuid(cx, 0)?;

    let arg = cx.argument::<JsValue>(1).unwrap();

    let image = if arg.is_a::<JsTypedArray<u8>, _>(cx) {
        let arr = arg.downcast::<JsTypedArray<u8>, _>(cx).unwrap();
        let bytes = arr.as_slice(cx);
        Some(bytes.to_vec())
    } else if arg.is_a::<JsArrayBuffer, _>(cx) {
        let arr = arg.downcast::<JsArrayBuffer, _>(cx).unwrap();
        let bytes = arr.as_slice(cx);
        Some(bytes.to_vec())
    } else {
        None
    };

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let result = set_internal(vault.cfg.get_storage(), id, image)
            .map(|_| true);
        handler(result);
    });

    Ok(())
}

fn get_internal(vault: VaultStorage, id: Uuid) -> Result<Option<String>, VaultNodeError> {
    Ok(vault.icons()
        .get_image(id)
        .ok()
        .map(|image| {
            base64::engine::general_purpose::STANDARD.encode(image)
        }))
}

#[neon_frame_fn(channel=1)]
pub fn get<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<Option<String>, VaultNodeError>) + Send + 'static {
    let vault = Instance::get_vault()?;

    let id = args_get_uuid(cx, 0)?;

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let result = get_internal(vault.cfg.get_storage(), id);
        handler(result);
    });

    Ok(())
}