var addon = require('../native');

export type BlockchainType = "ethereum";
export type SeedType = "bytes" | "ledger";

export type SeedDefinition = {
    id: string,
    type: SeedType
}

export class Seed {

    listSeeds(): Promise<SeedDefinition[]> {
        return Promise.reject("NOT IMPLEMENTED")
    }

    // TODO use seedId
    isAvailable(): boolean {
        return addon.ledger_isConnected();
    }

    // TODO use seedId
    listAddresses(blockchain: BlockchainType, hdpath: string[]): {[key: string]: string} {
        throw Error("NOT IMPLEMENTED");
    }
}