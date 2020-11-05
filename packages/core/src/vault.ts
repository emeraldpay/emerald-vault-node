import {
    AddEntry,
    AddressBookItem, AddressRole, BlockchainType,
    CreateAddressBookItem, CurrentAddress,
    EntryId, HWKeyDetails, LedgerSeedReference, SeedDefinition,
    SeedDescription, SeedReference,
    UnsignedTx,
    Uuid,
    Wallet,
    WalletCreateOptions
} from "./types";

export interface AccountIndex {
    walletId: Uuid,
    entryId: number;
    receive: number;
    change: number;
}

export interface WalletState {
    accountIndexes: AccountIndex[];
}

export interface IEmeraldVault {
    vaultVersion(): string;

    setState(state: WalletState): Promise<void>;

    listWallets(): Promise<Wallet[]>;

    getWallet(id: Uuid): Promise<Wallet | undefined>;

    addWallet(labelOrOptions?: string | WalletCreateOptions | undefined): Promise<Uuid>;

    setWalletLabel(walletId: Uuid, label: string): Promise<boolean>;

    removeWallet(walletId: Uuid): Promise<boolean>;

    listEntryAddresses(id: EntryId, role: AddressRole, start: number, limit: number): Promise<CurrentAddress[]>;

    addEntry(walletId: Uuid, entry: AddEntry): Promise<EntryId>;

    removeEntry(entryId: EntryId): Promise<boolean>;

    setEntryLabel(entryFullId: EntryId, label: string | null): Promise<boolean>;

    setEntryReceiveDisabled(entryFullId: EntryId, disabled: boolean): Promise<boolean>;

    signTx(entryId: EntryId, tx: UnsignedTx, password?: string): Promise<string>;

    exportRawPk(entryId: EntryId, password: string): Promise<string>;

    exportJsonPk(entryId: EntryId, password?: string): Promise<string>;

    generateMnemonic(size: number): Promise<string>;

    listAddressBook(blockchain: number): Promise<AddressBookItem[]>;

    addToAddressBook(item: CreateAddressBookItem): Promise<boolean>;

    removeFromAddressBook(blockchain: number, address: string): Promise<boolean>;

    listSeeds(): Promise<SeedDescription[]>;

    getConnectedHWDetails(): Promise<HWKeyDetails[]>;

    importSeed(seed: SeedDefinition | LedgerSeedReference): Promise<Uuid>;

    isSeedAvailable(seed: Uuid | SeedReference | SeedDefinition): Promise<boolean>;

    /**
     * Return addresses on the specified Seed.
     * For ethereum, HD Path must be standard 5-element path (m/44'/0'/0'/0/0).
     * For bitcoin, in addition to a full path, it support path to an (m/84'/0'/0'). In this case it returns XPub address of that account.
     *
     * @param seed existing seed, or reference to hardware key
     * @param blockchain blockchain id
     * @param hdpath list of hdpath to address or account
     */
    listSeedAddresses(seed: Uuid | SeedReference | SeedDefinition, blockchain: number, hdpath: string[]): Promise<{ [key: string]: string }>;
}
