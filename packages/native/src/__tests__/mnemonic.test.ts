import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "./_commons";
import {EthereumAccount} from "@emeraldpay/emerald-vault-core";

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
                dir: tempPath("import-mnemonic")
            });
        });

        test("requires valid mnemonic", () => {
            let data = {
                password: "1234",
                hdPath: "m/44'/60'/0'/0/3",
                mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify"
            };
            expect(() => {
                vault.importSeed({
                    type: "mnemonic",
                    password: data.password,
                    value: {
                        value: data.mnemonic
                    }
                });
            }).toThrow();
        });

        test("requires valid path", () => {
            let data = {
                password: "1234",
                hdPath: "m44'60'0'",
                mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
            };
            expect(() => {
                let seedId = vault.importSeed({
                    type: "mnemonic",
                    password: data.password,
                    value: {
                        value: data.mnemonic
                    }
                });

                let walletId = vault.addWallet("test");
                let accountId = vault.addAccount(walletId, {
                    blockchain: 100,
                    type: "hd-path",
                    key: {
                        hdPath: data.hdPath,
                        seedId: seedId,
                        password: data.password
                    }
                });
            }).toThrow();
        });

        test("requires password", () => {
            let data = {
                password: "",
                hdPath: "m/44'/60'/0'/0/3",
                mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
            };
            expect(() => {
                let seedId = vault.importSeed({
                    type: "mnemonic",
                    password: data.password,
                    value: {
                        value: data.mnemonic
                    }
                });
            }).toThrow();
        });

        test("import c6148987 3", () => {
            let data = {
                password: "1234",
                hdPath: "m/44'/60'/0'/0/3",
                mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
            };

            let seedId = vault.importSeed({
               type: "mnemonic",
               password: data.password,
               value: {
                   value: data.mnemonic
               }
            });

            let walletId = vault.addWallet("test");
            let accountId = vault.addAccount(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seedId: seedId,
                    password: data.password
                }
            });

            let account = vault.getWallet(walletId).accounts[0] as EthereumAccount;
            expect(account).toBeDefined();
            expect(account.address).toBe("0xD4345AbBeEF14d2Fd2E0DEB898A67c26F1cbC4F1".toLowerCase());
        });

        test("import f78a3c9 for ETC", () => {
            let data = {
                password: "testtest",
                hdPath: "m/44'/61'/0'/0/1230",
                mnemonic: "lift pledge combine cat olive divert ice fetch other typical idle idea insane friend false"
            };

            let seedId = vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = vault.addWallet("test");
            let accountId = vault.addAccount(walletId, {
                blockchain: 101,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seedId: seedId,
                    password: data.password
                }
            });

            let account = vault.getWallet(walletId).accounts[0] as EthereumAccount;
            expect(account).toBeDefined();
            expect(account.address).toBe("0xcA1c2E76F2122fddA9f97da0C4e37674727645cc".toLowerCase());
        });

        test("import 12 words mnemonic", () => {
            let data = {
                password: "testtest",
                hdPath: "m/44'/60'/0'/0/1",
                mnemonic: "cave math raven foam maze humble leave razor bonus merit leisure rough"
            };

            let seedId = vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = vault.addWallet("test");
            let accountId = vault.addAccount(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seedId: seedId,
                    password: data.password
                }
            });

            let account = vault.getWallet(walletId).accounts[0] as EthereumAccount;
            expect(account).toBeDefined();
            expect(account.address).toBe("0xaCeA13E5eB2120c2B42E0EdA0642d846Fa740F51".toLowerCase());
        });

        test("import 18 words mnemonic", () => {
            let data = {
                password: "testtest",
                hdPath: "m/44'/60'/0'/0/2",
                mnemonic: "below bird fossil menu slab chalk glow attitude work mammal orphan rose music holiday magic weather beef midnight"
            };

            let seedId = vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = vault.addWallet("test");
            let accountId = vault.addAccount(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seedId: seedId,
                    password: data.password
                }
            });

            let account = vault.getWallet(walletId).accounts[0] as EthereumAccount;
            expect(account).toBeDefined();
            expect(account.address).toBe("0x1E728c6d055380b69ac1c0fDC27425158621f109".toLowerCase());

        });

        test("import 21 words mnemonic", () => {
            let data = {
                password: "testtest",
                hdPath: "m/44'/60'/0'/0/2030",
                mnemonic: "around force sponsor slender upper cheese gas smile guard similar dog rival select gate fit load upper spread wolf magic marble"
            };

            let seedId = vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = vault.addWallet("test");
            let accountId = vault.addAccount(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seedId: seedId,
                    password: data.password
                }
            });

            let account = vault.getWallet(walletId).accounts[0] as EthereumAccount;
            expect(account).toBeDefined();
            expect(account.address).toBe("0x61bfe74D742679902E0Ed88385A1272a9922FFb5".toLowerCase());

        });

        test("import 24 words mnemonic", () => {
            let data = {
                password: "testtest",
                hdPath: "m/44'/60'/0'/0/1000",
                mnemonic: "erode youth impose rhythm best obey virtual general essay convince visit truck blanket lucky lizard stadium display hip market hello alley orient parrot blanket"
            };

            let seedId = vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = vault.addWallet("test");
            let accountId = vault.addAccount(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seedId: seedId,
                    password: data.password
                }
            });

            let account = vault.getWallet(walletId).accounts[0] as EthereumAccount;
            expect(account).toBeDefined();
            expect(account.address).toBe("0x928560FaEe442342F703dabf04BC98460314B1C8".toLowerCase());

        });

        test("import address with zero prefix", () => {
            let data = {
                password: "testtest",
                hdPath: "m/44'/60'/0'/0/134",
                mnemonic: "gravity tornado laugh hold engine relief next math sleep organ above purse prefer afraid wife service opinion gallery swap violin middle"
            };

            let seedId = vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = vault.addWallet("test");
            let accountId = vault.addAccount(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seedId: seedId,
                    password: data.password
                }
            });

            let account = vault.getWallet(walletId).accounts[0] as EthereumAccount;
            expect(account).toBeDefined();
            expect(account.address).toBe("0x00ED14a24d2acE1bCC60a978e017D3e0f9be92Ae".toLowerCase());

        });
    });
});
