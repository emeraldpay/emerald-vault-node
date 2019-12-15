import {EmeraldVaultNative} from "./EmeraldVaultNative";
import * as selector from './selectors';

describe("Mnemonic", () => {

    describe('Test generate mnemonic', () => {
        let vault;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/tmp-gen-mnemonic"
            });
        });

        test("errors for invalid length", () => {
            expect(() => {
                vault.generateMnemonic(19);
            }).toThrow();

            expect(() => {
                vault.generateMnemonic(11);
            }).toThrow();

            expect(() => {
                vault.generateMnemonic(25);
            }).toThrow();

            expect(() => {
                vault.generateMnemonic(0);
            }).toThrow();

            expect(() => {
                vault.generateMnemonic(-12);
            }).toThrow();
        });

        test("generates 12 words", () => {
            let m = vault.generateMnemonic(12);
            expect(m.split(" ").length).toBe(12);
        });
        test("generates 15 words", () => {
            let m = vault.generateMnemonic(15);
            expect(m.split(" ").length).toBe(15);
        });
        test("generates 18 words", () => {
            let m = vault.generateMnemonic(18);
            expect(m.split(" ").length).toBe(18);
        });
        test("generates 21 words", () => {
            let m = vault.generateMnemonic(21);
            expect(m.split(" ").length).toBe(21);
        });
        test("generates 24 words", () => {
            let m = vault.generateMnemonic(24);
            console.log(m);
            expect(m.split(" ").length).toBe(24);
            let uniq = new Set(m.split(" "));
            expect(uniq.size).toBeGreaterThan(12);
        });

    });

    // reference: https://iancoleman.io/bip39/#english
    describe('Test import mnemonic', () => {

        let vault: EmeraldVaultNative;
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
            let address = vault.importMnemonic("eth", data);
            expect(address).toEqual("0xD4345AbBeEF14d2Fd2E0DEB898A67c26F1cbC4F1".toLowerCase());

            let wallets = vault.listWallets();
            let account = selector.findAccountByAddress(wallets, "0xD4345AbBeEF14d2Fd2E0DEB898A67c26F1cbC4F1");
            expect(account).toBeDefined();
        });

        test("import f78a3c9 for ETC", () => {
            let data = {
                password: "testtest",
                hdPath: "m/44'/61'/0'/0/1230",
                mnemonic: "lift pledge combine cat olive divert ice fetch other typical idle idea insane friend false"
            };
            let address = vault.importMnemonic("etc", data);
            expect(address).toEqual("0xcA1c2E76F2122fddA9f97da0C4e37674727645cc".toLowerCase());

            let wallets = vault.listWallets();
            let account = selector.findAccountByAddress(wallets, "0xcA1c2E76F2122fddA9f97da0C4e37674727645cc");
            expect(account).toBeDefined();

        });

        test("import 12 words mnemonic", () => {
            let data = {
                password: "testtest",
                hdPath: "m/44'/60'/0'/0/1",
                mnemonic: "cave math raven foam maze humble leave razor bonus merit leisure rough"
            };
            let address = vault.importMnemonic("eth", data);
            expect(address).toEqual("0xaCeA13E5eB2120c2B42E0EdA0642d846Fa740F51".toLowerCase());


            let wallets = vault.listWallets();
            let account = selector.findAccountByAddress(wallets, "0xaCeA13E5eB2120c2B42E0EdA0642d846Fa740F51");
            expect(account).toBeDefined();

        });

        test("import 18 words mnemonic", () => {
            let data = {
                password: "testtest",
                hdPath: "m/44'/60'/0'/0/2",
                mnemonic: "below bird fossil menu slab chalk glow attitude work mammal orphan rose music holiday magic weather beef midnight"
            };
            let address = vault.importMnemonic("eth", data);
            expect(address).toEqual("0x1E728c6d055380b69ac1c0fDC27425158621f109".toLowerCase());

            let wallets = vault.listWallets();
            let account = selector.findAccountByAddress(wallets, "0x1E728c6d055380b69ac1c0fDC27425158621f109");
            expect(account).toBeDefined();

        });

        test("import 21 words mnemonic", () => {
            let data = {
                password: "testtest",
                hdPath: "m/44'/60'/0'/0/2030",
                mnemonic: "around force sponsor slender upper cheese gas smile guard similar dog rival select gate fit load upper spread wolf magic marble"
            };
            let address = vault.importMnemonic("eth", data);
            expect(address).toEqual("0x61bfe74D742679902E0Ed88385A1272a9922FFb5".toLowerCase());

            let wallets = vault.listWallets();
            let account = selector.findAccountByAddress(wallets, "0x61bfe74D742679902E0Ed88385A1272a9922FFb5");
            expect(account).toBeDefined();

        });

        test("import 24 words mnemonic", () => {
            let data = {
                password: "testtest",
                hdPath: "m/44'/60'/0'/0/1000",
                mnemonic: "erode youth impose rhythm best obey virtual general essay convince visit truck blanket lucky lizard stadium display hip market hello alley orient parrot blanket"
            };
            let address = vault.importMnemonic("eth", data);
            expect(address).toEqual("0x928560FaEe442342F703dabf04BC98460314B1C8".toLowerCase());

            let wallets = vault.listWallets();
            let account = selector.findAccountByAddress(wallets, "0x928560FaEe442342F703dabf04BC98460314B1C8");
            expect(account).toBeDefined();

        });

    });
});
