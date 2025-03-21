use std::str::FromStr;

use hex::FromHex;
use neon::prelude::{FunctionContext, JsNumber, JsString};
use uuid::Uuid;

use access::{args_get_str};
use emerald_vault::{to_even_str, trim_hex, EthereumAddress, EthereumLegacyTransaction, to_32bytes, keccak256};
use errors::{JsonError, VaultNodeError};
use emerald_vault::structs::book::AddressRef;
use emerald_vault::blockchain::chains::BlockchainType;
use emerald_vault::blockchain::bitcoin::{BitcoinTransferProposal, InputReference, InputScriptSource, KeyMapping, XPub};
use emerald_vault::structs::wallet::PKType;
use hdpath::{StandardHDPath, AccountHDPath};
use bitcoin::{
    Address,
    TxOut,
    OutPoint,
    Txid,
    Transaction,
    consensus::Decodable,
    Amount
};
use emerald_vault::chains::EthereumChainId;
use emerald_vault::ethereum::transaction::{EthereumEIP1559Transaction, TxAccess};
use emerald_vault::ethereum::signature::{EthereumBasicSignature, SignableHash};
use emerald_vault::structs::types::UsesOddKey;
use num_bigint::BigUint;
use emerald_vault::ethereum::eip712::parse_eip712;
use instance::{Instance, WrappedVault};

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

#[derive(Serialize, Debug, Clone)]
pub struct SignedTxJson {
    pub raw: String,
    pub txid: String,
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

#[derive(Deserialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum UnsignedMessageJson {
    #[serde(rename = "eip191")]
    EIP191 { message: String },
    #[serde(rename = "eip712")]
    EIP712 { message: String },
}

#[derive(Serialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum SignedMessageJson {
    #[serde(rename = "eip191")]
    EIP191 { signature: String, address: String },
    #[serde(rename = "eip712")]
    EIP712 { signature: String, address: String },
}


