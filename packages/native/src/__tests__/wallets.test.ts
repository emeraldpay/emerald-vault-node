import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {AddEntry, WalletOp, WalletsOp} from "@emeraldpay/emerald-vault-core";
import {tempPath} from "./_commons";

describe("Wallets", () => {

    describe("List", () => {

        describe('Vault 0.26 - Basic', () => {

            let vault;
            beforeAll(() => {
                vault = new EmeraldVaultNative({
                    dir: "./testdata/vault-0.26-basic"
                });
                vault.open();
            });

            test("list items", () => {
                let wallets = vault.listWallets();

                expect(wallets.length).toBe(3);

                let eth = wallets.filter((w) => w.entries.some((a) => a.blockchain == 100));
                let etc = wallets.filter((w) => w.entries.some((a) => a.blockchain == 101));

                expect(eth.length).toBe(2);
                expect(etc.length).toBe(1);

                expect(etc[0].entries.length).toBe(1);
                expect(etc[0].entries[0].address).toBe("0x5b30de96fdf94ac6c5b4a8c243f991c649d66fa1");

                eth = eth.sort((a, b) =>
                    WalletOp.of(a).getEthereumEntries()[0].address.localeCompare(
                        WalletOp.of(b).getEthereumEntries()[0].address
                    )
                );

                expect(eth[0].entries[0].address).toBe("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
                expect(eth[0].name).toBe("foo bar");
                expect(eth[1].entries[0].address).toBe("0x410891c20e253a2d284f898368860ec7ffa6153c");
            });
        });
    });

    describe("Create wallet and entry", () => {

        describe("Create", () => {
            let vault: EmeraldVaultNative;
            beforeEach(() => {
                vault = new EmeraldVaultNative({
                    dir: tempPath("wallet-create")
                });
            });
            test("without label", () => {
                let id = vault.addWallet(undefined);
                let wallets = vault.listWallets();
                expect(wallets.length).toBeGreaterThan(0);
                let created = WalletsOp.of(wallets).getWallet(id).value;
                expect(created).toBeDefined();
                expect(created.name).toBeNull()
            });

            test("with empty label", () => {
                let id = vault.addWallet("");
                let wallets = vault.listWallets();
                expect(wallets.length).toBeGreaterThan(0);
                let created = WalletsOp.of(wallets).getWallet(id).value;
                expect(created).toBeDefined();
                expect(created.name).toBeNull();
            });

            test("with label", () => {
                let id = vault.addWallet("Test 1111");
                let wallets = vault.listWallets();
                expect(wallets.length).toBeGreaterThan(0);
                let created = WalletsOp.of(wallets).getWallet(id).value;
                expect(created).toBeDefined();
                expect(created.name).toBe("Test 1111");
            });

            test("with label as options", () => {
                let id = vault.addWallet({name: "Test 1111"});
                let wallets = vault.listWallets();
                expect(wallets.length).toBeGreaterThan(0);
                let created = WalletsOp.of(wallets).getWallet(id).value;
                expect(created).toBeDefined();
                expect(created.name).toBe("Test 1111");
                expect(created.reserved).toEqual([]);
            });

            test("with reserved seed", () => {
                let id = vault.addWallet({
                    name: "Test 1111",
                    reserved: [{seedId: "95d3953b-6df0-424e-93ad-61e463564bff", accountId: 1}]
                });
                let wallets = vault.listWallets();
                expect(wallets.length).toBeGreaterThan(0);
                let created = WalletsOp.of(wallets).getWallet(id).value;
                expect(created).toBeDefined();
                expect(created.name).toBe("Test 1111");
                expect(created.reserved).toBeDefined();
                expect(created.reserved[0]).toEqual({seedId: "95d3953b-6df0-424e-93ad-61e463564bff", accountId: 1});
                expect(created.reserved.length).toBe(1);
            });

            test("with few reserved seeds", () => {
                let id = vault.addWallet(
                    {
                        name: "Test 1111",
                        reserved: [
                            {seedId: "95d3953b-6df0-424e-93ad-61e463564bff", accountId: 1},
                            {seedId: "2c9f98b3-0499-4550-b5f5-086a0264ebd5", accountId: 1},
                            {seedId: "2c9f98b3-0499-4550-b5f5-086a0264ebd5", accountId: 2},
                        ]
                    });
                let wallets = vault.listWallets();
                expect(wallets.length).toBeGreaterThan(0);
                let created = WalletsOp.of(wallets).getWallet(id).value;
                expect(created).toBeDefined();
                expect(created.name).toBe("Test 1111");
                expect(created.reserved).toBeDefined();
                expect(created.reserved[0]).toEqual({seedId: "95d3953b-6df0-424e-93ad-61e463564bff", accountId: 1});
                expect(created.reserved[1]).toEqual({seedId: "2c9f98b3-0499-4550-b5f5-086a0264ebd5", accountId: 1});
                expect(created.reserved[2]).toEqual({seedId: "2c9f98b3-0499-4550-b5f5-086a0264ebd5", accountId: 2});
                expect(created.reserved.length).toBe(3);
            });
        });

        describe("Import Ethereum", () => {
            let vault: EmeraldVaultNative;
            beforeEach(() => {
                vault = new EmeraldVaultNative({
                    dir: tempPath("wallet-import")
                });
            });

            test("Create and import JSON", () => {
                //https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
                let key = {
                    "address": "008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
                    "crypto" : {
                        "cipher" : "aes-128-ctr",
                        "cipherparams" : {
                            "iv" : "6087dab2f9fdbbfaddc31a909735c1e6"
                        },
                        "ciphertext" : "5318b4d5bcd28de64ee5559e671353e16f075ecae9f99c7a79a38af5f869aa46",
                        "kdf" : "pbkdf2",
                        "kdfparams" : {
                            "c" : 262144,
                            "dklen" : 32,
                            "prf" : "hmac-sha256",
                            "salt" : "ae3cd4e7013836a3df6bd7241b12db061dbe2c6785853cce422d148a624ce0bd"
                        },
                        "mac" : "517ead924a9d0dc3124507e3393d175ce3ff7c1e96529c6c555ce9e51205e9b2"
                    },
                    "id" : "3198bc9c-6672-5ab3-d995-4942343ae5b6",
                    "version" : 3
                };

                let id = vault.addWallet("Test 2");
                let acc: AddEntry = {
                    blockchain: 100,
                    type: "ethereum-json",
                    key: JSON.stringify(key)
                };
                let result = vault.addEntry(id, acc);

                expect(result).toBe(id + "-0");

                let wallet = WalletsOp.of(vault.listWallets()).getWallet(id).value;
                expect(wallet.entries.length).toBe(1);
            });

            test("Create and import raw", () => {
                let id = vault.addWallet("Test 2");
                let acc: AddEntry = {
                    blockchain: 100,
                    type: "raw-pk-hex",
                    key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                    password: "test"
                };
                let result = vault.addEntry(id, acc);

                expect(result).toBe(id + "-0");
                let wallet = WalletsOp.of(vault.listWallets()).getWallet(id);
                expect(wallet.value.entries.length).toBe(1);
                expect(wallet.getEthereumEntries()[0].address).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");
            });

            test("Uses current date", () => {
                const start = new Date();
                let id = vault.addWallet("Test 2");
                let acc: AddEntry = {
                    blockchain: 100,
                    type: "raw-pk-hex",
                    key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                    password: "test"
                };
                let entryId = vault.addEntry(id, acc);
                let wallet = WalletsOp.of(vault.listWallets()).getWallet(id);

                expect(wallet.value.createdAt).toBeDefined();
                const walletCreatedAt = new Date(wallet.value.createdAt);
                expect(walletCreatedAt.getMilliseconds()).toBeGreaterThanOrEqual(start.getMilliseconds());
                expect(walletCreatedAt.getMilliseconds()).toBeLessThanOrEqual(new Date().getMilliseconds());

                expect(wallet.getEthereumEntries()[0].id).toBe(entryId);
                expect(wallet.getEthereumEntries()[0].createdAt).toBeDefined();
                const entryCreatedAt = new Date(wallet.getEthereumEntries()[0].createdAt);
                expect(entryCreatedAt.getMilliseconds()).toBeGreaterThanOrEqual(start.getMilliseconds());
                expect(entryCreatedAt.getMilliseconds()).toBeLessThanOrEqual(new Date().getMilliseconds());
            });

            test("Create and import 2 keys", () => {
                let id = vault.addWallet("Test 3");
                let acc1: AddEntry = {
                    blockchain: 100,
                    type: "raw-pk-hex",
                    key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                    password: "test1"
                };
                let result1 = vault.addEntry(id, acc1);
                let acc2: AddEntry = {
                    blockchain: 101,
                    type: "raw-pk-hex",
                    key: "0x7a28b5ba57c53603b0b07b56bba752f7784bf506fa95edc395f5cf6c7514fe9d",
                    password: "test2"
                };
                let result2 = vault.addEntry(id, acc2);

                expect(result1).toBe(id + "-0");
                expect(result2).toBe(id + "-1");

                let wallet = WalletsOp.of(vault.listWallets()).getWallet(id);
                expect(wallet.value.entries.length).toBe(2);
                expect(wallet.getEthereumEntries()[0].address).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");
                expect(wallet.getEthereumEntries()[0].blockchain).toBe(100);
                expect(wallet.getEthereumEntries()[1].address).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
                expect(wallet.getEthereumEntries()[1].blockchain).toBe(101);
            });

            test("Create and import from seed", () => {
                let id = vault.addWallet("Test 3");
                let acc1: AddEntry = {
                    blockchain: 100,
                    type: "raw-pk-hex",
                    key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                    password: "test1"
                };
                let result1 = vault.addEntry(id, acc1);
                let acc2: AddEntry = {
                    blockchain: 101,
                    type: "raw-pk-hex",
                    key: "0x7a28b5ba57c53603b0b07b56bba752f7784bf506fa95edc395f5cf6c7514fe9d",
                    password: "test2"
                };
                let result2 = vault.addEntry(id, acc2);

                expect(result1).toBe(id + "-0");
                expect(result2).toBe(id + "-1");

                let wallet = WalletsOp.of(vault.listWallets()).getWallet(id);
                expect(wallet.value.entries.length).toBe(2);
                expect(wallet.getEthereumEntries()[0].address).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");
                expect(wallet.getEthereumEntries()[0].blockchain).toBe(100);
                expect(wallet.getEthereumEntries()[1].address).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
                expect(wallet.getEthereumEntries()[1].blockchain).toBe(101);
            });
        });

    });

    describe("Update wallet", () => {
        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("wallet-update")
            });
        });

        test("Update label", () => {

            let walletId = vault.addWallet("test 1");
            let wallet1 = vault.getWallet(walletId);

            expect(wallet1.name).toBe("test 1");

            vault.setWalletLabel(walletId, "Test 2");
            let wallet2 = vault.getWallet(walletId);
            expect(wallet2.name).toBe("Test 2");

            vault.setWalletLabel(walletId, "");
            let wallet3 = vault.getWallet(walletId);
            expect(wallet3.name).toBeNull();

            vault.setWalletLabel(walletId, null);
            let wallet4 = vault.getWallet(walletId);
            expect(wallet4.name).toBeNull();
        });

        test("Keep seed reserved after removing entry", () => {
            let id = vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let walletId = vault.addWallet("test seed");
            let acc: AddEntry = {
                blockchain: 100,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: id, password: "test"},
                    hdPath: "m/44'/60'/1'/0/1",
                }
            };
            let entryId = vault.addEntry(walletId, acc);
            vault.removeEntry(entryId);

            let wallets = vault.listWallets();
            let wallet = WalletsOp.of(wallets).getWallet(walletId).value;
            expect(wallet.entries.length).toBe(0);

            let reserved = WalletOp.of(wallet).getHDAccounts();
            let expReserved = {};
            expReserved[id] = [1];
            expect(reserved).toStrictEqual(expReserved)
        });
    });

    describe("Remove wallet", () => {
        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("wallet-remove")
            });
        });

        test("empty", () => {
            let walletId = vault.addWallet("test 1");
            let wallet = vault.getWallet(walletId);
            expect(wallet).toBeDefined();
            expect(wallet.name).toBe("test 1");

            vault.removeWallet(walletId);

            expect(() => {
                vault.getWallet(walletId)
            }).toThrowError("No wallet with id");
        });

        test("with entries", () => {
            let walletId = vault.addWallet("test 1");
            vault.addEntry(walletId, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            });
            vault.addEntry(walletId, {
                blockchain: 101,
                type: "raw-pk-hex",
                key: "0x0ac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            });

            let wallet = vault.getWallet(walletId);
            expect(wallet).toBeDefined();

            vault.removeWallet(walletId);

            expect(() => {
                vault.getWallet(walletId)
            }).toThrowError("No wallet with id");
        });

        test("keep others", () => {
            let walletId1 = vault.addWallet("test 1");
            vault.addEntry(walletId1, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            });

            let walletId2 = vault.addWallet("test 2");
            vault.addEntry(walletId2, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0x0ac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            });

            let wallet = vault.getWallet(walletId1);
            expect(wallet).toBeDefined();

            vault.removeWallet(walletId1);

            expect(() => {
                vault.getWallet(walletId1)
            }).toThrowError("No wallet with id");

            wallet = vault.getWallet(walletId2);
            expect(wallet).toBeDefined();
        });
    });
});