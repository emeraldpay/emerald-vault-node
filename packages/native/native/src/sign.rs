use std::convert::TryInto;
use std::str::FromStr;

use hex::FromHex;
use neon::prelude::{FunctionContext, JsNumber, JsString};
use uuid::Uuid;

use access::{VaultConfig, WrappedVault};
use emerald_vault::{align_bytes, to_arr, to_even_str, to_u64, trim_hex, EthereumAddress, EthereumLegacyTransaction, to_32bytes};
use errors::{JsonError, VaultNodeError};
use emerald_vault::structs::book::AddressRef;
use emerald_vault::blockchain::chains::BlockchainType;
use emerald_vault::blockchain::bitcoin::{BitcoinTransferProposal, InputReference, InputScriptSource, KeyMapping, XPub};
use emerald_vault::structs::wallet::PKType;
use hdpath::{StandardHDPath, AccountHDPath};
use bitcoin::{Address, TxOut, OutPoint, Txid};
use emerald_vault::chains::EthereumChainId;
use emerald_vault::ethereum::transaction::{EthereumEIP1559Transaction, EthereumTransaction, TxAccess};
use emerald_vault::structs::types::UsesOddKey;
use num_bigint::BigUint;

#[derive(Deserialize, Debug, Clone)]
pub struct AccessListItemJson {
    pub address: String,
    pub storage: Option<Vec<String>>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct UnsignedEthereumTxJson {
    pub from: String,
    pub to: String,
    pub gas: u64,
    #[serde(rename = "gasPrice")]
    pub gas_price: Option<String>,
    #[serde(rename = "maxGasPrice")]
    pub max_gas_price: Option<String>,
    #[serde(rename = "priorityGasPrice")]
    pub priority_gas_price: Option<String>,
    #[serde(default)]
    pub value: String,
    #[serde(default)]
    pub data: String,
    pub nonce: u64,
    #[serde(default)]
    pub passphrase: Option<String>,
    #[serde(rename = "accessList")]
    pub access_list: Option<Vec<AccessListItemJson>>
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
    #[serde(default = "default_sequence")]
    pub sequence: u32,
    #[serde(rename = "hdPath")]
    pub hd_path: Option<String>,
    pub address: Option<String>,
}

fn default_sequence() -> u32 {
    0xffff_fffe
}

#[derive(Deserialize, Debug, Clone)]
pub struct OutputJson {
    pub address: String,
    pub amount: u64,
}

impl UnsignedEthereumTxJson {

    fn is_valid(&self) -> bool {
        self.gas_price.is_some() || (self.priority_gas_price.is_some() && self.max_gas_price.is_some())
    }

    fn is_legacy(&self) -> bool {
        self.gas_price.is_some()
    }

    fn is_eip1559(&self) -> bool {
        self.priority_gas_price.is_some() && self.max_gas_price.is_some()
    }

    fn as_eip1559(&self, chain_id: &EthereumChainId) -> Result<EthereumEIP1559Transaction, JsonError> {
        let max_gas_price = self.max_gas_price.as_ref().ok_or(JsonError::MissingField("maxGasPrice".to_string()))?;
        let priority_gas_price = self.priority_gas_price.as_ref().ok_or(JsonError::MissingField("priorityGasPrice".to_string()))?;
        let data = to_even_str(trim_hex(self.data.as_str()));

        let mut access: Vec<TxAccess> = Vec::new();
        if let Some(l) = &self.access_list {
            for item in l {
                let address = EthereumAddress::from_str(item.address.as_str())
                    .map_err(|_| JsonError::InvalidValue("accessList[].address".to_string()))?;
                let storage_keys = item.storage.as_ref().unwrap_or(&Vec::new())
                    .iter()
                    .map(|s| to_32bytes(trim_hex(s)))
                    .collect::<Vec<[u8; 32]>>();
                access.push(TxAccess { address, storage_keys});
            }
        }

        let result = EthereumEIP1559Transaction {
            chain_id: chain_id.clone(),
            nonce: self.nonce,
            max_gas_price: BigUint::from_str(max_gas_price.as_str())
                .map_err(|_| JsonError::InvalidValue("maxGasPrice".to_string()))?,
            priority_gas_price: BigUint::from_str(priority_gas_price.as_str())
                .map_err(|_| JsonError::InvalidValue("priorityGasPrice".to_string()))?,
            gas_limit: self.gas,
            to: self.to.as_str().parse::<EthereumAddress>().ok(),
            value: BigUint::from_str(self.value.as_str())
                .map_err(|_| JsonError::InvalidValue("value".to_string()))?,
            data: Vec::from_hex(data)?,
            access
        };

        Ok(result)
    }

