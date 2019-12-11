import {Config, Status, Uuid, Wallet} from "./types";

var addon = require('../native');

export type BlockchainType = "ethereum";
export type SeedType = "raw" | "ledger" | "mnemonic";

export type SeedDescription = {
    id: Uuid,
    type: SeedType,
    available: boolean
}

export type SeedDefinition = {
    type: SeedType,
    value: RawSeed | LedgerSeed | MnemonicSeed,
    // Password to _encrypt_ seed data on the disc, applied to raw or mnemonic seed only
    password?: string
}

export type MnemonicSeed = {
    value: string,
    password?: string
}

export type LedgerSeed = {

}

export type RawSeed = string;

function isReference(seed: Uuid | SeedDefinition): seed is Uuid {
    return typeof seed === "string";
}

function isRawSeed(value: RawSeed | LedgerSeed | MnemonicSeed, parent: SeedDefinition): value is RawSeed {
    return parent.type === "raw"
}

function isMnemonic(value: RawSeed | LedgerSeed | MnemonicSeed, parent: SeedDefinition): value is MnemonicSeed {
    return parent.type === "mnemonic"
}

function isLedger(value: RawSeed | LedgerSeed | MnemonicSeed, parent: SeedDefinition): value is LedgerSeed {
    return parent.type === "ledger"
}

export class Seed {

    private conf: Config;

    constructor(conf?: Config | undefined) {
        this.conf = conf || {};
    }

    list(): SeedDescription[] {
        let status: Status<SeedDescription[]> = addon.seed_list(this.conf);
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result;
    }

    import(seed: SeedDefinition): Uuid {
        let status: Status<Uuid> = addon.seed_add(this.conf, JSON.stringify(seed));
        if (!status.succeeded) {
            throw Error(status.error.message)
        }
        return status.result
    }

    isAvailable(seed: Uuid | SeedDefinition): boolean {
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

    listAddresses(seed: Uuid | SeedDefinition, blockchain: BlockchainType, hdpath: string[]): {[key: string]: string} {
        return addon.ledger_listAddresses(JSON.stringify(seed), blockchain, hdpath);
    }
}