import {
    BitcoinEntry,
    BlockchainId, EthereumEntry,
    getAccountId,
    getBlockchainType,
    isAddressSingle,
    isAddressXPub, isBitcoinEntry,
    isBlockchainId, isEthereumEntry,
    isIdSeedReference,
    isLedger,
    isMnemonic,
    isRawSeed,
    isSeedReference,
    SeedDefinition
} from "./types";

let bitcoinEntry: BitcoinEntry = {
    addresses: [], blockchain: BlockchainId.BITCOIN, createdAt: undefined, id: "", key: undefined
};
let bitcoinTestEntry: BitcoinEntry = {
    addresses: [], blockchain: BlockchainId.BITCOIN_TESTNET, createdAt: undefined, id: "", key: undefined
};
let ethEntry: EthereumEntry = {
    address: undefined, blockchain: BlockchainId.ETHEREUM, createdAt: undefined, id: "", key: undefined
};
let etcEntry: EthereumEntry = {
    address: undefined, blockchain: BlockchainId.ETHEREUM_CLASSIC, createdAt: undefined, id: "", key: undefined
};
let kovanEntry: EthereumEntry = {
    address: undefined, blockchain: BlockchainId.KOVAN_TESTNET, createdAt: undefined, id: "", key: undefined
};


describe("Types", () => {

    it("getAccountId", () => {
        expect(getAccountId({type: "seed-hd", seedId: "test", hdPath: "m/44'/0'/0'/0/0"})).toBe(0);
        expect(getAccountId({type: "seed-hd", seedId: "test", hdPath: "m/44'/60'/0'/0/0"})).toBe(0);
        expect(getAccountId({type: "seed-hd", seedId: "test", hdPath: "m/44'/60'/1'/0/0"})).toBe(1);
        expect(getAccountId({type: "seed-hd", seedId: "test", hdPath: "m/44'/60'/2'/0/0"})).toBe(2);
        expect(getAccountId({type: "seed-hd", seedId: "test", hdPath: "m/44'/60'/15'/0/0"})).toBe(15);
    });

    describe("isIdSeedReference", () => {
        it("for valid", () => {
            expect(isIdSeedReference({type: "id", value: "9ce1f45b-4a8e-46ee-b81f-1efd034feaea"}))
                .toBeTruthy();
        });
        it("for invalid", () => {
            expect(isIdSeedReference({type: "ledger"}))
                .toBeFalsy();
            // @ts-ignore
            expect(isIdSeedReference({type: "other"}))
                .toBeFalsy();
            // @ts-ignore
            expect(isIdSeedReference(undefined))
                .toBeFalsy();
        });
    });

    describe("isSeedReference", () => {
        it("for valid id", () => {
            expect(isSeedReference({type: "id", value: "9ce1f45b-4a8e-46ee-b81f-1efd034feaea"}))
                .toBeTruthy();
        });

        it("for valid ledger", () => {
            expect(isSeedReference({type: "ledger"}))
                .toBeTruthy();
        });
        it("for invalid", () => {
            // @ts-ignore
            expect(isSeedReference({type: "other"}))
                .toBeFalsy();
            // @ts-ignore
            expect(isSeedReference(undefined))
                .toBeFalsy();
        });
    });

    describe("isLedger", () => {
        it("for valid", () => {
            expect(isLedger({type: "ledger"}))
                .toBeTruthy();
        });
        it("for invalid", () => {
            expect(isLedger({type: "id", value: "9ce1f45b-4a8e-46ee-b81f-1efd034feaea"}))
                .toBeFalsy();
            // @ts-ignore
            expect(isLedger({type: "other"}))
                .toBeFalsy();
            // @ts-ignore
            expect(isLedger(undefined))
                .toBeFalsy();
        });
    });

    describe("isMnemonic", () => {
        it("for valid", () => {
            const seed: SeedDefinition = {
                type: "mnemonic",
                value: {
                    value: "hello world"
                }
            }
            expect(isMnemonic(seed.value, seed)).toBeTruthy();
        });

        it("for invalid", () => {
            const seed: SeedDefinition = {
                type: "raw",
                value: "0x00"
            }
            expect(isMnemonic(seed.value, seed)).toBeFalsy();

            expect(isMnemonic(undefined, seed)).toBeFalsy();
            expect(isMnemonic(undefined, undefined)).toBeFalsy();
            expect(isMnemonic(seed.value, undefined)).toBeFalsy();
        });

        it("for undefined", () => {
            const seed: SeedDefinition = {
                type: "raw",
                value: "0x00"
            }
            expect(isMnemonic(undefined, seed)).toBeFalsy();
            expect(isMnemonic(undefined, undefined)).toBeFalsy();
            expect(isMnemonic(seed.value, undefined)).toBeFalsy();
        });
    })

    describe("isRawSeed", () => {
        it("for valid", () => {
            const seed: SeedDefinition = {
                type: "raw",
                value: "0x00"
            }
            expect(isRawSeed(seed.value, seed)).toBeTruthy();
        });

        it("for invalid", () => {
            const seed: SeedDefinition = {
                type: "mnemonic",
                value: {
                    value: "hello world"
                }
            }
            expect(isRawSeed(seed.value, seed)).toBeFalsy();

            expect(isRawSeed(undefined, seed)).toBeFalsy();
            expect(isRawSeed(undefined, undefined)).toBeFalsy();
            expect(isRawSeed(seed.value, undefined)).toBeFalsy();
        });

        it("for undefined", () => {
            const seed: SeedDefinition = {
                type: "raw",
                value: "0x00"
            }
            expect(isRawSeed(undefined, seed)).toBeFalsy();
            expect(isRawSeed(undefined, undefined)).toBeFalsy();
            expect(isRawSeed(seed.value, undefined)).toBeFalsy();
        });
    })

    describe("isAddressSingle", () => {
        it("for single", () => {
            expect(
                isAddressSingle({type: "single", value: ""})
            ).toBeTruthy();
        });
        it("for xpub", () => {
            expect(
                isAddressSingle({type: "xpub", value: ""})
            ).toBeFalsy();
        });
    });

    describe("isAddressXPub", () => {
        it("for single", () => {
            expect(
                isAddressXPub({type: "single", value: ""})
            ).toBeFalsy();
        });
        it("for xpub", () => {
            expect(
                isAddressXPub({type: "xpub", value: ""})
            ).toBeTruthy();
        })
    });

    describe('isBlockchainId', () => {
        it("for id", () => {
            expect(isBlockchainId(1)).toBeTruthy();
            expect(isBlockchainId(100)).toBeTruthy();
            expect(isBlockchainId(101)).toBeTruthy();
            expect(isBlockchainId(10002)).toBeTruthy();
            expect(isBlockchainId(10003)).toBeTruthy();
        });
        it("for enum", () => {
            expect(isBlockchainId(BlockchainId.ETHEREUM)).toBeTruthy();
            expect(isBlockchainId(BlockchainId.ETHEREUM_CLASSIC)).toBeTruthy();
            expect(isBlockchainId(BlockchainId.KOVAN_TESTNET)).toBeTruthy();
            expect(isBlockchainId(BlockchainId.BITCOIN)).toBeTruthy();
            expect(isBlockchainId(BlockchainId.BITCOIN_TESTNET)).toBeTruthy();
        });
        it("for non id", () => {
            expect(isBlockchainId(123)).toBeFalsy();
            expect(isBlockchainId(0)).toBeFalsy();
            expect(isBlockchainId(-1)).toBeFalsy();
            expect(isBlockchainId(11)).toBeFalsy();
            expect(isBlockchainId(null)).toBeFalsy();
            expect(isBlockchainId(undefined)).toBeFalsy();
            expect(isBlockchainId(NaN)).toBeFalsy();
        });
    });

    describe("getBlockchainType", () => {
        it("for ethereum", () => {
            expect(getBlockchainType(BlockchainId.ETHEREUM)).toBe("ethereum");
            expect(getBlockchainType(BlockchainId.KOVAN_TESTNET)).toBe("ethereum");
            expect(getBlockchainType(BlockchainId.ETHEREUM_CLASSIC)).toBe("ethereum");
        });
        it("for bitcoin", () => {
            expect(getBlockchainType(BlockchainId.BITCOIN)).toBe("bitcoin");
            expect(getBlockchainType(BlockchainId.BITCOIN_TESTNET)).toBe("bitcoin");
        });
        it("for invalid", () => {
            expect(() => {
                getBlockchainType(0)
            }).toThrow()
        });
    });

    describe("isBitcoinEntry", () => {
        it("for bitcoin", () => {
            expect(isBitcoinEntry(bitcoinEntry)).toBeTruthy();
            expect(isBitcoinEntry(bitcoinTestEntry)).toBeTruthy();
        });
        it("for ethereum", () => {
            expect(isBitcoinEntry(ethEntry)).toBeFalsy();
            expect(isBitcoinEntry(etcEntry)).toBeFalsy();
            expect(isBitcoinEntry(kovanEntry)).toBeFalsy();
        });
        it("for invalid", () => {
            expect(isBitcoinEntry(undefined)).toBeFalsy();
            // @ts-ignore
            expect(isBitcoinEntry({})).toBeFalsy();
        });
    });

    describe("isEthereumEntry", () => {
        it("for bitcoin", () => {
            expect(isEthereumEntry(bitcoinEntry)).toBeFalsy();
            expect(isEthereumEntry(bitcoinTestEntry)).toBeFalsy();
        });
        it("for ethereum", () => {
            expect(isEthereumEntry(ethEntry)).toBeTruthy();
            expect(isEthereumEntry(etcEntry)).toBeTruthy();
            expect(isEthereumEntry(kovanEntry)).toBeTruthy();
        });
        it("for invalid", () => {
            expect(isEthereumEntry(undefined)).toBeFalsy();
            // @ts-ignore
            expect(isEthereumEntry({})).toBeFalsy();
        });

    });

});