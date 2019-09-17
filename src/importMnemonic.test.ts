import {EmeraldVaultNative} from "./EmeraldVaultNative";

// reference: https://iancoleman.io/bip39/#english

describe('Test import mnemonic', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: "./testdata/tmp-import-mnemonic"
        });
    });

    test("requires valid mnemonic", () => {
        let data = {
            password: "1234",
            hdPath: "m/44'/60'/0'/0/3",
            mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify"
        };
        expect(() => {
            vault.importMnemonic("eth", data);
        }).toThrow();
    });

    test("requires valid path", () => {
        let data = {
            password: "1234",
            hdPath: "m44'60'0'",
            mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
        };
        expect(() => {
            vault.importMnemonic("eth", data);
        }).toThrow();
    });

    test("requires password", () => {
        let data = {
            password: "",
            hdPath: "m/44'/60'/0'/0/3",
            mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
        };
        expect(() => {
            vault.importMnemonic("eth", data);
        }).toThrow();
    });

    test("import c6148987 3", () => {
        let data = {
            password: "1234",
            hdPath: "m/44'/60'/0'/0/3",
            mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
        };
        let id = vault.importMnemonic("eth", data);
        expect(id).toBeDefined();
        let current = vault.exportAccount("eth", "D4345AbBeEF14d2Fd2E0DEB898A67c26F1cbC4F1");
        // console.log("key", current);
        expect(current.id).toBe(id);
    });

    test("import f78a3c9 for ETC", () => {
        let data = {
            password: "testtest",
            hdPath: "m/44'/61'/0'/0/1230",
            mnemonic: "lift pledge combine cat olive divert ice fetch other typical idle idea insane friend false"
        };
        let id = vault.importMnemonic("etc", data);
        expect(id).toBeDefined();
        let current = vault.exportAccount("etc", "0xcA1c2E76F2122fddA9f97da0C4e37674727645cc");
        // console.log("key", current);
        expect(current.id).toBe(id);
    });

    test("import 12 words mnemonic", () => {
        let data = {
            password: "testtest",
            hdPath: "m/44'/60'/0'/0/1",
            mnemonic: "cave math raven foam maze humble leave razor bonus merit leisure rough"
        };
        let id = vault.importMnemonic("eth", data);
        expect(id).toBeDefined();
        let current = vault.exportAccount("eth", "0xaCeA13E5eB2120c2B42E0EdA0642d846Fa740F51");
        expect(current.id).toBe(id);
    });

    test("import 18 words mnemonic", () => {
        let data = {
            password: "testtest",
            hdPath: "m/44'/60'/0'/0/2",
            mnemonic: "below bird fossil menu slab chalk glow attitude work mammal orphan rose music holiday magic weather beef midnight"
        };
        let id = vault.importMnemonic("eth", data);
        expect(id).toBeDefined();
        let current = vault.exportAccount("eth", "0x1E728c6d055380b69ac1c0fDC27425158621f109");
        expect(current.id).toBe(id);
    });

    test("import 21 words mnemonic", () => {
        let data = {
            password: "testtest",
            hdPath: "m/44'/60'/0'/0/2030",
            mnemonic: "around force sponsor slender upper cheese gas smile guard similar dog rival select gate fit load upper spread wolf magic marble"
        };
        let id = vault.importMnemonic("eth", data);
        expect(id).toBeDefined();
        let current = vault.exportAccount("eth", "0x61bfe74D742679902E0Ed88385A1272a9922FFb5");
        expect(current.id).toBe(id);
    });

    test("import 24 words mnemonic", () => {
        let data = {
            password: "testtest",
            hdPath: "m/44'/60'/0'/0/1000",
            mnemonic: "erode youth impose rhythm best obey virtual general essay convince visit truck blanket lucky lizard stadium display hip market hello alley orient parrot blanket"
        };
        let id = vault.importMnemonic("eth", data);
        expect(id).toBeDefined();
        let current = vault.exportAccount("eth", "0x928560FaEe442342F703dabf04BC98460314B1C8");
        expect(current.id).toBe(id);
    });

});