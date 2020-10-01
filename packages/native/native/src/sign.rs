use std::convert::TryInto;
use std::str::FromStr;

use hex::FromHex;
use neon::prelude::{FunctionContext, JsNumber, JsObject, JsResult, JsString};
use uuid::Uuid;

use access::{VaultConfig, WrappedVault};
use emerald_vault::{
    align_bytes, to_arr, to_even_str, to_u64, trim_hex, EthereumAddress, EthereumTransaction,
};
use json::{JsonError, StatusResult};
use emerald_vault::structs::book::AddressRef;
use emerald_vault::blockchain::chains::BlockchainType;
use emerald_vault::blockchain::bitcoin::{BitcoinTransferProposal, InputReference, InputScriptSource, KeyMapping, XPub};
use emerald_vault::structs::wallet::PKType;
use hdpath::{StandardHDPath, AccountHDPath};
use bitcoin::{Address, TxOut, OutPoint, Txid};

#[derive(Deserialize, Debug, Clone)]
pub struct UnsignedEthereumTxJson {
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

#[derive(Deserialize, Debug, Clone)]
pub struct UnsignedBitcoinTxJson {
    pub inputs: Vec<InputJson>,
    pub outputs: Vec<OutputJson>,
    pub fee: u64,
}

#[derive(Deserialize, Debug, Clone)]
pub struct InputJson {
    pub txid: String,
    pub vout: u32,
    pub amount: u64,
    #[serde(rename = "hdPath")]
    pub hd_path: Option<String>,
    pub address: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct OutputJson {
    pub address: String,
    pub amount: u64,
}

impl TryInto<EthereumTransaction> for UnsignedEthereumTxJson {
    type Error = JsonError;

    fn try_into(self) -> Result<EthereumTransaction, Self::Error> {
        let gas_price = to_even_str(trim_hex(self.gas_price.as_str()));
        let value = to_even_str(trim_hex(self.value.as_str()));
        let gas_limit = to_even_str(trim_hex(self.gas.as_str()));

        let gas_limit = Vec::from_hex(gas_limit)?;
        let gas_price = Vec::from_hex(gas_price)?;
        let value = Vec::from_hex(value)?;
        let nonce = Vec::from_hex(to_even_str(trim_hex(self.nonce.as_str())))?;
        let data = to_even_str(trim_hex(self.data.as_str()));

        let result = EthereumTransaction {
            nonce: to_u64(&nonce),
            gas_price: to_arr(&align_bytes(&gas_price, 32)),
            gas_limit: to_u64(&gas_limit),
            to: self.to.as_str().parse::<EthereumAddress>().ok(),
            value: to_arr(&align_bytes(&value, 32)),
            data: Vec::from_hex(data)?,
        };

        Ok(result)
    }
}

fn convert_inputs(inputs: Vec<InputJson>, xpub: &XPub, seed_id: Uuid, hd_account: &AccountHDPath) -> Result<Vec<InputReference>, String> {
    let mut result = Vec::with_capacity(inputs.len());
    for input in inputs {
        let hd_path = match &input.hd_path {
            Some(value) => StandardHDPath::from_str(value.as_str()).map_err(|_| "Invalid HDPath for input")?,
            None => match &input.address {
                Some(value) => {
                    let address = Address::from_str(value).map_err(|_| "Invalid input bitcoin address")?;
                    //TODO use actual number of used address from current state
                    match xpub.find_path(&hd_account, &address, 1000) {
                        Some(path) => path,
                        None => return Err(format!("Unknown address: {:?}", address))
                    }
                },
                None => return Err("Neither HDPath nor Address is specified".to_string())
            }
        };
        let value = InputReference {
            output: OutPoint {
                txid: Txid::from_str(input.txid.as_str()).map_err(|_| "Invalid txid")?,
                vout: input.vout,
            },
            script_source: InputScriptSource::HD(seed_id, hd_path),
            expected_value: input.amount,
            sequence: 0,
        };
        result.push(value);
    }
    Ok(result)
}

fn convert_output(outputs: Vec<OutputJson>) -> Result<Vec<TxOut>, String> {
    let mut result = Vec::with_capacity(outputs.len());
    for output in outputs {
        let address = Address::from_str(output.address.as_str()).map_err(|_| "Invalid output bitcoin address")?;
        let value = TxOut {
            value: output.amount,
            script_pubkey: address.script_pubkey(),
        };
        result.push(value);
    }
    Ok(result)
}

impl WrappedVault {
    fn sign_ethereum_tx(
        &self,
        wallet_id: Uuid,
        entry_id: usize,
        unsigned_tx: UnsignedEthereumTxJson,
        password: String,
    ) -> Result<Vec<u8>, String> {
        let storage = &self.cfg.get_storage();
        let entry = self.get_entry(wallet_id, entry_id).map_err(|_| "Entry not found")?;
        if entry.blockchain.get_type() != BlockchainType::Ethereum {
            return Err("Not an ethereum entry".to_string());
        }

        let from_address =
            EthereumAddress::from_str(unsigned_tx.from.as_str()).map_err(|_| "Invalid from address")?;

        if let Some(address) = &entry.address {
            match address {
                AddressRef::EthereumAddress(current) => if current.ne(&from_address) {
                    return Err("Different from address".to_string())
                },
                _ => {
                    return Err("Unsupported wallet from address".to_string())
                }
            }
        }

        let tx: EthereumTransaction = unsigned_tx.try_into().map_err(|_| "Invalid sign JSON")?;

        let result = entry
            .sign_tx(tx, Some(password), &storage)
            .map_err(|_| "Failed to sign")?;
        Ok(result)
    }

