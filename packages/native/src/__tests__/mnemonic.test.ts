import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "./_commons";
import {EthereumEntry} from "@emeraldpay/emerald-vault-core";

describe("Mnemonic", () => {

    describe('Test generate mnemonic', () => {
        let vault: EmeraldVaultNative;
        beforeAll(async () => {
            vault = new EmeraldVaultNative({
                dir: tempPath("gen-mnemonic")
            });
        });
        afterAll(() => {
            vault.close()
        });

        test("errors for invalid length", async () => {
            await expect(vault.generateMnemonic(19)).rejects.toThrow();
            await expect(vault.generateMnemonic(11)).rejects.toThrow();
            await expect(vault.generateMnemonic(25)).rejects.toThrow();
            await expect(vault.generateMnemonic(0)).rejects.toThrow();
            await expect(vault.generateMnemonic(-12)).rejects.toThrow();
        });

        test("generates 12 words", async () => {
            let m = await vault.generateMnemonic(12);
            expect(m.split(" ").length).toBe(12);
        });
        test("generates 15 words", async () => {
            let m = await vault.generateMnemonic(15);
            expect(m.split(" ").length).toBe(15);
        });
        test("generates 18 words", async () => {
            let m = await vault.generateMnemonic(18);
            expect(m.split(" ").length).toBe(18);
        });
        test("generates 21 words", async () => {
            let m = await vault.generateMnemonic(21);
            expect(m.split(" ").length).toBe(21);
        });
        test("generates 24 words", async () => {
            let m = await vault.generateMnemonic(24);
            // console.log(m);
            expect(m.split(" ").length).toBe(24);
            let uniq = new Set(m.split(" "));
            expect(uniq.size).toBeGreaterThan(12);
        });

    });

    // reference: https://iancoleman.io/bip39/#english
    describe('Test import mnemonic', () => {

        let vault: EmeraldVaultNative;
        beforeAll(async () => {
            vault = new EmeraldVaultNative({
                dir: tempPath("import-mnemonic")
            });
            await vault.createGlobalKey("test-global")
        });
        afterAll(() => {
            vault.close()
        });

        test("requires valid mnemonic", async () => {
            let data = {
                password: "test-global",
                hdPath: "m/44'/60'/0'/0/3",
                mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify"
            };
            await expect(
                vault.importSeed({
                    type: "mnemonic",
                    password: data.password,
                    value: {
                        value: data.mnemonic
                    }
                })
            ).rejects.toThrow();
        });

        test("requires valid path", async () => {
            let data = {
                password: "test-global",
                hdPath: "m44'60'0'",
                mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
            };
            let seedId = await vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = await vault.addWallet("test");

            await expect(
                vault.addEntry(walletId, {
                    blockchain: 100,
                    type: "hd-path",
                    key: {
                        seed: {type: "id", value: seedId, password: data.password},
                        hdPath: data.hdPath,
                    }
                })
            ).rejects.toThrow();
        });

        test("requires password", async () => {
            let data = {
                hdPath: "m/44'/60'/0'/0/3",
                mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
            };
            await expect(
                vault.importSeed({
                    type: "mnemonic",
                    password: "",
                    value: {
                        value: data.mnemonic
                    }
                })
            ).rejects.toThrow();
        });

        test("import c6148987 3", async () => {
            let data = {
                password: "test-global",
                hdPath: "m/44'/60'/0'/0/3",
                mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
            };

            let seedId = await vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seed: {type: "id", value: seedId, password: data.password},
                }
            });

            let entry = (await vault.getWallet(walletId)).entries[0] as EthereumEntry;
            expect(entry).toBeDefined();
            expect(entry.address.value).toBe("0xD4345AbBeEF14d2Fd2E0DEB898A67c26F1cbC4F1".toLowerCase());
        });

        test("import f78a3c9 for ETC", async () => {
            let data = {
                password: "test-global",
                hdPath: "m/44'/61'/0'/0/1230",
                mnemonic: "lift pledge combine cat olive divert ice fetch other typical idle idea insane friend false"
            };

            let seedId = await vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 101,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seed: {type: "id", value: seedId, password: data.password},
                }
            });

            let entry = (await vault.getWallet(walletId)).entries[0] as EthereumEntry;
            expect(entry).toBeDefined();
            expect(entry.address.value).toBe("0xcA1c2E76F2122fddA9f97da0C4e37674727645cc".toLowerCase());
        });

        test("import 12 words mnemonic", async () => {
            let data = {
                password: "test-global",
                hdPath: "m/44'/60'/0'/0/1",
                mnemonic: "cave math raven foam maze humble leave razor bonus merit leisure rough"
            };

            let seedId = await vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seed: {type: "id", value: seedId, password: data.password},
                }
            });

            let entry = (await vault.getWallet(walletId)).entries[0] as EthereumEntry;
            expect(entry).toBeDefined();
            expect(entry.address.value).toBe("0xaCeA13E5eB2120c2B42E0EdA0642d846Fa740F51".toLowerCase());
        });

        test("import 18 words mnemonic", async () => {
            let data = {
                password: "test-global",
                hdPath: "m/44'/60'/0'/0/2",
                mnemonic: "below bird fossil menu slab chalk glow attitude work mammal orphan rose music holiday magic weather beef midnight"
            };

            let seedId = await vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seed: {type: "id", value: seedId, password: data.password},
                }
            });

            let entry = (await vault.getWallet(walletId)).entries[0] as EthereumEntry;
            expect(entry).toBeDefined();
            expect(entry.address.value).toBe("0x1E728c6d055380b69ac1c0fDC27425158621f109".toLowerCase());

        });

        test("import 21 words mnemonic", async () => {
            let data = {
                password: "test-global",
                hdPath: "m/44'/60'/0'/0/2030",
                mnemonic: "around force sponsor slender upper cheese gas smile guard similar dog rival select gate fit load upper spread wolf magic marble"
            };

            let seedId = await vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seed: {type: "id", value: seedId, password: data.password},
                }
            });

            let entry = (await vault.getWallet(walletId)).entries[0] as EthereumEntry;
            expect(entry).toBeDefined();
            expect(entry.address.value).toBe("0x61bfe74D742679902E0Ed88385A1272a9922FFb5".toLowerCase());

        });

        test("import 24 words mnemonic", async () => {
            let data = {
                password: "test-global",
                hdPath: "m/44'/60'/0'/0/1000",
                mnemonic: "erode youth impose rhythm best obey virtual general essay convince visit truck blanket lucky lizard stadium display hip market hello alley orient parrot blanket"
            };

            let seedId = await vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seed: {type: "id", value: seedId, password: data.password},
                }
            });

            let entry = (await vault.getWallet(walletId)).entries[0] as EthereumEntry;
            expect(entry).toBeDefined();
            expect(entry.address.value).toBe("0x928560FaEe442342F703dabf04BC98460314B1C8".toLowerCase());

        });

        test("import address with zero prefix", async () => {
            let data = {
                password: "test-global",
                hdPath: "m/44'/60'/0'/0/134",
                mnemonic: "gravity tornado laugh hold engine relief next math sleep organ above purse prefer afraid wife service opinion gallery swap violin middle"
            };

            let seedId = await vault.importSeed({
                type: "mnemonic",
                password: data.password,
                value: {
                    value: data.mnemonic
                }
            });

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: data.hdPath,
                    seed: {type: "id", value: seedId, password: data.password},
                }
            });

            let entry = (await vault.getWallet(walletId)).entries[0] as EthereumEntry;
            expect(entry).toBeDefined();
            expect(entry.address.value).toBe("0x00ED14a24d2acE1bCC60a978e017D3e0f9be92Ae".toLowerCase());

        });
    });
});
