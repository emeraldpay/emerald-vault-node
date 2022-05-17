use std::fs::File;
use std::io;
use std::path::PathBuf;
use emerald_vault::crypto::error::CryptoError;
use emerald_vault::error::VaultError;
use emerald_vault::storage::vault::VaultStorage;
use neon::context::{FunctionContext};
use neon::object::Object;
use neon::prelude::{JsString};
use access::VaultConfig;
use errors::VaultNodeError;
use uuid::Uuid;
use std::str::FromStr;

fn create_internal(storage: VaultStorage, target_file: String) -> Result<bool, VaultError> {
    let target = PathBuf::from(&target_file);
    let mut target = File::create(target)
        .map_err(|e| format!("Cannot create file {}. Error: {}", target_file, e))?;

    let snapshots = storage.snapshots();
    let snapshot_id = snapshots.create()?;

    let mut reader = snapshots.read(snapshot_id)?;

    let _ = io::copy(&mut reader, &mut target)
        .map_err(|e| format!("Failed to copy snapshot to {}. Error: {}", target_file, e))?;

    Ok(true)
}

#[neon_frame_fn(channel=2)]
pub fn create<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<bool, VaultNodeError>) + Send + 'static {
    let cfg = VaultConfig::get_config(cx)?;
    let target_file = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "targetFile".to_string()))?
        .value(cx);

    std::thread::spawn(move || {
        let storage = cfg.get_storage();

        let result = create_internal(storage, target_file)
            .map_err(|e| VaultNodeError::from(e));
        handler(result);
    });
    Ok(())
}

fn restore_internal(storage: VaultStorage, source_file: String, password: String) -> Result<bool, VaultError> {
    let input = PathBuf::from(&source_file);
    if !input.exists() || !input.is_file() {
        return Err(VaultError::FilesystemError(format!("Not a file: {}", source_file)))
    }

    let mut input = File::open(input)
        .map_err(|e| format!("Cannot open file {}. Error: {}", source_file, e))?;

    let snapshots = storage.snapshots();
    let mut restore = snapshots.restore()?;

    let _ = io::copy(&mut input, &mut restore)
        .map_err(|e| format!("Failed to copy source snapshot from {}. Error: {}", source_file, e))?;

    let is_password_valid = restore.verify_password(password)?;
    if !is_password_valid {
        return Ok(false);
    }

    restore.complete().map(|_| true)
}

#[neon_frame_fn(channel=3)]
pub fn restore<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<bool, VaultNodeError>) + Send + 'static {
    let cfg = VaultConfig::get_config(cx)?;
    let source_file = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "sourceFile".to_string()))?
        .value(cx);

    let password = cx
        .argument::<JsString>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "password".to_string()))?
        .value(cx);

    std::thread::spawn(move || {
        let storage = cfg.get_storage();
        let result = restore_internal(storage, source_file, password)
            .map_err(|e| VaultNodeError::from(e));
        handler(result);
    });
    Ok(())
}