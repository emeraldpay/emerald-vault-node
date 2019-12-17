export type BlockchainType = "ethereum";
export type SeedType = "raw" | "ledger" | "mnemonic";
export type AccountType = "pk" | "seed-hd";
export type ImportPkType = "ethereum-json" | "raw-pk-hex" | "hd-path";

/**
 * UUID string, identifier of a Wallet/Seed/etc
 */
export type Uuid = string;

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
    name?: string
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
    id: number,
    blockchain: number,
    address: string,
    key: PKRef | SeedPKRef | undefined
}

export type BitcoinAccount = {
    id: number,
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

export function isEthereumAccount(acc: WalletAccount): acc is EthereumAccount {
    return acc.blockchain === 100 || acc.blockchain === 101
}

export function isBitcoinAccount(acc: WalletAccount): acc is BitcoinAccount {
    return false
}

export type AddAccount = {
    blockchain: number,
    type: ImportPkType,
    key: string | SeedAccount,
    password?: string
}

export type SeedAccount = {
    seedId: Uuid,
    hdPath: string,
    password: string
}

export type SeedDescription = {
    id: Uuid,
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

    addAccount(walletId: Uuid, account: AddAccount): number;

    removeAccount(walletId: Uuid, accountId: number): boolean;

    signTx(walletId: Uuid, accountId: number, tx: UnsignedTx, password?: string): string;

    exportRawPk(walletId: Uuid, accountId: number, password: string): string;

    exportJsonPk(walletId: Uuid, accountId: number, password?: string): string;

    generateMnemonic(size: number): string;

    listAddressBook(chain: string): AddressBookItem[];

    addToAddressBook(chain: string, item: AddressBookItem): boolean;

    removeFromAddressBook(chain: string, address: string): boolean;

    listSeeds(): SeedDescription[];

    importSeed(seed: SeedDefinition): Uuid;

    isSeedAvailable(seed: Uuid | SeedDefinition): boolean;

    listSeedAddresses(seed: Uuid | SeedDefinition, blockchain: BlockchainType, hdpath: string[]): { [key: string]: string };
}