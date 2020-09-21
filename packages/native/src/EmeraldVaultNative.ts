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
    EntryId, EntryIdOp,
    SeedReference,
    LedgerSeedReference,
    CreateAddressBookItem,
    WalletState,
    CurrentAddress,
    AddressRole
} from "@emeraldpay/emerald-vault-core";

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
            let status: Status<Wallet[]> = addon.wallets_list(this.conf);
            if (!status.succeeded) {
                return reject(new Error(status.error.message))
            }
            resolve(status.result);
        });
    }

    getWallet(id: Uuid): Promise<Wallet | undefined> {
        return new Promise((resolve, reject) => {
            let status: Status<Wallet[]> = addon.wallets_list(this.conf);
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
            let status: Status<Uuid> = addon.wallets_add(this.conf, JSON.stringify(options));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    setWalletLabel(walletId: Uuid, label: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let status: Status<boolean> = addon.wallets_updateLabel(this.conf, walletId, label);
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    removeWallet(walletId: Uuid): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let status: Status<boolean> = addon.wallets_remove(this.conf, walletId);
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    getEntryAddresses(id: EntryId, role: AddressRole, start: number, limit: number): Promise<CurrentAddress[]> {
        //TODO
        return Promise.resolve([]);
    }

    addEntry(walletId: Uuid, entry: AddEntry): Promise<EntryId> {
        return new Promise((resolve, reject) => {
            let status: Status<number> = addon.wallets_addEntry(this.conf, walletId, JSON.stringify(entry));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(EntryIdOp.create(walletId, status.result).value)
        });
    }

    removeEntry(entryFullId: EntryId): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryFullId);
            let status: Status<boolean> = addon.wallets_removeEntry(this.conf, op.extractWalletId(), op.extractEntryInternalId());
            if (!status.succeeded) {
                return reject(new Error(status.error.message))
            }
            resolve(status.result);
        });
    }

    setEntryLabel(entryFullId: EntryId, label: string | null): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryFullId);
            let status: Status<boolean> = addon.entries_updateLabel(this.conf,
                op.extractWalletId(), op.extractEntryInternalId(),
                label
            );
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    setEntryReceiveDisabled(entryFullId: EntryId, disabled: boolean): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryFullId);
            let status: Status<boolean> = addon.entries_updateReceiveDisabled(this.conf,
                op.extractWalletId(), op.extractEntryInternalId(),
                disabled
            );
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result)
        });
    }

    signTx(entryId: EntryId, tx: UnsignedTx, password?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryId);
            let status: Status<string> = addon.sign_tx(this.conf, op.extractWalletId(), op.extractEntryInternalId(), JSON.stringify(tx), password);
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve("0x" + status.result);
        });
    }

    exportRawPk(entryId: EntryId, password: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryId);
            let status: Status<string> = addon.entries_exportPk(this.conf, op.extractWalletId(), op.extractEntryInternalId(), password);
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    exportJsonPk(entryId: EntryId, password?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let op = EntryIdOp.of(entryId);
            let status: Status<string>;
            try {
                status = addon.entries_export(this.conf, op.extractWalletId(), op.extractEntryInternalId(), password);
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
            let status: Status<string> = addon.seed_generateMnemonic(size);
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    listAddressBook(blockchain: number): Promise<AddressBookItem[]> {
        return new Promise((resolve, reject) => {
            let opts = Object.assign({}, this.conf);
            let status: Status<AddressBookItem[]> = addon.addrbook_list(opts);
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
            let status: Status<boolean> = addon.addrbook_add(opts, JSON.stringify(item));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    removeFromAddressBook(blockchain: number, address: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let opts = Object.assign({}, this.conf);
            let status: Status<boolean> = addon.addrbook_remove(opts, address);
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    listSeeds(): Promise<SeedDescription[]> {
        return new Promise((resolve, reject) => {
            let status: Status<SeedDescription[]> = addon.seed_list(this.conf);
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    getConnectedHWSeed(create: boolean): Promise<SeedDescription | undefined> {
        //TODO
        return Promise.resolve(undefined);
    }

    importSeed(seed: SeedDefinition | LedgerSeedReference): Promise<Uuid> {
        return new Promise((resolve, reject) => {
            let status: Status<Uuid> = addon.seed_add(this.conf, JSON.stringify(seed));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    isSeedAvailable(seed: Uuid | SeedReference | SeedDefinition): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let ref = seed;
            if (isReference(seed)) {
                ref = {
                    type: "id",
                    value: seed
                }
            }
            let status: Status<boolean> = addon.seed_isAvailable(this.conf, JSON.stringify(ref));
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }

    listSeedAddresses(seed: Uuid | SeedReference | SeedDefinition, blockchain: number, hdpath: string[]): Promise<{ [key: string]: string }> {
        return new Promise((resolve, reject) => {
            let ref = seed;
            if (isReference(seed)) {
                ref = {
                    type: "id",
                    value: seed
                }
            }
            let status: Status<{ [key: string]: string }> = addon.seed_listAddresses(this.conf, JSON.stringify(ref), blockchain, hdpath);
            if (!status.succeeded) {
                return reject(new Error(status.error.message));
            }
            resolve(status.result);
        });
    }
}