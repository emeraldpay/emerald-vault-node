export type BlockchainType = "ethereum" | "bitcoin";
/**
 * Type of Seed:
 * - `mnemonic` series of words, as per BIP-39
 * - `raw` BIP-39 key in bytes, that's what you get after processing BIP-39 phrase and that's what Vault stored on disk
 * - `ledger` Ledger Hardware Key
 */
export type SeedType = "raw" | "ledger" | "mnemonic";
/**
 * Type of reference to a Seed:
 * - `ledger` a currently connected Ledger device
 * - `mnemonic` provided words as per BIP-39
 * - `id` of an existing Seed in the Vault
 */
export type SeedRefType = "ledger" | "mnemonic" | "id";
/**
 * Type of Key that backs the Entry.
 * Could be:
 * - `pk` an individual Private Key
 * - `hd-path` a HDPath on a shared Seed
 */
export type EntryType = "pk" | "hd-path";
export type ImportPkType = "ethereum-json" | "raw-pk-hex" | "hd-path" | "generate-random";
export type AddressRole = "receive" | "change";
export type LedgerApp = "bitcoin" | "bitcoin-testnet" | "ethereum" | "ethereum-classic";

export enum BlockchainId {
    BITCOIN = 1,
    ETHEREUM = 100,
    ETHEREUM_CLASSIC = 101,
    KOVAN_TESTNET = 10002,
    BITCOIN_TESTNET = 10003,
    GOERLI_TESTNET = 10005,
}

export const DEFAULT_BITCOIN_SEQ = 0xfffffffe;

export function getBlockchainType(id: BlockchainId): BlockchainType {
    if (id == BlockchainId.BITCOIN || id == BlockchainId.BITCOIN_TESTNET) {
        return "bitcoin";
    }
    if (id == BlockchainId.ETHEREUM || id == BlockchainId.ETHEREUM_CLASSIC || id == BlockchainId.KOVAN_TESTNET || id == BlockchainId.GOERLI_TESTNET) {
        return "ethereum";
    }
    throw new Error("Unsupported id: " + id);
}

export function isBlockchainId(id: number): id is BlockchainId {
    return id === BlockchainId.BITCOIN || id === BlockchainId.BITCOIN_TESTNET
        || id === BlockchainId.ETHEREUM || id === BlockchainId.ETHEREUM_CLASSIC
        || id === BlockchainId.KOVAN_TESTNET || id === BlockchainId.GOERLI_TESTNET;
}

/**
 * UUID string, identifier of a Wallet/Seed/etc
 */
export type Uuid = string;

/**
 * UUID-NUMBER id of an entry, where UUID is id of the parent wallet, and NUMBER is entry id inside the wallet
 */
export type EntryId = string;

export type Update = {
    name?: string | null,
    description?: string | null
}

/**
 * Basic (aka Legacy) Ethereum transaction. Supported from the beginning and still supported by almost
 * every Ethereum-compatible blockchain.
 */
export interface UnsignedBasicEthereumTx {
    /**
     * Sender address.
     */
    from: string,
    /**
     * Target address. May be `null` if the transaction is supposed to create a contract.
     */
    to?: string | null,
    /**
     * Transaction Gas Limit
     */
    gas: number,
    /**
     * Price to pay for gas.
     *
     * Wei encoded as a string. __NOT a hex-value__, but a normal decimal encoded as a string.
     */
    gasPrice: string,
    /**
     * Value to transfer in Wei.
     *
     * __NOT a hex-value__, but a normal decimal encoded as a string.
     */
    value: string,
    /**
     * Optional data. Encoded as hex with `0x` prefix
     */
    data?: string | null,
    /**
     * Transaction sequence number
     */
    nonce: number,
}

