import {Config, Account} from './types';
var addon = require('../native');

export type Update = {
    name?: string | null,
    description?: string | null
}

export type UnsignedTx = {
    from: string,
    to: string,
    gas: string,
    gasPrice: string,
    value: string,
    data?: string | null,
    nonce: string,
}

export class EmeraldVaultNative {
    private conf: Config;

    constructor(conf: Config) {
        this.conf = conf;
    }

    listAccounts(chain: string): Array<Account> {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.listAccounts(opts);
    }

    importAccount(chain: string, data: any): string {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.importAccount(opts, JSON.stringify(data)).id;
    }

    exportAccount(chain: string, address: string): any {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return JSON.parse(addon.exportAccount(opts, address));
    }

    updateAccount(chain: string, address: string, update: Update): boolean {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.updateAccount(opts, address, JSON.stringify(update));
    }

    signTx(chain: string, tx: UnsignedTx, password: string): boolean {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.signTx(opts, JSON.stringify(tx), password);
    }
}
