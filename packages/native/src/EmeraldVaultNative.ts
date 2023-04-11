import {Config, Status, StatusCode,} from './types';
import {
    AddEntry,
    AddressBookItem,
    BlockchainType,
    isReference,
    SeedDefinition,
    SeedDescription,
    SeedDetails,
    UnsignedTx,
    SignedTx,
    Uuid,
    Wallet,
    WalletsOp,
    WalletCreateOptions,
    IEmeraldVault,
    EntryId,
    EntryIdOp,
    SeedReference,
    LedgerSeedReference,
    CreateAddressBookItem,
    WalletState,
    CurrentAddress,
    AddressRole,
    getBlockchainType,
    isEthereumTx,
    HWKeyDetails,
    OddPasswordItem,
    ExportedWeb3Json,
    IdSeedReference,
    isIdSeedReference,
    SignedMessage,
    UnsignedMessage, IconDetails, WatchRequest, WatchEvent
} from "@emeraldpay/emerald-vault-core";
import {neonFrameHandlerCall, neonFrameDirectCall} from "@emeraldpay/neon-frame";
import {atob} from "buffer";

const DEFAULT_CONFIG: Config & WalletState = {
    accountIndexes: []
}

export class EmeraldVaultNative implements IEmeraldVault {
    /**
     * Mapping to the Rust module through NAPI.
     *
     * **Internal. Do not use directly.**
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly addon: any;
    

    constructor(conf?: (Config & Partial<WalletState>) | undefined) {
        this.addon = require('../native/index.node');
        let confCopy =  conf || DEFAULT_CONFIG
        if (typeof confCopy.accountIndexes === "undefined") {
            confCopy.accountIndexes = DEFAULT_CONFIG.accountIndexes
        }
        this.addon.open(confCopy);
    }

    vaultVersion(): string {
        return "0.33.0-dev"
    }

    setState(state: WalletState): Promise<void> {
        return neonFrameHandlerCall(this.addon, "update", [state.accountIndexes]);
    }

    /**
     * Initialize vault, make migrations if necessary, and fix corrupted data if found
     * @see autoMigrate
     * @see autoFix
     */
    open() {
        this.autoMigrate();
        this.autoFix();
    }
    
    close() {
        this.addon.close();
    }

    /**
     * Checks the target directory for the content and if finds that it contains vault in the old format (v1 json files,
     * or v2 rocksdb), then it automatically converts to the new format (v3 protobuf).
     *
     * Supposed to be called right after constructor
     */
    protected autoMigrate() {
        this.addon.admin_migrate({});
    }

    /**
     * Verifies the current state of the vault, and if find corrupted data (stalled backups, duplicate files, etc)
     * then it tries to automatically fix it.
     *
     * Supposed to be called after constructor and auto migration
     */
    protected autoFix() {
        this.addon.admin_autofix({});
    }

    listWallets(): Promise<Wallet[]> {
        return neonFrameHandlerCall(this.addon, "wallets_list", [])
    }

    getWallet(id: Uuid): Promise<Wallet | undefined> {
        return this.listWallets()
            .then((wallets) => {
                    return WalletsOp.of(wallets).getWallet(id).value
                }
            )
    }

    addWallet(labelOrOptions?: string | WalletCreateOptions | undefined): Promise<Uuid> {
        let options: WalletCreateOptions = {};
        if (typeof labelOrOptions === 'string') {
            options = {name: labelOrOptions}
        } else if (typeof labelOrOptions === 'object') {
            options = labelOrOptions
        }
        return neonFrameHandlerCall(this.addon, "wallets_add", [JSON.stringify(options)])
    }

    setWalletLabel(walletId: Uuid, label: string): Promise<boolean> {
        return neonFrameHandlerCall(this.addon, "wallets_updateLabel", [walletId, label])
    }

    removeWallet(walletId: Uuid): Promise<boolean> {
        return neonFrameHandlerCall(this.addon, "wallets_remove", [walletId])
    }

