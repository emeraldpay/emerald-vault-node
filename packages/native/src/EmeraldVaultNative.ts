import {Config, Status, StatusCode,} from './types';
import {
    AddEntry,
    AddressBookItem,
    BlockchainType,
    isReference,
    SeedDefinition,
    SeedDescription,
    UnsignedTx,
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
import {SeedDetails} from "@emeraldpay/emerald-vault-core/lib/types";

var addon = require('../native/index.node');

function statusFail<T>(code: StatusCode = StatusCode.UNKNOWN, message: string = ""): Status<T> {
    return {
        succeeded: false,
        result: undefined,
        error: {
            code, message
        }
    }
}

function statusOk<T>(result: T): Status<T> {
    return {
        succeeded: true,
        result,
        error: undefined
    }
}

const DEFAULT_CONFIG: Config & WalletState = {
    accountIndexes: []
}

function resolveStatus(status: Status<any>, err: Error | undefined, resolve, reject) {
    if (!status.succeeded) {
        return reject(new Error(status.error.message));
    }
    if (err) {
        return reject(err);
    }
    resolve(status.result);
}

// Neon Callback for Status<T>
type NeonCallback<T> = (status: string) => void;

function neonToPromise<T>(resolve, reject): NeonCallback<T> {
    return (status) => resolveStatus(JSON.parse(status), undefined, resolve, reject)
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
        return new Promise((resolve, reject) => {
            let status: Status<Wallet[]> = JSON.parse(addon.wallets_list(this.conf));
            if (!status.succeeded) {
                return reject(new Error(status.error.message))
            }
            resolve(status.result);
        });
    }

    getWallet(id: Uuid): Promise<Wallet | undefined> {
        return new Promise((resolve, reject) => {
            let status: Status<Wallet[]> = JSON.parse(addon.wallets_list(this.conf));
            if (!status.succeeded) {
                return reject(new Error(status.error.message))
            }
            resolve(WalletsOp.of(status.result).getWallet(id).value)
        });
    }

    addWallet(labelOrOptions?: string | WalletCreateOptions | undefined): Promise<Uuid> {
        return new Promise((resolve, reject) => {
            let options: WalletCreateOptions = {};
            if (typeof labelOrOptions === 'string') {
                options = {name: labelOrOptions}
            } else if (typeof labelOrOptions === 'object') {
                options = labelOrOptions
            }
            let status: Status<Uuid> = JSON.parse(addon.wallets_add(this.conf, JSON.stringify(options)));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    setWalletLabel(walletId: Uuid, label: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let status: Status<boolean> = JSON.parse(addon.wallets_updateLabel(this.conf, walletId, label));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    removeWallet(walletId: Uuid): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let status: Status<boolean> = JSON.parse(addon.wallets_remove(this.conf, walletId));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    listEntryAddresses(id: EntryId, role: AddressRole, start: number, limit: number): Promise<CurrentAddress[]> {
        return new Promise((resolve, reject) => {
            let fullId = EntryIdOp.of(id);
            let status: Status<CurrentAddress[]> = JSON.parse(addon.entries_listAddresses(this.conf,
                fullId.extractWalletId(), fullId.extractEntryInternalId(),
                role, start, limit
            ));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    addEntry(walletId: Uuid, entry: AddEntry): Promise<EntryId> {
        return new Promise((resolve, reject) => {
            let status: Status<number> = JSON.parse(addon.wallets_addEntry(this.conf, walletId, JSON.stringify(entry)));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(EntryIdOp.create(walletId, status.result).value)
        });
    }

    removeEntry(entryFullId: EntryId): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryFullId);
            let status: Status<boolean> = JSON.parse(addon.wallets_removeEntry(this.conf, op.extractWalletId(), op.extractEntryInternalId()));
            if (!status.succeeded) {
                return reject(new Error(status.error.message))
            }
            resolve(status.result);
        });
    }

    setEntryLabel(entryFullId: EntryId, label: string | null): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryFullId);
            let status: Status<boolean> = JSON.parse(addon.entries_updateLabel(this.conf,
                op.extractWalletId(), op.extractEntryInternalId(),
                label
            ));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    setEntryReceiveDisabled(entryFullId: EntryId, disabled: boolean): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryFullId);
            let status: Status<boolean> = JSON.parse(addon.entries_updateReceiveDisabled(this.conf,
                op.extractWalletId(), op.extractEntryInternalId(),
                disabled
            ));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result)
        });
    }

    signTx(entryId: EntryId, tx: UnsignedTx, password?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryId);
            let status: Status<string> = JSON.parse(addon.sign_tx(this.conf, op.extractWalletId(), op.extractEntryInternalId(), JSON.stringify(tx), password));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            if (isEthereumTx(tx)) {
                resolve("0x" + status.result);
            } else {
                resolve(status.result);
            }
        });
    }

    exportRawPk(entryId: EntryId, password: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryId);
            let status: Status<string> = JSON.parse(addon.entries_exportPk(this.conf, op.extractWalletId(), op.extractEntryInternalId(), password));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    exportJsonPk(entryId: EntryId, password: string): Promise<ExportedWeb3Json> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryId);
            let status: Status<ExportedWeb3Json>;
            try {
                let statusPlain: Status<string> = JSON.parse(addon.entries_export(this.conf, op.extractWalletId(), op.extractEntryInternalId(), password));
                status = {
                    error: statusPlain.error,
                    succeeded: statusPlain.succeeded,
                    result: JSON.parse(statusPlain.result)
                }
            } catch (e) {
                return reject(e);
            }
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    generateMnemonic(size: number): Promise<string> {
        return new Promise((resolve, reject) => {
            let status: Status<string> = JSON.parse(addon.seed_generateMnemonic(size));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    listAddressBook(blockchain: number): Promise<AddressBookItem[]> {
        return new Promise((resolve, reject) => {
            let opts = Object.assign({}, this.conf);
            let status: Status<AddressBookItem[]> = JSON.parse(addon.addrbook_list(opts));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(
                status.result
                    .filter((item) => item.blockchain == blockchain)
            );
        });
    }

    addToAddressBook(item: CreateAddressBookItem): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let opts = Object.assign({}, this.conf);
            let status: Status<boolean> = JSON.parse(addon.addrbook_add(opts, JSON.stringify(item)));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    removeFromAddressBook(blockchain: number, address: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let opts = Object.assign({}, this.conf);
            let status: Status<boolean> = JSON.parse(addon.addrbook_remove(opts, address));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    listSeeds(): Promise<SeedDescription[]> {
        return new Promise((resolve, reject) => {
            let status: Status<SeedDescription[]> = JSON.parse(addon.seed_list(this.conf));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    getConnectedHWDetails(): Promise<HWKeyDetails[]> {
        return new Promise((resolve, reject) => {
            addon.seed_hwkey_list(this.conf, neonToPromise(resolve, reject));
        });
    }

    importSeed(seed: SeedDefinition | LedgerSeedReference): Promise<Uuid> {
        return new Promise((resolve, reject) => {
            let status: Status<Uuid> = JSON.parse(addon.seed_add(this.conf, JSON.stringify(seed)));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    isSeedAvailable(seed: Uuid | SeedReference | SeedDefinition): Promise<boolean> {
        let ref = seed;
        if (isReference(seed)) {
            ref = {
                type: "id",
                value: seed
            }
        }
        return new Promise((resolve, reject) => {
            addon.seed_isAvailable(this.conf, JSON.stringify(ref), neonToPromise(resolve, reject));
        });
    }

    listSeedAddresses(seed: Uuid | SeedReference | SeedDefinition, blockchain: number, hdpath: string[]): Promise<{ [key: string]: string }> {
        let ref = seed;
        if (isReference(seed)) {
            ref = {
                type: "id",
                value: seed
            }
        }

        return new Promise((resolve, reject) => {
            addon.seed_listAddresses(this.conf, JSON.stringify(ref), blockchain, hdpath, neonToPromise(resolve, reject));
        });
    }

    updateSeed(seed: Uuid | IdSeedReference, details: Partial<SeedDetails>): Promise<boolean> {
        let seed_id = seed;
        if (isIdSeedReference(seed)) {
            seed_id = seed.value;
        }

        return new Promise((resolve, reject) => {
            addon.seed_update(this.conf, seed_id, JSON.stringify(details), neonToPromise(resolve, reject));
        });
    }

    createGlobalKey(password: String): Promise<boolean> {
        return new Promise((resolve, reject) => {
            addon.global_create(this.conf, password, neonToPromise(resolve, reject));
        });
    }

    verifyGlobalKey(password: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            addon.global_verify(this.conf, password, neonToPromise(resolve, reject));
        });
    }

    changeGlobalKey(existingPassword: string, newPassword: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            addon.global_change(this.conf, existingPassword, newPassword, neonToPromise(resolve, reject));
        });
    }

    isGlobalKeySet(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            addon.global_isSet(this.conf, neonToPromise(resolve, reject));
        });
    }

    getOddPasswordItems(): Promise<OddPasswordItem[]> {
        return new Promise((resolve, reject) => {
            addon.admin_listOdd(this.conf, neonToPromise(resolve, reject));
        });
    }

    tryUpgradeOddItems(odd_password: string, global_password: string): Promise<Uuid[]> {
        return new Promise((resolve, reject) => {
            addon.admin_upgradeOdd(this.conf, odd_password, global_password, neonToPromise(resolve, reject));
        });
    }

    snapshotCreate(targetFile: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            addon.snapshot_create(this.conf, targetFile, neonToPromise(resolve, reject));
        });
    }

    snapshotRestore(sourceFile: string, password: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            addon.snapshot_restore(this.conf, sourceFile, password, neonToPromise(resolve, reject));
        });
    }
}