import {
    AddEntry,
    AddressBookItem, AddressRole, BlockchainType,
    CreateAddressBookItem, CurrentAddress,
    EntryId, LedgerSeedReference, SeedDefinition,
    SeedDescription, SeedReference,
    UnsignedTx,
    Uuid,
    Wallet,
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

    setState(state: WalletState): void;

    listWallets(): Wallet[];

    getWallet(id: Uuid): Wallet | undefined;

    addWallet(label: string | undefined): Uuid;

    setWalletLabel(walletId: Uuid, label: string): boolean;

    removeWallet(walletId: Uuid): void;

    getEntryAddresses(id: EntryId, role: AddressRole, start: number, limit: number): CurrentAddress[];

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
