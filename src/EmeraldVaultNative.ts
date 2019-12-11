import {
    Account,
    AddAccount,
    AddressBookItem,
    Config,
    ImportMnemonic,
    ImportPrivateKey,
    Status,
    StatusCode,
    UnsignedTx,
    Update,
    Uuid,
    Wallet
} from './types';
import {Seed} from "./Seed";

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

export class EmeraldVaultNative {
    private conf: Config;

    constructor(conf?: Config | undefined) {
        this.conf = conf || {};
    }

    seeds(): Seed {
        return new Seed(this.conf);
    }

    autoMigrate() {
        let opts = Object.assign({}, this.conf);
        addon.auto_migrate(opts);
    }

    listWallets(): Wallet[] {
        let status: Status<Wallet[]> = addon.wallets_list(this.conf);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    addWallet(title: string | undefined): Uuid {
        let status: Status<Uuid> = addon.wallets_add(this.conf, title);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    removeWallet(walletId: Uuid): Status<void> {
        return statusFail(StatusCode.NOT_IMPLEMENTED, "NOT IMPLEMENTED");
    }

    addAccount(walletId: Uuid, account: AddAccount): number {
        let status: Status<number> = addon.wallets_addAccount(this.conf, walletId, JSON.stringify(account));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    removeAccount(walletId: Uuid, accountId: number): Status<void> {
        return statusFail(StatusCode.NOT_IMPLEMENTED, "NOT IMPLEMENTED");
    }



    vaultVersion(): string {
        return "0.27.0"
    }

    /**
     * @deprecated
     */
    listAccounts(chain: string): Array<Account> {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.listAccounts(opts);
    }

    /**
     * @deprecated
     */
    importAccount(chain: string, data: any): string {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.importAccount(opts, JSON.stringify(data)).address;
    }

    /**
     * @deprecated
     */
    importPk(chain: string, data: ImportPrivateKey): string {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.importPk(opts, JSON.stringify(data)).address;
    }

    /**
     * @deprecated
     */
    exportPk(chain: string, address: string, password: string): string {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.exportPk(opts, address, password);
    }

    /**
     * @deprecated
     */
    exportAccount(chain: string, address: string): any {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return JSON.parse(addon.exportAccount(opts, address));
    }

    /**
     * @deprecated
     */
    updateAccount(chain: string, address: string, update: Update): boolean {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.updateAccount(opts, address, JSON.stringify(update));
    }

    /**
     * @deprecated
     */
    removeAccount_old(chain: string, address: string): boolean {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.removeAccount(opts, address);
    }

    /**
     * @deprecated
     */
    signTx(chain: string, tx: UnsignedTx, password: string): string {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.signTx(opts, JSON.stringify(tx), password);
    }

    /**
     * @deprecated
     */
    importMnemonic(chain: string, mnemonic: ImportMnemonic): string {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.importMnemonic(opts, JSON.stringify(mnemonic)).address;
    }

    generateMnemonic(size: number): string {
        return addon.generateMnemonic(size);
    }

    listAddressBook(chain: string): AddressBookItem[] {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.listAddressBook(opts);
    }

    addToAddressBook(chain: string, item: AddressBookItem): boolean {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.addToAddressBook(opts, JSON.stringify(item));
    }

    removeFromAddressBook(chain: string, address: string): boolean {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.removeFromAddressBook(opts, address);
    }
}