impl UnsignedEthereumTxJson {

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

fn convert_inputs(inputs: Vec<InputJson>, xpub: &XPub, seed_id: Uuid, hd_account: &AccountHDPath) -> Result<Vec<InputReference>, VaultNodeError> {
    let mut result = Vec::with_capacity(inputs.len());
    for input in inputs {
        let hd_path = match &input.hd_path {
            Some(value) => StandardHDPath::from_str(value.as_str())
                .map_err(|_| VaultNodeError::OtherInput("Invalid HDPath for input".to_string()))?,
            None => match &input.address {
                Some(value) => {
                    let address = Address::from_str(value)
                        .map_err(|_| VaultNodeError::OtherInput("Invalid input bitcoin address".to_string()))?
                        .assume_checked();
                    //TODO use actual number of used address from current state
                    match xpub.find_path(hd_account, &address, 1000) {
                        Some(path) => path,
                        None => return Err(VaultNodeError::OtherInput(format!("Unknown address: {:?}", address)))
                    }
                },
                None => return Err(VaultNodeError::OtherInput("Neither HDPath nor Address is specified".to_string()))
            }
        };
        let value = InputReference {
            output: OutPoint {
                txid: Txid::from_str(input.txid.as_str())
                    .map_err(|_| VaultNodeError::OtherInput("Invalid txid".to_string()))?,
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

fn convert_output(outputs: Vec<OutputJson>) -> Result<Vec<TxOut>, VaultNodeError> {
    let mut result = Vec::with_capacity(outputs.len());
    for output in outputs {
        let address = Address::from_str(output.address.as_str())
            .map_err(|_| VaultNodeError::OtherInput("Invalid output bitcoin address".to_string()))?;
        let value = TxOut {
            value: Amount::from_sat(output.amount),
            script_pubkey: address.assume_checked().script_pubkey(),
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
        password: Option<String>,
    ) -> Result<Vec<u8>, VaultNodeError> {
        let storage = &self.cfg.get_storage();
        let entry = self.get_entry(wallet_id, entry_id)?;
        if entry.blockchain.get_type() != BlockchainType::Ethereum {
            return Err(VaultNodeError::OtherInput("Not an ethereum entry".to_string()));
        }

        let from_address =
            EthereumAddress::from_str(unsigned_tx.from.as_str())?;

        if let Some(address) = &entry.address {
            match address {
                AddressRef::EthereumAddress(current) => if current.ne(&from_address) {
                    return Err(VaultNodeError::OtherInput("Different from address".to_string()))
                },
                _ => {
                    return Err(VaultNodeError::OtherInput("Unsupported wallet from address".to_string()))
                }
            }
        }

        let chain_id = EthereumChainId::from(entry.blockchain);
        let result = if unsigned_tx.is_eip1559() {
            let tx = unsigned_tx.as_eip1559(&chain_id)?;
            entry.sign_tx(tx, password, &storage)?
        } else {
            let tx = unsigned_tx.as_legacy(&chain_id)?;
            entry.sign_tx(tx, password, &storage)?
        };

        Ok(result)
    }

    fn sign_bitcoin_tx(
        &self,
        wallet_id: Uuid,
        entry_id: usize,
        unsigned_tx: UnsignedBitcoinTxJson,
        password: Option<String>,
    ) -> Result<Vec<u8>, VaultNodeError> {
        let storage = &self.cfg.get_storage();
        let entry = self.get_entry(wallet_id, entry_id)?;
        if entry.blockchain.get_type() != BlockchainType::Bitcoin {
            return Err(VaultNodeError::OtherInput("Not a bitcoin entry".to_string()));
        }

        let seed_ref = match &entry.key {
            PKType::SeedHd(seed) => seed,
            _ => return Err(VaultNodeError::OtherInput("Unsupported PK".to_string()))
        };
        let seed = storage.seeds().get(seed_ref.seed_id)?;
        let seed_id = seed.id.clone();
        let hd_account = AccountHDPath::from(&seed_ref.hd_path);
        let xpub = match &entry.address {
            Some(ar) => match ar {
                AddressRef::ExtendedPub(value) => value,
                _ => return Err(VaultNodeError::OtherInput("Unsupported type of address".to_string()))
            },
            None => return Err(VaultNodeError::OtherInput("No address for the entry".to_string()))
        };

        let keys = if let Some(password) = password {
            if seed.is_odd_key() {
                KeyMapping::single(seed_id, password)
            } else {
                let global = storage.global_key().get()?;
                KeyMapping::global(global, password)
            }
        } else {
            KeyMapping::default()
        };

        let proposal = BitcoinTransferProposal {
            network: entry.blockchain.as_bitcoin_network_kind(),
            seed: vec![seed],
            keys,
            input: convert_inputs(unsigned_tx.inputs, &xpub, seed_id, &hd_account)?,
            output: convert_output(unsigned_tx.outputs)?,
            change: entry.clone(),
            expected_fee: unsigned_tx.fee,
        };
        let valid = proposal.validate();
        if valid.is_ok() {
            entry.sign_bitcoin(proposal)
                .map_err(|e| VaultNodeError::VaultError(format!("Failed to sign: {:?}", e)))
        } else {
            Err(VaultNodeError::VaultError(format!("Invalid tx: {:?}", valid.expect_err("no_error_on_invalid"))))
        }
    }
}

fn bitcoin_tx_hash(tx: &Vec<u8>) -> Result<String, VaultNodeError> {
    // clone here because consensus_decode want a _mutable reference_, and we don't want any changes to our original transaction
    let mut raw = tx.as_slice().clone();
    let parsed = Transaction::consensus_decode(&mut raw)
        .map_err(|_| VaultNodeError::OtherProcessing("Generated an invalid tx".to_string()))?;
    let txid = parsed.txid().to_string();
    Ok(txid)
}

fn sign_tx_internal(vault: &WrappedVault, wallet_id: Uuid, entry_id: usize, tx_json: String, password: Option<String>) -> Result<SignedTxJson, VaultNodeError> {
    let entry = vault.get_entry(wallet_id, entry_id)
        .map_err(|_| VaultNodeError::OtherInput(format!("Unknown entry {} at {:}", entry_id, wallet_id)))?;

    let signed_tx = match entry.blockchain.get_type() {
        BlockchainType::Ethereum => {
            let unsigned_tx =
                serde_json::from_str::<UnsignedEthereumTxJson>(tx_json.as_str())
                    .map_err(|_| VaultNodeError::InvalidArgument(3))?;
            let signed_tx = vault.sign_ethereum_tx(wallet_id, entry_id, unsigned_tx, password)?;
            let hash = keccak256(signed_tx.as_slice());
            SignedTxJson {
                raw: format!("0x{}", hex::encode(signed_tx)),
                txid: format!("0x{}", hex::encode(hash)),
            }
        }
        BlockchainType::Bitcoin => {
            let unsigned_tx =
                serde_json::from_str::<UnsignedBitcoinTxJson>(tx_json.as_str())
                    .map_err(|_| VaultNodeError::InvalidArgument(3))?;
            let raw = vault.sign_bitcoin_tx(wallet_id, entry_id, unsigned_tx, password)?;
            let txid = bitcoin_tx_hash(&raw)?;
            SignedTxJson {
                raw: hex::encode(raw),
                txid
            }
        }
    };

    Ok(signed_tx)
}

fn sign_msg_internal(vault: &WrappedVault, wallet_id: Uuid, entry_id: usize, msg: UnsignedMessageJson, password: Option<String>) -> Result<SignedMessageJson, VaultNodeError> {
    let entry = vault.get_entry(wallet_id, entry_id)
        .map_err(|_| VaultNodeError::OtherInput(format!("Unknown entry {} at {:}", entry_id, wallet_id)))?;
    let storage = &vault.cfg.get_storage();

    let signed = match entry.blockchain.get_type() {
        BlockchainType::Ethereum => {
            match msg {
                UnsignedMessageJson::EIP191 { message } => {
                    let signature = entry.sign_message(&message, password, storage)?;
                    let address = entry.address.expect("No address").to_string(); //TODO
                    SignedMessageJson::EIP191 { signature, address }
                },
                UnsignedMessageJson::EIP712 { message } => {
                    let data = parse_eip712(message)?;
                    let signature = entry.sign_message(&data, password, storage)?;
                    let address = entry.address.expect("No address").to_string(); //TODO
                    SignedMessageJson::EIP712 { signature, address }
                }
            }
        }
        BlockchainType::Bitcoin => {
            return Err(VaultNodeError::OtherInput("Message signing with Bitcoin keys is not available".to_string()))
        }
    };

    Ok(signed)
}

fn signature_author_internal(msg: UnsignedMessageJson, signature: String) -> Result<String, VaultNodeError> {

    let signature = EthereumBasicSignature::from_str(signature.as_str())?;
    let author= match msg {
        UnsignedMessageJson::EIP191 { message } => {
            signature.extract_signer(&message as &dyn SignableHash)?
        },
        UnsignedMessageJson::EIP712 { message } => {
            signature.extract_signer(&parse_eip712(message)? as &dyn SignableHash)?
        },
    };

    Ok(author.to_string())
}

#[neon_frame_fn(channel=4)]
pub fn sign_tx<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<SignedTxJson, VaultNodeError>) + Send + 'static {

    let vault = Instance::get_vault()?;

    let wallet_id = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "walletId".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(0))?;

    let entry_id = cx
        .argument::<JsNumber>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "entryId".to_string()))?
        .value(cx) as usize;

    let unsigned_tx = cx
        .argument::<JsString>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "tx".to_string()))?
        .value(cx);

    let password = args_get_str(cx, 3);

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let result = sign_tx_internal(&vault, wallet_id, entry_id, unsigned_tx, password);
        handler(result.map_err(|e| VaultNodeError::from(e)));
    });

    Ok(())
}

