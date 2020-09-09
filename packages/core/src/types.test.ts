import {
    getAccountId,
    isIdSeedReference,
    isLedger,
    isMnemonic,
    isSeedReference,
    SeedDefinition,
    isRawSeed, isAddressSingle, isAddressXPub
} from "./types";

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
        expect(
            isAddressSingle({type: "single", value: ""})
        ).toBeTruthy();
        expect(
            isAddressSingle({type: "xpub", value: ""})
        ).toBeFalsy();
    });

    describe("isAddressXPub", () => {
        expect(
            isAddressXPub({type: "single", value: ""})
        ).toBeFalsy();
        expect(
            isAddressXPub({type: "xpub", value: ""})
        ).toBeTruthy();
    });

});