    fn as_legacy(&self, chain_id: &EthereumChainId) -> Result<EthereumLegacyTransaction, JsonError> {
        let gas_price = self.gas_price.as_ref().ok_or(JsonError::MissingField("gasPrice".to_string()))?;
        let data = to_even_str(trim_hex(self.data.as_str()));

        let result = EthereumLegacyTransaction {
            chain_id: chain_id.clone(),
            nonce: self.nonce,
            gas_price: BigUint::from_str(gas_price.as_str())
                .map_err(|_| JsonError::InvalidValue("gasPrice".to_string()))?,
            gas_limit: self.gas,
            to: self.to.as_str().parse::<EthereumAddress>().ok(),
            value: BigUint::from_str(self.value.as_str())
                .map_err(|_| JsonError::InvalidValue("value".to_string()))?,
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
                    match xpub.find_path(hd_account, &address, 1000) {
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
            sequence: input.sequence,
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

        let chain_id = EthereumChainId::from(entry.blockchain);
        let result = if unsigned_tx.is_eip1559() {
            let tx = unsigned_tx.as_eip1559(&chain_id).map_err(|e| format!("{:?}", e))?;
            entry.sign_tx(tx, Some(password), &storage)
        } else {
            let tx = unsigned_tx.as_legacy(&chain_id).map_err(|e| format!("{:?}", e))?;
            entry.sign_tx(tx, Some(password), &storage)
        };

        let result = result
            .map_err(|e| format!("Failed to sign: {:?}", e))?;
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
        let hd_account = AccountHDPath::from(&seed_ref.hd_path);
        let xpub = match &entry.address {
            Some(ar) => match ar {
                AddressRef::ExtendedPub(value) => value,
                _ => return Err("Unsupported type of address".to_string())
            },
            None => return Err("No address for the entry".to_string())
        };

        let keys = if seed.is_odd_key() {
            KeyMapping::single(seed_id, password)
        } else {
            let global = storage.global_key().get()
                .map_err(|_| "Global Key unavailable")?;
            KeyMapping::global(global, password)
        };

        let proposal = BitcoinTransferProposal {
            network: entry.blockchain.as_bitcoin_network(),
            seed: vec![seed],
            keys,
            input: convert_inputs(unsigned_tx.inputs, &xpub, seed_id, &hd_account)?,
            output: convert_output(unsigned_tx.outputs)?,
            change: entry.clone(),
            expected_fee: unsigned_tx.fee,
        };
        let valid = proposal.validate();
        if valid.is_ok() {
            entry.sign_bitcoin(proposal).map_err(|e| format!("Failed to sign: {:?}", e))
        } else {
            Err(format!("Invalid tx: {:?}", valid.expect_err("no_error_on_invalid")))
        }
    }
}

#[neon_frame_fn]
pub fn sign_tx(cx: &mut FunctionContext) -> Result<String, VaultNodeError> {
    let cfg = VaultConfig::get_config(cx)?;
    let vault = WrappedVault::new(cfg);

    let wallet_id = cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "wallet_id".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(1))?;

    let entry_id = cx
        .argument::<JsNumber>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "entry_id".to_string()))?
        .value(cx) as usize;

    let unsigned_tx = cx
        .argument::<JsString>(3)
        .map_err(|_| VaultNodeError::ArgumentMissing(3, "tx_json".to_string()))?
        .value(cx);

    let password = cx
        .argument::<JsString>(4)
        .map_err(|_| VaultNodeError::ArgumentMissing(3, "password".to_string()))?
        .value(cx);

    let entry = vault.get_entry(wallet_id, entry_id)
        .map_err(|_| VaultNodeError::OtherInput(format!("Unknown entry {} at {:}", entry_id, wallet_id)))?;

    let result = match entry.blockchain.get_type() {
        BlockchainType::Ethereum => {
            let unsigned_tx =
                serde_json::from_str::<UnsignedEthereumTxJson>(unsigned_tx.as_str())
                    .map_err(|_| VaultNodeError::InvalidArgument(3))?;
            vault.sign_ethereum_tx(wallet_id, entry_id, unsigned_tx, password)
        }
        BlockchainType::Bitcoin => {
            let unsigned_tx =
                serde_json::from_str::<UnsignedBitcoinTxJson>(unsigned_tx.as_str())
                    .map_err(|_| VaultNodeError::InvalidArgument(3))?;
            vault.sign_bitcoin_tx(wallet_id, entry_id, unsigned_tx, password)
        }
    };

    result
        .map_err(VaultNodeError::OtherProcessing)
        .map(|b| hex::encode(b))
}
