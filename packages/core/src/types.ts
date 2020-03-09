export type BlockchainType = "ethereum";
export type SeedType = "raw" | "ledger" | "mnemonic";
export type AccountType = "pk" | "seed-hd";
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
 * UUID-NUMBER id of an account, where UUID is id of the parent wallet, and NUMBER is account id inside the wallet
 */
export type AccountId = string;

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
    type: AccountType,
    keyId: Uuid
}

export type SeedPKRef = {
    type: AccountType,
    seedId: Uuid,
    hdPath: string
}

export type EthereumAccount = {
    id: AccountId,
    blockchain: number,
    address: string,
    key: PKRef | SeedPKRef | undefined
}

export type BitcoinAccount = {
    id: AccountId,
    blockchain: number,
    key: PKRef | SeedPKRef
}

export type WalletAccount = EthereumAccount | BitcoinAccount;

export type Wallet = {
    id: Uuid,
    name?: string | undefined,
    description?: string | undefined,
    accounts: WalletAccount[],
}

/**
 * BIP-44 Account Id for Seed (ex.: account is 1 on m/44'/0'/1'/0/0)
 */
export type HdPathAccount = {
    /**
     * Target Seed Id
     */
    seedId: Uuid,
    /**
     * account number
     */
    accountId: number
}

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

export function isEthereumAccount(acc: WalletAccount): acc is EthereumAccount {
    return acc.blockchain === 100 || acc.blockchain === 101
}

export function isBitcoinAccount(acc: WalletAccount): acc is BitcoinAccount {
    return false
}

export function isSeedPkRef(acc: WalletAccount, key: PKRef | SeedPKRef | undefined): key is SeedPKRef  {
    return typeof key === 'object'
        && isReference(key["seedId"])
        && typeof key["hdPath"] === "string"
}

// {UUID}-{INDEX}
let ACCOUNT_ID_REGEX = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})-([0-9]+)$/;

export function isAccountId(id: string): id is AccountId {
    return id.match(ACCOUNT_ID_REGEX) != null
}

export function extractWalletId(id: AccountId): Uuid {
    let m = id.match(ACCOUNT_ID_REGEX);
    if (typeof m !== 'object' || m === null) {
        throw new Error("Invalid id: " + id)
    }
    return m[1]
}

export function extractAccountInternalId(id: AccountId): number {
    let m = id.match(ACCOUNT_ID_REGEX);
    if (typeof m !== 'object' || m === null) {
        throw new Error("Invalid id: " + id)
    }
    return parseInt(m[2])
}

export type AddAccount = {
    blockchain: number,
    type: ImportPkType,
    key?: string | SeedAccount,
    password?: string
}

export type SeedAccount = {
    seedId: Uuid,
    hdPath: string,
    password?: string
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

export type MnemonicSeed = {
    value: string,
    password?: string
}

export type LedgerSeed = {

}

export type RawSeed = string;

export function isReference(seed: Uuid | SeedDefinition): seed is Uuid {
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

    addAccount(walletId: Uuid, account: AddAccount): AccountId;

    removeAccount(accountId: AccountId): boolean;

    signTx(accountId: AccountId, tx: UnsignedTx, password?: string): string;

    exportRawPk(accountId: AccountId, password: string): string;

    exportJsonPk(accountId: AccountId, password?: string): string;

    generateMnemonic(size: number): string;

    listAddressBook(blockchain: number): AddressBookItem[];

    addToAddressBook(item: AddressBookItem): boolean;

    removeFromAddressBook(blockchain: number, address: string): boolean;

    listSeeds(): SeedDescription[];

    getConnectedHWSeed(create: boolean): SeedDescription | undefined;

    importSeed(seed: SeedDefinition): Uuid;

    isSeedAvailable(seed: Uuid | SeedDefinition): boolean;

    listSeedAddresses(seed: Uuid | SeedDefinition, blockchain: BlockchainType, hdpath: string[]): { [key: string]: string };
}