export type BlockchainType = "ethereum" | "bitcoin";
export type SeedType = "raw" | "ledger" | "mnemonic";
export type SeedRefType = "ledger" | "mnemonic" | "id";
export type EntryType = "pk" | "seed-hd";
export type ImportPkType = "ethereum-json" | "raw-pk-hex" | "hd-path" | "generate-random";
export type AddressRole = "receive" | "change";

export enum BlockchainId {
    BITCOIN = 1,
    ETHEREUM = 100,
    ETHEREUM_CLASSIC = 101,
    KOVAN_TESTNET = 10002,
    BITCOIN_TESTNET = 10003,
}

export function getBlockchainType(id: BlockchainId): BlockchainType {
    if (id == BlockchainId.BITCOIN || id == BlockchainId.BITCOIN_TESTNET) {
        return "bitcoin";
    }
    if (id == BlockchainId.ETHEREUM || id == BlockchainId.ETHEREUM_CLASSIC || id == BlockchainId.KOVAN_TESTNET) {
        return "ethereum";
    }
    throw new Error("Unsupported id: " + id);
}

export function isBlockchainId(id: number): id is BlockchainId {
    return id === BlockchainId.BITCOIN || id === BlockchainId.BITCOIN_TESTNET
        || id === BlockchainId.ETHEREUM || id === BlockchainId.ETHEREUM_CLASSIC
        || id === BlockchainId.KOVAN_TESTNET;
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

export interface UnsignedEthereumTx {
    from: string,
    to?: string | null,
    gas: string,
    gasPrice: string,
    value: string,
    data?: string | null,
    nonce: string,
}

export interface UnsignedBitcoinTx {
    inputs: {
        txid: string;
        vout: number;
        amount: number;
        hdPath?: string;
        address?: string;
    }[];
    outputs: {
        address: string;
        amount: number;
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
    key: string;
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
    // (optional) Expected Address on that path
    // Can used for verification or saved with the created entry, if actual address is impossible to get (ex. when
    // the seed is Ledger based, but Ledger is not connected)
    address?: string
}

export type SeedDescription = {
    id?: Uuid,
    type: SeedType,
    available: boolean,
    label?: string,
    createdAt: Date,
}

export interface BaseSeedDefinition {
    // Password to _encrypt_ seed data in the vault
    password?: string;
    // optional label to save with the seed
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
 * Full Definition for a new Seed, i.e. to create
 */
export type SeedDefinition = RawSeedDefinition | MnemonicSeedDefinition;

export interface IdSeedReference {
    type: "id";
    value: Uuid;
    // Password to _decrypt_ stored seed data
    password?: string;
}

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

export function isLedger(value: SeedReference): value is LedgerSeedReference {
    return isSeedReference(value) && value.type === "ledger";
}

export function isIdSeedReference(value: SeedReference): value is IdSeedReference {
    return isSeedReference(value) && value.type === "id";
}

export function isSeedReference(value: Uuid | SeedReference | SeedDefinition): value is SeedReference {
    return typeof value === "object" && (value.type == "id" || value.type == "ledger");
}