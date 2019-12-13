use neon::prelude::{FunctionContext, JsResult, JsString, Context, JsNumber, JsObject};
use access::{VaultConfig, WrappedVault};
use json::{UnsignedTx, StatusResult};
use emerald_vault::{Address, PrivateKey, Transaction, ToHex};
use std::str::FromStr;
use std::convert::TryInto;
use uuid::Uuid;
use emerald_vault::structs::wallet::PKType;

impl WrappedVault {

    fn sign_tx(&self, wallet_id: Uuid, account_id: usize,
               unsigned_tx: UnsignedTx, password: String, ) -> Vec<u8> {
        let storage = &self.cfg.get_storage();
        let wallet = storage.wallets().get(&wallet_id).expect("Wallet doesn't exist");
        let account = wallet.get_account(account_id).expect("Account not found");

        let from_address = Address::from_str(unsigned_tx.from.as_str()).expect("Invalid from address");

        if account.address.is_some() && account.address.unwrap() != from_address {
            panic!("Different from address")
        }

        let tx: Transaction = unsigned_tx.try_into().expect("Invalid sign JSON");

        account.sign_tx(tx, Some(password), &storage)
            .expect("Failed to sign")
    }
}

pub fn sign_tx(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx.argument::<JsString>(1).expect("wallet_id not provided").value();
    let wallet_id = Uuid::from_str(wallet_id.as_str()).expect("Invalid wallet_id");

    let account_id = cx.argument::<JsNumber>(2).expect("account_id not provided").value() as usize;

    let unsigned_tx = cx.argument::<JsString>(3).expect("Transaction JSON not provided").value();
    let unsigned_tx = serde_json::from_str::<UnsignedTx>(unsigned_tx.as_str())
        .expect("Invalid transaction JSON");
    let password = cx.argument::<JsString>(4).expect("Password not provided").value();

    let result = vault.sign_tx(wallet_id, account_id, unsigned_tx, password);
    let result = hex::encode(result);
    let status = StatusResult::Ok(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}