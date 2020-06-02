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

export type AddressBookItem = {
    address: string,
    description?: string,
    name?: string,
    blockchain: number
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

export type EthereumEntry = {
    /**
     * String Id of the entry
     */
    id: EntryId,
    /**
     * Blockchain Id
     */
    blockchain: number,
    /**
     * Address of the entry.
     * It maybe undefined, for example if entry is created as HD Path on a Ledger which wasn't connected during creation
     */
    address: string | undefined,
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
    label?: string | undefined
}

export type BitcoinEntry = {
    id: EntryId,
    blockchain: number,
    key: PKRef | SeedPKRef,
    receiveDisabled?: boolean | undefined,
    label?: string | undefined
}

export type WalletEntry = EthereumEntry | BitcoinEntry;

export type Wallet = {
    id: Uuid,
    name?: string | undefined,
    description?: string | undefined,
    entries: WalletEntry[],
    reserved?: HDPathAccount[] | undefined
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
    return acc.blockchain === 100 || acc.blockchain === 101
}

export function isBitcoinEntry(acc: WalletEntry): acc is BitcoinEntry {
    return false
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

export type AddEntry = {
    blockchain: number,
    type: ImportPkType,
    key?: string | SeedEntry,
    password?: string
}

export type SeedEntry = {
    seedId: Uuid,
    hdPath: string,
    password?: string,
    // (optional) Expected Address on that path
    // Can used for verification or saved with the created entry, if actual address is impossible to get (ex. when
    // the seed is Ledger based, but Ledger is not connected)
    address?: string
}

export type SeedDescription = {
    id?: Uuid,
    type: SeedType,
    available: boolean
}

export type SeedDefinition = {
    type: SeedType,
    value: RawSeed | LedgerSeed | MnemonicSeed,
    // Password to _encrypt_ seed data on the disc, applied to raw or mnemonic seed only
    password?: string
}

export type SeedReference = {
    type: SeedRefType,
    value: LedgerSeed | MnemonicSeed | Uuid,
    // Password to _decrypt_ stored seed data, i.e. if it's Uuid pointing to a previously stored Mnemonic.
    // Note, it's not the Mnemonic password.
    password?: string
}

export type MnemonicSeed = {
    value: string,
    password?: string
}

export type LedgerSeed = {}

export type RawSeed = string;

export function isReference(seed: Uuid | SeedDefinition | SeedReference): seed is Uuid {
    return typeof seed === "string";
}

export function isRawSeed(value: RawSeed | LedgerSeed | MnemonicSeed, parent: SeedDefinition): value is RawSeed {
    return parent.type === "raw"
}

export function isMnemonic(value: RawSeed | LedgerSeed | MnemonicSeed, parent: SeedDefinition): value is MnemonicSeed {
    return parent.type === "mnemonic"
}

export function isLedger(value: RawSeed | LedgerSeed | MnemonicSeed, parent: SeedDefinition): value is LedgerSeed {
    return parent.type === "ledger"
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

    addToAddressBook(item: AddressBookItem): boolean;

    removeFromAddressBook(blockchain: number, address: string): boolean;

    listSeeds(): SeedDescription[];

    getConnectedHWSeed(create: boolean): SeedDescription | undefined;

    importSeed(seed: SeedDefinition): Uuid;

    isSeedAvailable(seed: Uuid | SeedReference | SeedDefinition): boolean;

    listSeedAddresses(seed: Uuid | SeedReference | SeedDefinition, blockchain: BlockchainType, hdpath: string[]): { [key: string]: string };
}