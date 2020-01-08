import {Config, Status, StatusCode,} from './types';
import {
    AddAccount,
    AddressBookItem,
    BlockchainType,
    isLedger,
    isMnemonic,
    isRawSeed,
    isReference,
    SeedDefinition,
    SeedDescription,
    UnsignedTx,
    Uuid,
    Wallet,
    IEmeraldVault, AccountId, AccountIdOp, WalletsOp
} from "@emeraldpay/emerald-vault-core";

var addon = require('../native');

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

    autoMigrate() {
        let opts = Object.assign({}, this.conf);
        addon.admin_migrate(opts);
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

    addWallet(label: string | undefined): Uuid {
        let status: Status<Uuid> = addon.wallets_add(this.conf, label);
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
        throw Error("NOT IMPLEMENTED");
    }

    addAccount(walletId: Uuid, account: AddAccount): AccountId {
        let status: Status<number> = addon.wallets_addAccount(this.conf, walletId, JSON.stringify(account));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return AccountIdOp.create(walletId, status.result).value
    }

    removeAccount(accountFullId: AccountId) {
        let op = AccountIdOp.of(accountFullId);
        let status: Status<boolean> = addon.wallets_removeAccount(this.conf, op.extractWalletId(), op.extractAccountInternalId());
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    signTx(accountFullId: AccountId, tx: UnsignedTx, password?: string): string {
        let op = AccountIdOp.of(accountFullId);
        let status: Status<string> = addon.sign_tx(this.conf, op.extractWalletId(), op.extractAccountInternalId(), JSON.stringify(tx), password);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return "0x" + status.result;
    }

    exportRawPk(accountFullId: AccountId, password: string): string {
        let op = AccountIdOp.of(accountFullId);
        let status: Status<string> = addon.accounts_exportPk(this.conf, op.extractWalletId(), op.extractAccountInternalId(), password);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result;
    }

    exportJsonPk(accountFullId: AccountId, password?: string): string {
        let op = AccountIdOp.of(accountFullId);
        let status: Status<string> = addon.accounts_export(this.conf, op.extractWalletId(), op.extractAccountInternalId(), password);
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
        return undefined
    }

    importSeed(seed: SeedDefinition): Uuid {
        let status: Status<Uuid> = addon.seed_add(this.conf, JSON.stringify(seed));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    isSeedAvailable(seed: Uuid | SeedDefinition): boolean {
        if (isReference(seed)) {
            return addon.ledger_isConnected(seed);
        } else {
            if (isRawSeed(seed.value, seed)) {
                return seed.value.length > 0;
            }
            if (isMnemonic(seed.value, seed)) {
                return seed.value.value.length > 0;
            }
            if (isLedger(seed.value, seed)) {
                return addon.ledger_isConnected(seed);
            }
        }
        return false;
    }

    listSeedAddresses(seed: Uuid | SeedDefinition, blockchain: BlockchainType, hdpath: string[]): { [key: string]: string } {
        return addon.ledger_listAddresses(JSON.stringify(seed), blockchain, hdpath);
    }
}