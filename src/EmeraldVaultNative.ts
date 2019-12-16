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

    vaultVersion(): string {
        return "0.27.0"
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

    addAccount(walletId: Uuid, account: AddAccount): number {
        let status: Status<number> = addon.wallets_addAccount(this.conf, walletId, JSON.stringify(account));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    removeAccount(walletId: Uuid, accountId: number) {
        let status: Status<boolean> = addon.wallets_removeAccount(this.conf, walletId, accountId);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    signTx(walletId: Uuid, accountId: number, tx: UnsignedTx, password?: string): string {
        let status: Status<string> = addon.sign_tx(this.conf, walletId, accountId, JSON.stringify(tx), password);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return "0x" + status.result;
    }

    exportPk(walletId: Uuid, accountId: number, password: string): string {
        let status: Status<string> = addon.accounts_exportPk(this.conf, walletId, accountId, password);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result;
    }

    exportAccount(walletId: Uuid, accountId: number, password?: string): any {
        let status: Status<string> = addon.accounts_export(this.conf, walletId, accountId, password);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return JSON.parse(status.result);
    }

    generateMnemonic(size: number): string {
        let status: Status<string> = addon.seed_generateMnemonic(size);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
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