#[neon_frame_fn(channel=4)]
pub fn sign_message<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<SignedMessageJson, VaultNodeError>) + Send + 'static {

    let vault = Instance::get_vault()?;

    let wallet_id = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "walletId".to_string()))?
        .value(cx);
    let wallet_id = Uuid::from_str(wallet_id.as_str())
        .map_err(|_| VaultNodeError::InvalidArgument(0))?;

    let entry_id = cx
        .argument::<JsNumber>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "entryId".to_string()))?
        .value(cx) as usize;

    let unsigned_msg = cx
        .argument::<JsString>(2)
        .map_err(|_| VaultNodeError::ArgumentMissing(2, "message".to_string()))?
        .value(cx);

    let unsigned_msg =
        serde_json::from_str::<UnsignedMessageJson>(unsigned_msg.as_str())
            .map_err(|_| VaultNodeError::InvalidArgument(2))?;

    let password = args_get_str(cx, 3);

    std::thread::spawn(move || {
        let vault = vault.lock().unwrap();
        let result = sign_msg_internal(&vault, wallet_id, entry_id, unsigned_msg, password);
        handler(result.map_err(|e| VaultNodeError::from(e)));
    });

    Ok(())
}

#[neon_frame_fn(channel=2)]
pub fn signature_author<H>(cx: &mut FunctionContext, handler: H) -> Result<(), VaultNodeError>
    where
        H: FnOnce(Result<String, VaultNodeError>) + Send + 'static {

    let unsigned_msg = cx
        .argument::<JsString>(0)
        .map_err(|_| VaultNodeError::ArgumentMissing(0, "message".to_string()))?
        .value(cx);

    let unsigned_msg =
        serde_json::from_str::<UnsignedMessageJson>(unsigned_msg.as_str())
            .map_err(|_| VaultNodeError::InvalidArgument(0))?;

    let signature =cx
        .argument::<JsString>(1)
        .map_err(|_| VaultNodeError::ArgumentMissing(1, "signature".to_string()))?
        .value(cx);

    std::thread::spawn(move || {
        let result = signature_author_internal(unsigned_msg, signature);
        handler(result.map_err(|e| VaultNodeError::from(e)));
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use sign::bitcoin_tx_hash;

    #[test]
    fn extract_bitcoin_txid() {
        let raw = "02000000000102420b59b9d50065fc4c92cad5319f525b9499f5cd2f36e0e8e080753bba47f0e80000000000fdffffffbe67b9ea7a560978388a4d292c855d00b885b09d08676a030ce7525b239549660000000000fdffffff01dea14e000000000017a91425b8d7549beb1368d86161c376d8aecf43d0db2c870247304402205d7a1526c70d5f1b27f4e9052bcaf1649961104f1d1199cdc456523c12a821ee022062b3c99a453db44c4f6addd240e86b0eb1caf9e47ee7cbc874f3f92fbed3f5ed012102b3075a760a7ba294a43ebb57392f20e2d3f296073c2bb417f939987f9af4676f02483045022100a4b96d9a111dd0102bb42d3711e3ff3e70ae4642744783b6be4cca9198154ea002201bfdc44de5b27ab241e4059926ef226e5cbde4ab05c8de1db74775fa35076345012102b3075a760a7ba294a43ebb57392f20e2d3f296073c2bb417f939987f9af4676f00000000";
        let txid = bitcoin_tx_hash(&hex::decode(raw).unwrap()).unwrap();
        assert_eq!(txid, "f8ba2091071f687a85b5294fe34b3b0c18e9f7ef54cab91e380c70b15af30fc7".to_string());

        let raw = "02000000000101ae52c699b61c43aa4f4c1428cb1e791d612e7b099a8b605b5462068f243b71d60100000000fdffffff027375120000000000160014817cbce72f18ec6760eb92c6e19779db33fb98e9db43833c00000000160014f60834ef165253c571b11ce9fa74e46692fc5ec10248304502210081d536bed9fb9fcb29aeb75832f065f1fd9cedb425cba09a87fd6aebe9a619b4022058c29c93a4ac81bd642fc1066f0a8aa2263474764fc801f6b80cd211d699b46c0121026e5628506ecd33242e5ceb5fdafe4d3066b5c0f159b3c05a621ef65f177ea28600000000";
        let txid = bitcoin_tx_hash(&hex::decode(raw).unwrap()).unwrap();
        assert_eq!(txid, "18fd8cc6ad9fb31c5fafd0196615c323c790e0bed650352c0c356350b694d83a".to_string());

        let raw = "0100000000010144b467162fc3670f7f66b8dd6211734754e464ebe4f0670d4c7233ae63e9ee980200000000ffffffff0699684f00000000001976a9148da96115faedead36580f5d039c0030e93e76d6888ac80d72500000000001976a9148370eb8dbe2c66d37138742fb56eae44d42d7b9c88aca0c44a00000000001976a914879c2c033c17f5230992df0f09a74ee01b5f11de88ac20300500000000001976a914ab962daca03bdec656f0d7f4bfc9bdb5388279bb88aca0860100000000001976a9145dfb262c07e46bbab2141f178635455585afb69888ac6fe0480100000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d0400473044022077cb08bc09be2fe59256c0104664dc0b900f1de4d6701edc27e25bb74707632b022008365dfab4bdbe5fcf88b97d9c91dfdf6d2396ba8edaa7b059e28f8287a52f1c014730440220102335144fa9b4254ef653f37157baaca1386a44f4a24f4baa48b7052028ac120220791fc1bbc5b3a5fd767339fe8a7d10ddd0422d6916dd001038db224c2757c7b9016952210375e00eb72e29da82b89367947f29ef34afb75e8654f6ea368e0acdfd92976b7c2103a1b26313f430c4b15bb1fdce663207659d8cac749a0e53d70eff01874496feff2103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f88053ae00000000";
        let txid = bitcoin_tx_hash(&hex::decode(raw).unwrap()).unwrap();
        assert_eq!(txid, "6f00634c07c9a2954cdf71db2ef9c51c547c56e786fe5036e5b5cba735909aaa".to_string());
    }

    #[test]
    fn extract_bitcoin_testnet_txid() {
        let raw = "01000000000101f932958cce1453df13d2860d56ad11bef28811d7a2a73809a95778cd4db3196d0100000017160014854f66d66c9ef68560d72a0bf9736a9822063ea6ffffffff027e9909000000000017a91439abfb47b25303828f7289a7f0943ec489f1c7b887307500000000000017a914aaccfe2dd25d7c030ab5691aab601b8760e4db2e8702483045022100c894a86da2c6283289e1394f3e2222096684718387436efcaa288df376b92b9c02206c9cacbf4da0b9eb514b0c4b5ac8bfa1aeb356506117c09bb75daceeea7dce66012102a947c0181cfdf7358b63a2567c1babd31878618e814de3ba5da460e9f42be84800000000";
        let txid = bitcoin_tx_hash(&hex::decode(raw).unwrap()).unwrap();
        assert_eq!(txid, "e9e711e7bd74faabc71ca0bfaa6efdd79295fad1e93abec5e3f9656362f36812".to_string());


        let raw = "0100000001065dc13cecdaa1c70d6786bc0630c0cac852a50e904b541de99d49bbf657450c030000006b48304502210081191bd5c20510846322ab38eabf7d4de7ae9b8759f4bf296419285366e43e14022049dbd681fb905fd90f527e1ede3f47ccf483ef5ddfb015a7b14456397e15c9010121037435c194e9b01b3d7f7a2802d6684a3af68d05bbf4ec8f17021980d777691f1dfdffffff042530000000000000536a4c5054325b4fab475bb321cfae6ae84b733c49369f24a8b49b131d547b38041fb490d588b4b618e4e3c9d790ff426ee92917cac4e2c6ff7e01cf4667375bedf477ce9aadf70023d060000e0023c7fb00162cfd0e0000000000001976a914000000000000000000000000000000000000000088acfd0e0000000000001976a914000000000000000000000000000000000000000088ac83207f47000000001976a914ba27f99e007c7f605a8305e318c1abde3cd220ac88ac00000000";
        let txid = bitcoin_tx_hash(&hex::decode(raw).unwrap()).unwrap();
        assert_eq!(txid, "52f49ce2579c53ca21a173ffa957cd97dad5efa2b883def65173d49023212d41".to_string());

        let raw = "02000000000101182ecf6ebca7829616f0bdd77fcb8c1af307696f974c660ffbfed3e5938d8fc801000000000000008001d80e00000000000022002008154180bf4c201bcd730d6ee5d1c67cf468feb2ddac0872be25c9b9ee3234e90247304402204b461d7803ba471e4c6368effb786d25c3500264a3e5739b79b9bfad11fdcfef02206fe3b03c4eb8f23b3bc26437a7e1a988cad56599a528adcd308a2a05d630cdc90121027fa8ff04d9791035ea6a319237066658135b09304b35ec6909d725fee15af70200000000";
        let txid = bitcoin_tx_hash(&hex::decode(raw).unwrap()).unwrap();
        assert_eq!(txid, "97939a566ca38611550a993a2865bc59c3f9a662bbf111b0269c15f5f5e384a5".to_string());
    }
}