/**
 * New type of Ethereum transactions. Supported since August 2021 on Ethereum Mainnet.
 * The main difference is `maxGasPrice` and `priorityGasPrice` instead of `gasPrice` as it was before.
 * With such transaction there is a `baseFee` for gas set by a Miner, and a user can pay some
 * `priorityGasPrice` on top of that `baseFee` to include TX in a block.
 * Note that the `priorityGasPrice` is supposed to be a small amount, like 2 Gwei, and may be even zero.
 * `maxGasPrice` is a maximum user agrees to pay, i.e. an upper limit for `baseFee + priorityGasPrice`.
 *
 * See EIP-1559 - https://eips.ethereum.org/EIPS/eip-1559
 */
export interface UnsignedEIP1559EthereumTx {
    /**
     * Sender address.
     */
    from: string,
    /**
     * Target address. May be `null` if the transaction is supposed to create a contract.
     */
    to?: string | null,
    /**
     * Transaction Gas Limit
     */
    gas: number,
    /**
     * Max price to pay for gas. Upper limit.
     *
     * Wei encoded as a string. __NOT a hex-value__, but a normal decimal encoded as a string.
     */
    maxGasPrice: string,
    /**
     * Addition price for gas to pay on top of the `baseFee` of a block.
     *
     * Wei encoded as a string. __NOT a hex-value__, but a normal decimal encoded as a string.
     */
    priorityGasPrice: string,
    /**
     * Value to transfer in Wei.
     *
     * __NOT a hex-value__, but a normal decimal encoded as a string.
     */
    value: string,
    /**
     * Optional data. Encoded as hex with `0x` prefix
     */
    data?: string | null,
    /**
     * Transaction sequence number
     */
    nonce: number,
    /**
     * Optional list of address the transaction will access. May save some money.
     */
    accessList?: {
        /**
         * Address that would be accessed. Supposed to be a smart-contract address.
         */
        address: string,
        /**
         * Optional list of storage keys access by the transaction
         */
        storage?: string[] | null
    }[] | null
}

export type UnsignedEthereumTx = UnsignedBasicEthereumTx | UnsignedEIP1559EthereumTx;

export interface UnsignedBitcoinTx {
    inputs: {
        txid: string;
        vout: number;
        // see DEFAULT_BITCOIN_SEQ
        sequence?: number;
        amount: number;
        hdPath?: string;
        address?: string;
        entryId?: EntryId;
    }[];
    outputs: {
        address: string;
        amount: number;
        entryId?: EntryId;
        hdPath?: string;
    }[];
    fee: number;
}

export type UnsignedTx = UnsignedBitcoinTx | UnsignedEthereumTx;

export function isBitcoinTx(tx: UnsignedTx): tx is UnsignedBitcoinTx {
    return typeof tx == "object" && Object.keys(tx).indexOf("inputs") >= 0;
}

export function isEthereumTx(tx: UnsignedTx): tx is UnsignedEthereumTx {
    return typeof tx == "object" && Object.keys(tx).indexOf("from") >= 0;
}

/**
 * Signed transaction
 */
export interface SignedTx {
    /**
     * Actual data for the signed transaction
     */
    raw: string;
    /**
     * ID or Hash of the transaction that can be used to reference it in blockchain
     */
    txid: string;
}

export type ImportMnemonic = {
    name?: string | null,
    description?: string | null,
    password: string,
    mnemonic: string,
    hdPath: string,
}

export type AddressSingle = {
    type: 'single',
    value: string
}

export type AddressXPub = {
    type: 'xpub',
    value: string
}

export type AddressRef = AddressSingle | AddressXPub;

export function isAddressSingle(value: AddressRef): value is AddressSingle {
    return value.type == 'single';
}

export function isAddressXPub(value: AddressRef): value is AddressXPub {
    return value.type == 'xpub';
}

export type AddressBookItem = {
    address: AddressRef,
    description?: string,
    name?: string,
    blockchain: number,
    createdAt: Date,
}

export type CreateAddressBookItem = {
    address: AddressRef,
    description?: string,
    name?: string,
    blockchain: number,
}

export type ImportPrivateKey = {
    name?: string | null,
    description?: string | null,
    pk: string,
    password: string
}

