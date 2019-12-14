use std::convert::TryInto;
use std::str::FromStr;

use hex::FromHex;
use neon::prelude::{FunctionContext, JsNumber, JsObject, JsResult, JsString};
use uuid::Uuid;

use access::{VaultConfig, WrappedVault};
use emerald_vault::{
    Address,
    align_bytes,
    to_arr,
    to_even_str,
    to_u64,
    Transaction,
    trim_hex
};
use json::{JsonError, StatusResult};

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