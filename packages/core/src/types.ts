export type BlockchainType = "ethereum";
export type SeedType = "raw" | "ledger" | "mnemonic";
export type SeedRefType = "ledger" | "mnemonic" | "id";
export type EntryType = "pk" | "seed-hd";
export type ImportPkType = "ethereum-json" | "raw-pk-hex" | "hd-path" | "generate-random";

export enum BlockchainId {
    ETHEREUM = 100,
    ETHEREUM_CLASSIC = 101,
    KOVAN_TESTNET = 10002
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

export type UnsignedTx = {
    from: string,
    to?: string | null,
    gas: string,
    gasPrice: string,
    value: string,
    data?: string | null,
    nonce: string,
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
    address: AddressXPub
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
    return typeof acc === 'object' && typeof acc.blockchain === 'number' &&
        acc.blockchain === 100 || acc.blockchain === 101;
}

export function isBitcoinEntry(acc: WalletEntry): acc is BitcoinEntry {
    return typeof acc === 'object' && typeof acc.blockchain === 'number' &&
        acc.blockchain == 1 || acc.blockchain == 10003;
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

export interface IEmeraldVault {
    vaultVersion(): string;

    listWallets(): Wallet[];

    getWallet(id: Uuid): Wallet | undefined;

    addWallet(label: string | undefined): Uuid;

    setWalletLabel(walletId: Uuid, label: string): boolean;

    removeWallet(walletId: Uuid): void;

    addEntry(walletId: Uuid, entry: AddEntry): EntryId;

    removeEntry(entryId: EntryId): boolean;

    setEntryLabel(entryFullId: EntryId, label: string | null): boolean;

    setEntryReceiveDisabled(entryFullId: EntryId, disabled: boolean): boolean;

    signTx(entryId: EntryId, tx: UnsignedTx, password?: string): string;

    exportRawPk(entryId: EntryId, password: string): string;

    exportJsonPk(entryId: EntryId, password?: string): string;

    generateMnemonic(size: number): string;

    listAddressBook(blockchain: number): AddressBookItem[];

    addToAddressBook(item: CreateAddressBookItem): boolean;

    removeFromAddressBook(blockchain: number, address: string): boolean;

    listSeeds(): SeedDescription[];

    getConnectedHWSeed(create: boolean): SeedDescription | undefined;

    importSeed(seed: SeedDefinition | LedgerSeedReference): Uuid;

    isSeedAvailable(seed: Uuid | SeedReference | SeedDefinition): boolean;

    listSeedAddresses(seed: Uuid | SeedReference | SeedDefinition, blockchain: BlockchainType, hdpath: string[]): { [key: string]: string };
}