    listEntryAddresses(id: EntryId, role: AddressRole, start: number, limit: number): Promise<CurrentAddress[]> {
        let fullId = EntryIdOp.of(id);
        return neonFrameHandlerCall(this.addon, "entries_listAddresses", [
            fullId.extractWalletId(), fullId.extractEntryInternalId(),
            role, start, limit])
    }

    addEntry(walletId: Uuid, entry: AddEntry): Promise<EntryId> {
        return neonFrameHandlerCall(this.addon, "wallets_addEntry", [walletId, JSON.stringify(entry)])
            .then((id: number) => EntryIdOp.create(walletId, id).value)
    }

    removeEntry(entryFullId: EntryId): Promise<boolean> {
        let op = EntryIdOp.of(entryFullId);
        return neonFrameHandlerCall(this.addon, "wallets_removeEntry", [op.extractWalletId(), op.extractEntryInternalId()])
    }

    setEntryLabel(entryFullId: EntryId, label: string | null): Promise<boolean> {
        let op = EntryIdOp.of(entryFullId);
        return neonFrameHandlerCall(this.addon, "entries_updateLabel", [op.extractWalletId(), op.extractEntryInternalId(), label])
    }

    setEntryReceiveDisabled(entryFullId: EntryId, disabled: boolean): Promise<boolean> {
        let op = EntryIdOp.of(entryFullId);
        return neonFrameHandlerCall(this.addon, "entries_updateReceiveDisabled", [op.extractWalletId(), op.extractEntryInternalId(), disabled])
    }

    signTx(entryId: EntryId, tx: UnsignedTx, password?: string): Promise<SignedTx> {
        let op = EntryIdOp.of(entryId);
        return neonFrameHandlerCall(this.addon, "sign_tx", [op.extractWalletId(), op.extractEntryInternalId(), JSON.stringify(tx), password]);
    }

    signMessage(entryId: string, msg: UnsignedMessage, password?: string): Promise<SignedMessage> {
        let op = EntryIdOp.of(entryId);
        return neonFrameHandlerCall(this.addon, "sign_message", [op.extractWalletId(), op.extractEntryInternalId(), JSON.stringify(msg), password]);
    }

    extractMessageSigner(msg: UnsignedMessage, signature: string): Promise<string> {
        return neonFrameHandlerCall(this.addon, "sign_signature_author", [JSON.stringify(msg), signature]);
    }

    exportRawPk(entryId: EntryId, password: string): Promise<string> {
        let op = EntryIdOp.of(entryId);
        return neonFrameHandlerCall(this.addon, "entries_exportPk", [op.extractWalletId(), op.extractEntryInternalId(), password]);
    }

    exportJsonPk(entryId: EntryId, password: string): Promise<ExportedWeb3Json> {
        let op = EntryIdOp.of(entryId);
        return neonFrameHandlerCall(this.addon, "entries_export", [op.extractWalletId(), op.extractEntryInternalId(), password])
            .then((statusPlain: string) => JSON.parse(statusPlain));
    }

    /**
     * @deprecated
     * @param blockchain
     */
    listAddressBook(blockchain: number): Promise<AddressBookItem[]> {
        return new Promise((resolve, reject) => {
            try {
                resolve(
                    neonFrameDirectCall(this.addon, "addrbook_list", [])
                );
            } catch (e) {
                reject(e)
            }
        });
    }

