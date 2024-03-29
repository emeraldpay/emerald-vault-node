import {
    AddEntry,
    AddressBookItem,
    AddressRole,
    CurrentAddress,
    EntryId,
    ExportedWeb3Json,
    HWKeyDetails,
    IconDetails,
    IdSeedReference,
    LedgerSeedReference,
    OddPasswordItem,
    SeedDefinition,
    SeedDescription,
    SeedDetails,
    SeedReference,
    SignedMessage,
    SignedTx,
    UnsignedMessage,
    UnsignedTx,
    Uuid,
    Wallet,
    WalletCreateOptions,
    WalletState, WatchEvent, WatchRequest,
} from "./types";

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

    /**
     * Sign transaction
     *
     * @param entryId Wallet Entry that initiates the transaction. It contains the Secret Key to sign it
     * @param tx unsigned transaction details
     * @param password global password
     */
    signTx(entryId: EntryId, tx: UnsignedTx, password?: string): Promise<SignedTx>;

    /**
     * Sign a message using the private key.
     *
     * @param entryId entry that holds the private key
     * @param msg a message to sign
     * @param password password if required by the entry
     */
    signMessage(entryId: EntryId, msg: UnsignedMessage, password?: string): Promise<SignedMessage>;

    /**
     * Extract the address of the message that produces the specified signature
     *
     * @param msg original message
     * @param signature signature
     * @returns address for the key which was used to sign the message
     */
    extractMessageSigner(msg: UnsignedMessage, signature: string): Promise<string>;

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
     * Update seed details, such as `label`
     *
     * @param seed reference to a seed
     * @param details the new details
     */
    updateSeed(seed: Uuid | IdSeedReference, details: Partial<SeedDetails>): Promise<boolean>;

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

    /**
     * Make a snapshot of the current Vault and copy its content to the specified file. The snapshot contains all critical
     * information stored in the Vault, including keys, seeds, and wallets. All sensitive details are encrypted, as in the Vault, and cannot
     * be used to make transactions without the password.
     * The file can be used to restore the Vault on a new machine or with a new installation.
     *
     * Expected extension: .emrldvault
     * @param targetFile path to a file to write Vault content
     */
    snapshotCreate(targetFile: string): Promise<boolean>;

    /**
     * Restore from an existing snapshot, if the provided password is valid (i.e., can decrypt values). It's a potentially destructive
     * operation because it replaces all values in the current vault with data from the snapshot.
     *
     * Returns `false` if password is invalid. Or error for other less expected errors, like IO Error, invalid data, etc.
     *
     * @param sourceFile path to a file with an existing snapshot to restore
     * @param password to decrypt Global Key used by Vault in snapshot
     * @return id for the following operations (Cancel or Complete)
     */
    snapshotRestore(sourceFile: string, password: string): Promise<boolean>;

    /**
     * List current icons for the vault items
     */
    iconsList(): Promise<IconDetails[]>;

    /**
     * Get the image for the specified entry. Returns null if image is not set.
     *
     * @param id if of the icon, which is the same as the entry id
     */
    getIcon(id: Uuid): Promise<ArrayBuffer | null>;

    /**
     * Set an image for the entry.
     *
     * The image must be a square size (32..1024px) PNG not larger than 1Mb.
     *
     * @param entryId if of a wallet or seed to assign the image
     * @param icon image data. Or `null` to remove an existing image
     */
    setIcon(entryId: Uuid, icon: ArrayBuffer | Uint8Array | null): Promise<boolean>;

    /**
     * Watch changes to currently available HW Keys.
     * The response (i.e., the promise fired) when the request became valid. Ex., when a particular blockchain
     * is requested then the promise is resolve only when a device is connected and the app is opened.
     *
     * @param request
     */
    watch(request: WatchRequest): Promise<WatchEvent>;
}