    fn sign_bitcoin_tx(
        &self,
        wallet_id: Uuid,
        entry_id: usize,
        unsigned_tx: UnsignedBitcoinTxJson,
        password: String,
    ) -> Result<Vec<u8>, String> {
        let storage = &self.cfg.get_storage();
        let entry = self.get_entry(wallet_id, entry_id).map_err(|_| "Entry not found")?;
        if entry.blockchain.get_type() != BlockchainType::Bitcoin {
            return Err("Not a bitcoin entry".to_string());
        }

        let seed_ref = match &entry.key {
            PKType::SeedHd(seed) => seed,
            _ => return Err("Unsupported PK".to_string())
        };
        let seed = storage.seeds().get(seed_ref.seed_id).map_err(|_| "Seed not found")?;
        let seed_id = seed.id.clone();
        let hd_account = AccountHDPath::new(
            seed_ref.hd_path.purpose().clone(),
            seed_ref.hd_path.coin_type(),
            seed_ref.hd_path.index(),
        );
        let xpub = match &entry.address {
            Some(ar) => match ar {
                AddressRef::ExtendedPub(value) => value,
                _ => return Err("Unsupported type of address".to_string())
            },
            None => return Err("No address for the entry".to_string())
        };

        let proposal = BitcoinTransferProposal {
            network: entry.blockchain.as_bitcoin_network(),
            seed: vec![seed],
            keys: KeyMapping::single(seed_id, password),
            input: convert_inputs(unsigned_tx.inputs, xpub, seed_id, &hd_account)?,
            output: convert_output(unsigned_tx.outputs)?,
            change: entry.clone(),
            expected_fee: unsigned_tx.fee,
        };
        entry.sign_bitcoin(proposal).map_err(|_| "Failed to sign".to_string())
    }
}

pub fn sign_tx(mut cx: FunctionContext) -> JsResult<JsObject> {
    let cfg = VaultConfig::get_config(&mut cx);
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .expect("wallet_id not provided")
        .value();
    let wallet_id = Uuid::from_str(wallet_id.as_str()).expect("Invalid wallet_id");

    let entry_id = cx
        .argument::<JsNumber>(2)
        .expect("entry_id not provided")
        .value() as usize;

    let unsigned_tx = cx
        .argument::<JsString>(3)
        .expect("Transaction JSON not provided")
        .value();

    let password = cx
        .argument::<JsString>(4)
        .expect("Password not provided")
        .value();

    let entry = vault.get_entry(wallet_id, entry_id).expect("Unknown wallet entry");

    let result = match entry.blockchain.get_type() {
        BlockchainType::Ethereum => {
            let unsigned_tx =
                serde_json::from_str::<UnsignedEthereumTxJson>(unsigned_tx.as_str())
                    .expect("Invalid transaction JSON");
            vault.sign_ethereum_tx(wallet_id, entry_id, unsigned_tx, password)
        }
        BlockchainType::Bitcoin => {
            let unsigned_tx =
                serde_json::from_str::<UnsignedBitcoinTxJson>(unsigned_tx.as_str())
                    .expect("Invalid transaction JSON");
            vault.sign_bitcoin_tx(wallet_id, entry_id, unsigned_tx, password)
        }
    };

    let result = result.map(|b| hex::encode(b));

    let status = StatusResult::from(result).as_json();
    let js_value = neon_serde::to_value(&mut cx, &status).expect("Invalid Value");
    Ok(js_value.downcast().unwrap())
}
