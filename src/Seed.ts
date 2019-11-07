var addon = require('../native');

export type BlockchainType = "ethereum";
export type SeedType = "raw" | "ledger" | "mnemonic";

export type SeedRef = {
    id: string
}

export type SeedDescription = {
    id: string,
    type: SeedType,
    available: boolean
}

export type SeedDefinition = {
    type: SeedType,

    raw?: RawSeed,
    ledger?: LedgerSeed,
    mnemonic?: MnemonicSeed
}

export type MnemonicSeed = {
    value: string,
    password?: string
}

export type LedgerSeed = {

}

export type RawSeed = {
    value: string
}

function isReference(seed: SeedRef | SeedDefinition): seed is SeedRef {
    return (seed as SeedRef).id !== undefined;
}

export class Seed {

    list(): Promise<SeedRef[]> {
        return Promise.reject("NOT IMPLEMENTED")
    }

    import(seed: SeedDefinition): Promise<SeedDescription> {
        return Promise.reject("NOT IMPLEMENTED")
    }

    isAvailable(seed: SeedRef | SeedDefinition): boolean {
        if (isReference(seed)) {
            return addon.ledger_isConnected(seed);
        } else {
            if (seed.type === "raw") {
                return seed.raw && seed.raw.value && seed.raw.value.length > 0;
            }
            if (seed.type === "mnemonic") {
                return seed.mnemonic && seed.mnemonic.value && seed.mnemonic.value.length > 0;
            }
            if (seed.type === "ledger") {
                return addon.ledger_isConnected(seed);
            }
        }
        return false;
    }

    listAddresses(seed: SeedRef | SeedDefinition, blockchain: BlockchainType, hdpath: string[]): {[key: string]: string} {
        return addon.ledger_listAddresses(seed, blockchain, hdpath);
    }
}