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
    LedgerSeedReference
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

export class EmeraldVaultNative implements IEmeraldVault {
    private conf: Config;

    constructor(conf?: Config | undefined) {
        this.conf = conf || {};
    }

    vaultVersion(): string {
        return "0.27.0"
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

    listWallets(): Wallet[] {
        let status: Status<Wallet[]> = addon.wallets_list(this.conf);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    getWallet(id: Uuid): Wallet | undefined {
        let status: Status<Wallet[]> = addon.wallets_list(this.conf);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return WalletsOp.of(status.result).getWallet(id).value
    }

    addWallet(labelOrOptions: string | WalletCreateOptions | undefined): Uuid {
        let options: WalletCreateOptions = {};
        if (typeof labelOrOptions === 'string') {
            options = {name: labelOrOptions}
        } else if (typeof labelOrOptions === 'object') {
            options = labelOrOptions
        }
        let status: Status<Uuid> = addon.wallets_add(this.conf, JSON.stringify(options));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    setWalletLabel(walletId: Uuid, label: string): boolean {
        let status: Status<boolean> = addon.wallets_updateLabel(this.conf, walletId, label);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    removeWallet(walletId: Uuid) {
        let status: Status<boolean> = addon.wallets_remove(this.conf, walletId);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
    }

    addEntry(walletId: Uuid, entry: AddEntry): EntryId {
        let status: Status<number> = addon.wallets_addEntry(this.conf, walletId, JSON.stringify(entry));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return EntryIdOp.create(walletId, status.result).value
    }

    removeEntry(entryFullId: EntryId) {
        let op = EntryIdOp.of(entryFullId);
        let status: Status<boolean> = addon.wallets_removeEntry(this.conf, op.extractWalletId(), op.extractEntryInternalId());
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    setEntryLabel(entryFullId: EntryId, label: string | null): boolean {
        let op = EntryIdOp.of(entryFullId);
        let status: Status<boolean> = addon.entries_updateLabel(this.conf,
            op.extractWalletId(), op.extractEntryInternalId(),
            label
        );
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    setEntryReceiveDisabled(entryFullId: EntryId, disabled: boolean): boolean {
        let op = EntryIdOp.of(entryFullId);
        let status: Status<boolean> = addon.entries_updateReceiveDisabled(this.conf,
            op.extractWalletId(), op.extractEntryInternalId(),
            disabled
        );
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    signTx(entryId: EntryId, tx: UnsignedTx, password?: string): string {
        let op = EntryIdOp.of(entryId);
        let status: Status<string> = addon.sign_tx(this.conf, op.extractWalletId(), op.extractEntryInternalId(), JSON.stringify(tx), password);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return "0x" + status.result;
    }

    exportRawPk(entryId: EntryId, password: string): string {
        let op = EntryIdOp.of(entryId);
        let status: Status<string> = addon.entries_exportPk(this.conf, op.extractWalletId(), op.extractEntryInternalId(), password);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result;
    }

    exportJsonPk(entryId: EntryId, password?: string): string {
        let op = EntryIdOp.of(entryId);
        let status: Status<string> = addon.entries_export(this.conf, op.extractWalletId(), op.extractEntryInternalId(), password);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result;
    }

    generateMnemonic(size: number): string {
        let status: Status<string> = addon.seed_generateMnemonic(size);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    listAddressBook(blockchain: number): AddressBookItem[] {
        let opts = Object.assign({}, this.conf);
        let status: Status<AddressBookItem[]> = addon.addrbook_list(opts);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
            .filter((item) => item.blockchain == blockchain);
    }

    addToAddressBook(item: AddressBookItem): boolean {
        let opts = Object.assign({}, this.conf);
        let status: Status<boolean> = addon.addrbook_add(opts, JSON.stringify(item));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    removeFromAddressBook(blockchain: number, address: string): boolean {
        let opts = Object.assign({}, this.conf);
        let status: Status<boolean> = addon.addrbook_remove(opts, address);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    listSeeds(): SeedDescription[] {
        let status: Status<SeedDescription[]> = addon.seed_list(this.conf);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result;
    }

    getConnectedHWSeed(create: boolean): SeedDescription | undefined {
        //TODO
        return undefined
    }

    importSeed(seed: SeedDefinition | LedgerSeedReference): Uuid {
        let status: Status<Uuid> = addon.seed_add(this.conf, JSON.stringify(seed));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    isSeedAvailable(seed: Uuid | SeedReference | SeedDefinition): boolean {
        let ref = seed;
        if (isReference(seed)) {
            ref = {
                type: "id",
                value: seed
            }
        }
        let status: Status<boolean> = addon.seed_isAvailable(this.conf, JSON.stringify(ref));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result;
    }

    listSeedAddresses(seed: Uuid | SeedReference | SeedDefinition, blockchain: BlockchainType, hdpath: string[]): { [key: string]: string } {
        let ref = seed;
        if (isReference(seed)) {
            ref = {
                type: "id",
                value: seed
            }
        }
        let status: Status<{ [key: string]: string }> = addon.seed_listAddresses(this.conf, JSON.stringify(ref), blockchain, hdpath);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result;
    }
}