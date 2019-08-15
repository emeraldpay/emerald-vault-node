import {Config, Account} from './types';
var addon = require('../native');

export class EmeraldVaultNative {
    private conf: Config;

    constructor(conf: Config) {
        this.conf = conf;
    }

    listAccounts(chain: string): Array<Account> {
        let opts = Object.assign({}, this.conf, {chain: chain});
        return addon.listAccounts(opts);
    }
}