export type PKRef = {
    type: EntryType,
    keyId: Uuid
}

export type SeedPKRef = {
    type: EntryType,
    seedId: Uuid,
    hdPath: string
}

export interface BaseEntry {
    /**
     * String Id of the entry
     */
    id: EntryId,
    /**
     * Blockchain Id
     */
    blockchain: number,
    /**
     * Reference to the Private Key
     */
    key: PKRef | SeedPKRef | undefined,
    /**
     * If true then entry should be used only for Sending from
     */
    receiveDisabled?: boolean | undefined,
    /**
     * Optional user defined label for the entry
     */
    label?: string | undefined,
    /**
     * Creation timestamp of the entry
     */
    createdAt: Date,
}

export interface EthereumEntry extends BaseEntry {
    /**
     * Address of the entry.
     * It maybe undefined, for example if entry is created as HD Path on a Ledger which wasn't connected during creation
     */
    address: AddressSingle | undefined,
}

export interface BitcoinEntry extends BaseEntry {
    /**
     * Address as XPub covering all types of addresses for the entry, i.e. starts from Account level and includes both
     * external and internal (receive and change) sets. For an actual address to receive refer to .addresses property.
     * May be undefined.
     */
    address: AddressXPub | undefined;
    /**
     * Current addresses to use, can include multiple available addresses (depending on the configuration and implementation).
     * May be empty, when xpub is unavailable or the entry is not supposed to receive any transaction.
     *
     * @deprecated use vault.listEntryAddresses instead
     */
    addresses: CurrentAddress[];
    /**
     * Current xpub to use and fetch balance
     */
    xpub: CurrentXpub[];
}

export interface CurrentAddress {
    address: string;
    hdPath: string;
    role: AddressRole;
}

export interface CurrentXpub {
    xpub: string;
    role: AddressRole;
}

export type WalletEntry = EthereumEntry | BitcoinEntry;

export type Wallet = {
    id: Uuid,
    name?: string | undefined,
    description?: string | undefined,
    entries: WalletEntry[],
    reserved?: HDPathAccount[] | undefined,
    createdAt: Date,
}

/**
 * Options to create a new wallet
 */
export type WalletCreateOptions = {
    name?: string | undefined,
    reserved?: HDPathAccount[] | undefined
}

/**
 * BIP-44 Account Id for Seed (ex.: account is 1 on m/44'/0'/1'/0/0)
 */
export type HDPathAccount = {
    /**
     * Target Seed Id
     */
    seedId: Uuid,
    /**
     * account number
     */
    accountId: number
}

export type HDPathAccounts = {[key: string]: number[]};

// HDPath format: m / purpose' / coin_type' / account' / change / address_index
let HDPATH_REGEX = /m\/(\d+)'\/(\d+)'\/(\d+)'\/(\d+)(\/(\d+))?/;

/**
 * Extract used BIP-44 account from HD Path
 *
 * @param pk Seed based PK (SeedPKRef)
 * @return account or undefined if HDPath doesn't match BIP-44 standard
 */
export function getAccountId(pk: SeedPKRef): number | undefined {
    let m = pk.hdPath.match(HDPATH_REGEX);
    if (!m) {
        return undefined
    }
    return parseInt(m[3]);
}

export function isEthereumEntry(acc: WalletEntry): acc is EthereumEntry {
    return typeof acc === 'object' && isBlockchainId(acc.blockchain) && getBlockchainType(acc.blockchain) == "ethereum";
}

export function isBitcoinEntry(acc: WalletEntry): acc is BitcoinEntry {
    return typeof acc === 'object' && isBlockchainId(acc.blockchain) && getBlockchainType(acc.blockchain) == "bitcoin";
}

export function isSeedPkRef(acc: WalletEntry, key: PKRef | SeedPKRef | undefined): key is SeedPKRef {
    return typeof key === 'object'
        && isReference(key["seedId"])
        && typeof key["hdPath"] === "string"
}

