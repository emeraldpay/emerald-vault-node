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
import * as selectors from './selectors';

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
        return selectors.getWallet(status.result, id)
    }

    addWallet(title: string | undefined): Uuid {
        let status: Status<Uuid> = addon.wallets_add(this.conf, title);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    removeWallet(walletId: Uuid) {
        throw Error("NOT IMPLEMENTED");
    }

    addAccount(walletId: Uuid, account: AddAccount): number {
        let status: Status<number> = addon.wallets_addAccount(this.conf, walletId, JSON.stringify(account));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    removeAccount(walletId: Uuid, accountId: number) {
        throw Error("NOT IMPLEMENTED");
    }

    signTx(walletId: Uuid, accountId: number, tx: UnsignedTx, password?: string): string {
        let status: Status<string> = addon.sign_tx(this.conf, walletId, accountId, JSON.stringify(tx), password);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return "0x" + status.result;
    }


    vaultVersion(): string {
        return "0.27.0"
    }

    /**
     * @deprecated
     */
    listAccounts(chain: string): Array<Account> {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.accounts_list(opts);
    }

    /**
     * @deprecated
     */
    importAccount(chain: string, data: any): string {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.accounts_import(opts, JSON.stringify(data)).address;
    }

    /**
     * @deprecated
     */
    importPk(chain: string, data: ImportPrivateKey): string {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.accounts_importPk(opts, JSON.stringify(data)).address;
    }

    /**
     * @deprecated
     */
    exportPk(chain: string, address: string, password: string): string {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.accounts_exportPk(opts, address, password);
    }

    /**
     * @deprecated
     */
    exportAccount(chain: string, address: string): any {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return JSON.parse(addon.accounts_export(opts, address));
    }

    /**
     * @deprecated
     */
    updateAccount(chain: string, address: string, update: Update): boolean {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.accounts_update(opts, address, JSON.stringify(update));
    }

    /**
     * @deprecated
     */
    removeAccount_old(chain: string, address: string): boolean {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.accounts_remove(opts, address);
    }

    /**
     * @deprecated
     */
    importMnemonic(chain: string, mnemonic: ImportMnemonic): string {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.accounts_importMnemonic(opts, JSON.stringify(mnemonic)).address;
    }

    generateMnemonic(size: number): string {
        return addon.seed_generateMnemonic(size);
    }

    listAddressBook(chain: string): AddressBookItem[] {
        let opts = Object.assign({}, this.conf, {chain: chain});
        let status: Status<AddressBookItem[]> = addon.addrbook_list(opts);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    addToAddressBook(chain: string, item: AddressBookItem): boolean {
        let opts = Object.assign({}, this.conf, {chain: chain});
        let status: Status<boolean> = addon.addrbook_add(opts, JSON.stringify(item));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    removeFromAddressBook(chain: string, address: string): boolean {
        let opts = Object.assign({}, this.conf, {chain: chain});
        let status: Status<boolean> = addon.addrbook_remove(opts, address);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }
}