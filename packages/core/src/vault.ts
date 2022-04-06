import {
    AddEntry,
    AddressBookItem, AddressRole, BlockchainType,
    CreateAddressBookItem, CurrentAddress,
    EntryId, ExportedWeb3Json, HWKeyDetails, LedgerSeedReference, OddPasswordItem, SeedDefinition,
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

    /**
     * Export Ethereum password in Web3 format (a JSON file). The exported JSON would have private key encrypted with a temporal
     * password provided with the export in a separate field
     *
     * @param entryId entry id with key
     * @param password current password for the Private Key (global or individual)
     */
    exportJsonPk(entryId: EntryId, password: string): Promise<ExportedWeb3Json>;

    generateMnemonic(size: number): Promise<string>;

    listAddressBook(blockchain: number): Promise<AddressBookItem[]>;

    addToAddressBook(item: CreateAddressBookItem): Promise<boolean>;

    removeFromAddressBook(blockchain: number, address: string): Promise<boolean>;

    listSeeds(): Promise<SeedDescription[]>;

    getConnectedHWDetails(): Promise<HWKeyDetails[]>;

    importSeed(seed: SeedDefinition | LedgerSeedReference): Promise<Uuid>;

    /**
     * Check if the seed is available for use. In general, it's application only to Hardware Keys and the methods
     * checks if the device is connected. For a standard stored Seed it always returns `true`
     * @param seed reference to a seed to check availability
     */
    isSeedAvailable(seed: Uuid | SeedReference | SeedDefinition): Promise<boolean>;

    /**
     * Return addresses on the specified Seed.
     * For ethereum, HD Path must be standard 5-element path (m/44'/0'/0'/0/0).
     * For bitcoin, in addition to a full path, it supports path to an account (m/84'/0'/0'). In this case it returns XPub address of that account.
     *
     * @param seed existing seed, or reference to hardware key
     * @param blockchain blockchain id
     * @param hdpath list of hdpath to address or account
     */
    listSeedAddresses(seed: Uuid | SeedReference | SeedDefinition, blockchain: number, hdpath: string[]): Promise<{ [key: string]: string }>;

    /**
     * Create a Global Key that will used to encrypt all Secrets in the Vault. Can be created only once.
     * @param password
     */
    createGlobalKey(password: string): Promise<boolean>;

    /**
     * Checks the provided password if it fits the global key, i.e. user can decrypt/encrypt the Vault with it
     * @param password
     */
    verifyGlobalKey(password: string): Promise<boolean>;

    /**
     * Change the password for global key
     * @param existingPassword
     * @param newPassword
     */
    changeGlobalKey(existingPassword: string, newPassword: string): Promise<boolean>;

    /**
     * Check if a Global Key is currently set
     */
    isGlobalKeySet(): Promise<boolean>;

    /**
     * Get list of Vault items that use an individual password for encryption, instead of a Global Key. It's legacy versions
     * of data stored in the Vault, when used was able to import keys as is with own encryption.
     */
    getOddPasswordItems(): Promise<OddPasswordItem[]>;

    /**
     * Tries to upgrade odd items, i.e., re-encrypt them with Global Key. Fails if global key is not set.
     *
     * It tries to apply the provided `odd_password` to all items in the vault which are still using old schema of encryption.
     * If the password can decrypt the item, then it get re-encrypted with Global Key.
     *
     * @param odd_password password for one
     * @param global_password password for Global Key
     * @return ids of successfully upgraded items
     */
    tryUpgradeOddItems(odd_password: string, global_password: string): Promise<Uuid[]>;
}