    /**
     * for test only
     *
     * @deprecated
     * @param item
     */
    addToAddressBook(item: CreateAddressBookItem): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                resolve(
                    neonFrameDirectCall(this.addon, "addrbook_add", [])
                );
            } catch (e) {
                reject(e)
            }
        });
    }

    /**
     * @deprecated
     * @param blockchain
     * @param address
     */
    removeFromAddressBook(blockchain: number, address: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                resolve(
                    neonFrameDirectCall(this.addon, "addrbook_remove", [])
                );
            } catch (e) {
                reject(e)
            }
        });
    }

    generateMnemonic(size: number): Promise<string> {
        return neonFrameHandlerCall(this.addon, "seed_generateMnemonic", [size]);
    }

    listSeeds(): Promise<SeedDescription[]> {
        return neonFrameHandlerCall(this.addon, "seed_list", []);
    }

    getConnectedHWDetails(): Promise<HWKeyDetails[]> {
        return neonFrameHandlerCall(this.addon, "seed_hwkey_list", [])
    }

    importSeed(seed: SeedDefinition | LedgerSeedReference): Promise<Uuid> {
        return neonFrameHandlerCall(this.addon, "seed_add", [JSON.stringify(seed)]);
    }

    isSeedAvailable(seed: Uuid | SeedReference | SeedDefinition): Promise<boolean> {
        let ref = seed;
        if (isReference(seed)) {
            ref = {
                type: "id",
                value: seed
            }
        }
        return neonFrameHandlerCall(this.addon, "seed_isAvailable", [JSON.stringify(ref)])
    }

    listSeedAddresses(seed: Uuid | SeedReference | SeedDefinition, blockchain: number, hdpath: string[]): Promise<{ [key: string]: string }> {
        let ref = seed;
        if (isReference(seed)) {
            ref = {
                type: "id",
                value: seed
            }
        }
        return neonFrameHandlerCall(this.addon, "seed_listAddresses", [JSON.stringify(ref), blockchain, hdpath])
    }

    updateSeed(seed: Uuid | IdSeedReference, details: Partial<SeedDetails>): Promise<boolean> {
        let seed_id = seed;
        if (isIdSeedReference(seed)) {
            seed_id = seed.value;
        }
        return neonFrameHandlerCall(this.addon, "seed_update", [seed_id, JSON.stringify(details)])
    }

    createGlobalKey(password: String): Promise<boolean> {
        return neonFrameHandlerCall(this.addon, "global_create", [password])
    }

    verifyGlobalKey(password: string): Promise<boolean> {
        return neonFrameHandlerCall(this.addon, "global_verify", [password])
    }

    changeGlobalKey(existingPassword: string, newPassword: string): Promise<boolean> {
        return neonFrameHandlerCall(this.addon, "global_change", [existingPassword, newPassword])
    }

    isGlobalKeySet(): Promise<boolean> {
        return neonFrameHandlerCall(this.addon, "global_isSet", [])
    }

    getOddPasswordItems(): Promise<OddPasswordItem[]> {
        return neonFrameHandlerCall(this.addon, "admin_listOdd", [])
    }

    tryUpgradeOddItems(odd_password: string, global_password: string): Promise<Uuid[]> {
        return neonFrameHandlerCall(this.addon, "admin_upgradeOdd", [odd_password, global_password])
    }

    snapshotCreate(targetFile: string): Promise<boolean> {
        return neonFrameHandlerCall(this.addon, "snapshot_create", [targetFile])
    }

    snapshotRestore(sourceFile: string, password: string): Promise<boolean> {
        return neonFrameHandlerCall(this.addon, "snapshot_restore", [sourceFile, password])
    }

    iconsList(): Promise<IconDetails[]> {
        return neonFrameHandlerCall(this.addon, "icons_list", [])
    }

    getIcon(id: Uuid): Promise<ArrayBuffer | null> {
        return neonFrameHandlerCall(this.addon, "icons_get", [id])
            .then((encoded: string | null) => {
                // returned as Base64 not actual bytes because the Neon Frame uses JSON to encode values
                if (encoded != null && encoded.length > 0) {
                    return Uint8Array.from(atob(encoded), c => c.charCodeAt(0)).buffer
                } else {
                    return null
                }
            })
    }

    setIcon(entryId: Uuid, icon: ArrayBuffer | Uint8Array | null): Promise<boolean> {
        return neonFrameHandlerCall(this.addon, "icons_set", [entryId, icon])
    }

    watch(request: WatchRequest): Promise<WatchEvent> {
        return neonFrameHandlerCall(this.addon, "watch", [JSON.stringify(request)])
    }
}