// {UUID}-{INDEX}
let ENTRY_ID_REGEX = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})-([0-9]+)$/;

export function isEntryId(id: string): id is EntryId {
    return id.match(ENTRY_ID_REGEX) != null
}

export function extractWalletId(id: EntryId): Uuid {
    let m = id.match(ENTRY_ID_REGEX);
    if (typeof m !== 'object' || m === null) {
        throw new Error("Invalid id: " + id)
    }
    return m[1]
}

export function extractEntryInternalId(id: EntryId): number {
    let m = id.match(ENTRY_ID_REGEX);
    if (typeof m !== 'object' || m === null) {
        throw new Error("Invalid id: " + id)
    }
    return parseInt(m[2])
}

interface AddAnyEntry {
    blockchain: number;
}

export interface AddJsonEntry extends AddAnyEntry {
    type: "ethereum-json";
    /**
     * JSON key as a string
     */
    key: string;
    /**
     * Password used by the JSON file
     */
    jsonPassword: string;
    /**
     * Global Key password (Global Key must be set prior)
     */
    password: string;
}

export interface AddRawPkEntry extends AddAnyEntry {
    type: "raw-pk-hex";
    key: string;
    password: string;
}

export interface AddSeedEntry extends AddAnyEntry {
    type: "hd-path";
    key: SeedEntry;
}

export interface AddRandomEntry extends AddAnyEntry {
    type: "generate-random";
    password: string;
}

export type AddEntry = AddJsonEntry | AddRawPkEntry | AddSeedEntry | AddRandomEntry;

export type SeedEntry = {
    seed: SeedReference,
    hdPath: string,
    /**
     * (optional) Expected Address on that path
     * Can used for verification or saved with the created entry, if actual address is impossible to get (ex. when
     * the seed is Ledger based, but Ledger is not connected)
     */
    address?: string
}

export interface SeedDetails {
    /**
     * User assigned label
     */
    label?: string,
    /**
     * System assigned date when the seed was added to the Vault
     */
    createdAt: Date,
}

export interface SeedDescription extends SeedDetails {
    id?: Uuid,
    type: SeedType,
    available: boolean,
}

export interface BaseSeedDefinition {
    /**
     * Password to _encrypt_ seed data in the vault
     */
    password?: string;
    /**
     * optional label to save with the seed
     */
    label?: string;
}

export interface RawSeedDefinition extends BaseSeedDefinition {
    type: "raw";
    value: RawSeed;
}

export interface MnemonicSeedDefinition extends BaseSeedDefinition {
    type: "mnemonic";
    value: MnemonicSeed;
}

/**
 * Full Definition for a new Seed, i.e. to create a new one in the Vault
 */
export type SeedDefinition = RawSeedDefinition | MnemonicSeedDefinition;

/**
 * Reference to a created Seed by its ID
 */
export interface IdSeedReference {
    type: "id";
    value: Uuid;
    /**
     * Password to _decrypt_ stored seed data. Only needed when the seed must be decrypted for an action (i.e. create a tx, see addresses on seed, etc)
     */
    password?: string;
}

/**
 * A Seed Reference for _any connected_ Ledger. Supposed to be used only during creation of a wallet.
 * Otherwise, if an ID is known the `IdSeedReference` must be used.
 */
export interface LedgerSeedReference {
    type: "ledger";
}

/**
 * Reference to a seed, which may exist in vault or accessible in other ways (ex. hardware key)
 */
export type SeedReference = IdSeedReference | LedgerSeedReference;

export interface MnemonicSeed {
    /**
     * Mnemonic phrase
     */
    value: string;
    /**
     * Optional Mnemonic password
     */
    password?: string;
}

export type RawSeed = string;

export function isReference(seed: Uuid | SeedDefinition | SeedReference): seed is Uuid {
    return typeof seed === "string";
}

