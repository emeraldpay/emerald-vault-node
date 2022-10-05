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
    isIdSeedReference
} from "@emeraldpay/emerald-vault-core";
import {neonFrameHandlerCall, neonFrameDirectCall} from "@emeraldpay/neon-frame";

var addon = require('../native/index.node');

const DEFAULT_CONFIG: Config & WalletState = {
    accountIndexes: []
}

export class EmeraldVaultNative implements IEmeraldVault {
    private conf: Config & Partial<WalletState>;

    constructor(conf?: (Config & Partial<WalletState>) | undefined) {
        this.conf = conf || DEFAULT_CONFIG;
        if (typeof this.conf.accountIndexes === "undefined") {
            this.conf.accountIndexes = DEFAULT_CONFIG.accountIndexes
        }
    }

    vaultVersion(): string {
        return "0.27.0"
    }

    setState(state: WalletState): Promise<void> {
        this.conf.accountIndexes = state.accountIndexes || DEFAULT_CONFIG.accountIndexes;
        return Promise.resolve()
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

    /**
     * Checks the target directory for the content and if finds that it contains vault in the old format (v1 json files,
     * or v2 rocksdb), then it automatically converts to the new format (v3 protobuf).
     *
     * Supposed to be called right after constructor
     */
    protected autoMigrate() {
        let opts = Object.assign({}, this.conf);
        addon.admin_migrate(opts);
    }

    /**
     * Verifies the current state of the vault, and if find corrupted data (stalled backups, duplicate files, etc)
     * then it tries to automatically fix it.
     *
     * Supposed to be called after constructor and auto migration
     */
    protected autoFix() {
        let opts = Object.assign({}, this.conf);
        addon.admin_autofix(opts);
    }

    listWallets(): Promise<Wallet[]> {
        return neonFrameHandlerCall(addon, "wallets_list", [this.conf])
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
        return neonFrameHandlerCall(addon, "wallets_add", [this.conf, JSON.stringify(options)])
    }

    setWalletLabel(walletId: Uuid, label: string): Promise<boolean> {
        return neonFrameHandlerCall(addon, "wallets_updateLabel", [this.conf, walletId, label])
    }

    removeWallet(walletId: Uuid): Promise<boolean> {
        return neonFrameHandlerCall(addon, "wallets_remove", [this.conf, walletId])
    }

    listEntryAddresses(id: EntryId, role: AddressRole, start: number, limit: number): Promise<CurrentAddress[]> {
        let fullId = EntryIdOp.of(id);
        return neonFrameHandlerCall(addon, "entries_listAddresses", [this.conf,
            fullId.extractWalletId(), fullId.extractEntryInternalId(),
            role, start, limit])
    }

    addEntry(walletId: Uuid, entry: AddEntry): Promise<EntryId> {
        return neonFrameHandlerCall(addon, "wallets_addEntry", [this.conf, walletId, JSON.stringify(entry)])
            .then((id: number) => EntryIdOp.create(walletId, id).value)
    }

    removeEntry(entryFullId: EntryId): Promise<boolean> {
        let op = EntryIdOp.of(entryFullId);
        return neonFrameHandlerCall(addon, "wallets_removeEntry", [this.conf, op.extractWalletId(), op.extractEntryInternalId()])
    }

    setEntryLabel(entryFullId: EntryId, label: string | null): Promise<boolean> {
        let op = EntryIdOp.of(entryFullId);
        return neonFrameHandlerCall(addon, "entries_updateLabel", [this.conf, op.extractWalletId(), op.extractEntryInternalId(), label])
    }

    setEntryReceiveDisabled(entryFullId: EntryId, disabled: boolean): Promise<boolean> {
        let op = EntryIdOp.of(entryFullId);
        return neonFrameHandlerCall(addon, "entries_updateReceiveDisabled", [this.conf, op.extractWalletId(), op.extractEntryInternalId(), disabled])
    }

    signTx(entryId: EntryId, tx: UnsignedTx, password?: string): Promise<SignedTx> {
        let op = EntryIdOp.of(entryId);
        return neonFrameHandlerCall(addon, "sign_tx", [this.conf, op.extractWalletId(), op.extractEntryInternalId(), JSON.stringify(tx), password]);
    }

    exportRawPk(entryId: EntryId, password: string): Promise<string> {
        let op = EntryIdOp.of(entryId);
        return neonFrameHandlerCall(addon, "entries_exportPk", [this.conf, op.extractWalletId(), op.extractEntryInternalId(), password]);
    }

    exportJsonPk(entryId: EntryId, password: string): Promise<ExportedWeb3Json> {
        let op = EntryIdOp.of(entryId);
        return neonFrameHandlerCall(addon, "entries_export", [this.conf, op.extractWalletId(), op.extractEntryInternalId(), password])
            .then((statusPlain: string) => JSON.parse(statusPlain));
    }

    /**
     * @deprecated
     * @param blockchain
     */
    listAddressBook(blockchain: number): Promise<AddressBookItem[]> {
        return new Promise((resolve, reject) => {
            let opts = Object.assign({}, this.conf);
            try {
                resolve(
                    neonFrameDirectCall(addon, "addrbook_list", [opts])
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
            let opts = Object.assign({}, this.conf);
            try {
                resolve(
                    neonFrameDirectCall(addon, "addrbook_add", [opts])
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
            let opts = Object.assign({}, this.conf);
            try {
                resolve(
                    neonFrameDirectCall(addon, "addrbook_remove", [opts])
                );
            } catch (e) {
                reject(e)
            }
        });
    }

    generateMnemonic(size: number): Promise<string> {
        return neonFrameHandlerCall(addon, "seed_generateMnemonic", [size]);
    }

    listSeeds(): Promise<SeedDescription[]> {
        return neonFrameHandlerCall(addon, "seed_list", [this.conf]);
    }

    getConnectedHWDetails(): Promise<HWKeyDetails[]> {
        return neonFrameHandlerCall(addon, "seed_hwkey_list", [this.conf])
    }

    importSeed(seed: SeedDefinition | LedgerSeedReference): Promise<Uuid> {
        return neonFrameHandlerCall(addon, "seed_add", [this.conf, JSON.stringify(seed)]);
    }

    isSeedAvailable(seed: Uuid | SeedReference | SeedDefinition): Promise<boolean> {
        let ref = seed;
        if (isReference(seed)) {
            ref = {
                type: "id",
                value: seed
            }
        }
        return neonFrameHandlerCall(addon, "seed_isAvailable", [this.conf, JSON.stringify(ref)])
    }

    listSeedAddresses(seed: Uuid | SeedReference | SeedDefinition, blockchain: number, hdpath: string[]): Promise<{ [key: string]: string }> {
        let ref = seed;
        if (isReference(seed)) {
            ref = {
                type: "id",
                value: seed
            }
        }
        return neonFrameHandlerCall(addon, "seed_listAddresses", [this.conf, JSON.stringify(ref), blockchain, hdpath])
    }

    updateSeed(seed: Uuid | IdSeedReference, details: Partial<SeedDetails>): Promise<boolean> {
        let seed_id = seed;
        if (isIdSeedReference(seed)) {
            seed_id = seed.value;
        }
        return neonFrameHandlerCall(addon, "seed_update", [this.conf, seed_id, JSON.stringify(details)])
    }

    createGlobalKey(password: String): Promise<boolean> {
        return neonFrameHandlerCall(addon, "global_create", [this.conf, password])
    }

    verifyGlobalKey(password: string): Promise<boolean> {
        return neonFrameHandlerCall(addon, "global_verify", [this.conf, password])
    }

    changeGlobalKey(existingPassword: string, newPassword: string): Promise<boolean> {
        return neonFrameHandlerCall(addon, "global_change", [this.conf, existingPassword, newPassword])
    }

    isGlobalKeySet(): Promise<boolean> {
        return neonFrameHandlerCall(addon, "global_isSet", [this.conf])
    }

    getOddPasswordItems(): Promise<OddPasswordItem[]> {
        return neonFrameHandlerCall(addon, "admin_listOdd", [this.conf])
    }

    tryUpgradeOddItems(odd_password: string, global_password: string): Promise<Uuid[]> {
        return neonFrameHandlerCall(addon, "admin_upgradeOdd", [this.conf, odd_password, global_password])
    }

    snapshotCreate(targetFile: string): Promise<boolean> {
        return neonFrameHandlerCall(addon, "snapshot_create", [this.conf, targetFile])
    }

    snapshotRestore(sourceFile: string, password: string): Promise<boolean> {
        return neonFrameHandlerCall(addon, "snapshot_restore", [this.conf, sourceFile, password])
    }
}