export function isRawSeed(value: RawSeed | MnemonicSeed, parent: SeedDefinition): value is RawSeed {
    return typeof parent == "object" && typeof value == "string" && parent.type === "raw";
}

export function isMnemonic(value: RawSeed | MnemonicSeed, parent: SeedDefinition): value is MnemonicSeed {
    return typeof parent == "object" && typeof value == "object" && parent.type === "mnemonic";
}

export function isLedger(value: Uuid | SeedReference): value is LedgerSeedReference {
    return typeof value === "object" && isSeedReference(value) && value.type === "ledger";
}

export function isIdSeedReference(value: Uuid | SeedReference): value is IdSeedReference {
    return typeof value === "object" && isSeedReference(value) && value.type === "id";
}

export function isSeedReference(value: Uuid | SeedReference | SeedDefinition): value is SeedReference {
    return typeof value === "object" && (value.type == "id" || value.type == "ledger");
}

export interface LedgerDetails {
    type: "ledger";
    /**
     * `true` is Ledger is physically connected.
     * Note that it doesn't always mean that Ledger can be used, because it depends on which App (`app`) is opened on Ledger
     */
    connected: boolean;
    /**
     * Application which is opened on Ledger. Or `null` if unknown or no app is opened.
     */
    app: LedgerApp | null;
}

export type HWKeyDetails = LedgerDetails;

export function isLedgerDetails(value: HWKeyDetails): value is LedgerDetails {
    return typeof value === "object" && value.type === "ledger";
}

/**
 * Reference to a vault item that doesn't use Global Key
 */
export interface OddPasswordItem {
    type: "seed" | "key";
    id: Uuid;
}

/**
 * Exported Ethereum Web3 Key
 */
export interface ExportedWeb3Json {
    /**
     * Private key in Web3 JSON format
     */
    json: string;
    /**
     * Password used by the JSON file to encrypt the Private Key
     */
    password: string;
}

export interface AccountIndex {
    walletId: Uuid,
    entryId: number;
    receive: number;
    change: number;
}

export interface WalletState {
    accountIndexes: AccountIndex[];
}

export interface UnsignedMessage {
    type: "eip191" | "eip712";

    /**
     * A message to sign. For EIP-712 it's a JSON encode to string
     */
    message: string;
}

export interface SignedMessage {
    type: "eip191" | "eip712";

    /**
     * Signature encoded as a string (hex)
     */
    signature: string;

    /**
     * Signer Address
     */
    address: string;
}

/**
 * Image details for entry icons
 */
export interface IconDetails {
    /**
     * ID of the icon. Always same as entry ID
     */
    id: Uuid;

    /**
     * Details about the related entry
     */
    entry: {
        id: Uuid;
        type: "seed" | "wallet";
    };

    format: "png";
}

/**
 * Just return the current state
 */
export interface WatchCurrent {
    type: "get-current"
}

/**
 * Wait until any change to the list of available devices happen. Could be a new device, a current device disconnect, or another app opened.
 */
export interface WatchChange {
    type: "change",
    /**
     * Last know version of the state
     */
    version: number,
}

/**
 * Wait until the specified blockchain becomes available on the device
 */
export interface WatchAvailable {
    type: "available",

    /**
     * Requested blockchain
     */
    blockchain: number,
}

export type WatchRequest = WatchCurrent | WatchChange | WatchAvailable;

interface WatchEventDevice {
    /**
     * Uniq device id.
     */
    id: Uuid,
    /**
     * Seed ID associated with the HW device. If known.
     */
    seed?: Uuid | undefined,
    /**
     * List of available blockchain. Can be empty (ex., when the Ledger is connected but no app launched)
     */
    blockchains: number[]
}

/**
 * Response the WatchRequest
 */
export interface WatchEvent {
    /**
     * Version of the state. It's a monotonic increasing number to reference a particular state.
     * Used as a basis for WatchChange request
     */
    version: number,

    /**
     * List of currently available devices. Could be empty
     */
    devices: WatchEventDevice[]
}
