import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {AddAccount, WalletOp, WalletsOp, AccountIdOp, EthereumAccount} from "@emeraldpay/emerald-vault-core";
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

                let eth = wallets.filter((w) => w.accounts.some((a) => a.blockchain == 100));
                let etc = wallets.filter((w) => w.accounts.some((a) => a.blockchain == 101));

                expect(eth.length).toBe(2);
                expect(etc.length).toBe(1);

                expect(etc[0].accounts.length).toBe(1);
                expect(etc[0].accounts[0].address).toBe("0x5b30de96fdf94ac6c5b4a8c243f991c649d66fa1");

                eth = eth.sort((a, b) =>
                    WalletOp.of(a).getEthereumAccounts()[0].address.localeCompare(
                        WalletOp.of(b).getEthereumAccounts()[0].address
                    )
                );

                expect(eth[0].accounts[0].address).toBe("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
                expect(eth[0].name).toBe("foo bar");
                expect(eth[1].accounts[0].address).toBe("0x410891c20e253a2d284f898368860ec7ffa6153c");
            });
        });
    });

    describe("Create wallet and account", () => {

        describe("Create", () => {
            let vault: EmeraldVaultNative;
            beforeEach(() => {
                vault = new EmeraldVaultNative({
                    dir: tempPath("wallet-create")
                });
            });
            test("Create Wallet without label", () => {
                let id = vault.addWallet(undefined);
                let wallets = vault.listWallets();
                expect(wallets.length).toBeGreaterThan(0);
                let created = WalletsOp.of(wallets).getWallet(id).value;
                expect(created).toBeDefined();
                expect(created.name).toBeNull()
            });

            test("Create Wallet with empty label", () => {
                let id = vault.addWallet("");
                let wallets = vault.listWallets();
                expect(wallets.length).toBeGreaterThan(0);
                let created = WalletsOp.of(wallets).getWallet(id).value;
                expect(created).toBeDefined();
                expect(created.name).toBeNull();
            });

            test("Create Wallet", () => {
                let id = vault.addWallet("Test 1111");
                let wallets = vault.listWallets();
                expect(wallets.length).toBeGreaterThan(0);
                let created = WalletsOp.of(wallets).getWallet(id).value;
                expect(created).toBeDefined();
                expect(created.name).toBe("Test 1111");
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
                let acc: AddAccount = {
                    blockchain: 100,
                    type: "ethereum-json",
                    key: JSON.stringify(key)
                };
                let result = vault.addAccount(id, acc);

                expect(result).toBe(id + "-0");

                let wallet = WalletsOp.of(vault.listWallets()).getWallet(id).value;
                expect(wallet.accounts.length).toBe(1);
            });

            test("Create and import raw", () => {
                let id = vault.addWallet("Test 2");
                let acc: AddAccount = {
                    blockchain: 100,
                    type: "raw-pk-hex",
                    key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                    password: "test"
                };
                let result = vault.addAccount(id, acc);

                expect(result).toBe(id + "-0");
                let wallet = WalletsOp.of(vault.listWallets()).getWallet(id);
                expect(wallet.value.accounts.length).toBe(1);
                expect(wallet.getEthereumAccounts()[0].address).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");
            });

            test("Create and import 2 keys", () => {
                let id = vault.addWallet("Test 3");
                let acc1: AddAccount = {
                    blockchain: 100,
                    type: "raw-pk-hex",
                    key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                    password: "test1"
                };
                let result1 = vault.addAccount(id, acc1);
                let acc2: AddAccount = {
                    blockchain: 101,
                    type: "raw-pk-hex",
                    key: "0x7a28b5ba57c53603b0b07b56bba752f7784bf506fa95edc395f5cf6c7514fe9d",
                    password: "test2"
                };
                let result2 = vault.addAccount(id, acc2);

                expect(result1).toBe(id + "-0");
                expect(result2).toBe(id + "-1");

                let wallet = WalletsOp.of(vault.listWallets()).getWallet(id);
                expect(wallet.value.accounts.length).toBe(2);
                expect(wallet.getEthereumAccounts()[0].address).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");
                expect(wallet.getEthereumAccounts()[0].blockchain).toBe(100);
                expect(wallet.getEthereumAccounts()[1].address).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
                expect(wallet.getEthereumAccounts()[1].blockchain).toBe(101);
            });

            test("Create and import from seed", () => {
                let id = vault.addWallet("Test 3");
                let acc1: AddAccount = {
                    blockchain: 100,
                    type: "raw-pk-hex",
                    key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                    password: "test1"
                };
                let result1 = vault.addAccount(id, acc1);
                let acc2: AddAccount = {
                    blockchain: 101,
                    type: "raw-pk-hex",
                    key: "0x7a28b5ba57c53603b0b07b56bba752f7784bf506fa95edc395f5cf6c7514fe9d",
                    password: "test2"
                };
                let result2 = vault.addAccount(id, acc2);

                expect(result1).toBe(id + "-0");
                expect(result2).toBe(id + "-1");

                let wallet = WalletsOp.of(vault.listWallets()).getWallet(id);
                expect(wallet.value.accounts.length).toBe(2);
                expect(wallet.getEthereumAccounts()[0].address).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");
                expect(wallet.getEthereumAccounts()[0].blockchain).toBe(100);
                expect(wallet.getEthereumAccounts()[1].address).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
                expect(wallet.getEthereumAccounts()[1].blockchain).toBe(101);
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

        test("Keep seed reserved after removing account", () => {
            let id = vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let walletId = vault.addWallet("test seed");
            let acc: AddAccount = {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: "m/44'/60'/1'/0/1",
                    seedId: id,
                    password: "test"
                }
            };
            let accId = vault.addAccount(walletId, acc);
            vault.removeAccount(accId);

            let wallets = vault.listWallets();
            let wallet = WalletsOp.of(wallets).getWallet(walletId).value;
            expect(wallet.accounts.length).toBe(0);

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

        test("with accounts", () => {
            let walletId = vault.addWallet("test 1");
            let accountId1 = vault.addAccount(walletId, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            });
            let accountId2 = vault.addAccount(walletId, {
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
            let accountId1 = vault.addAccount(walletId1, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            });

            let walletId2 = vault.addWallet("test 2");
            let accountId2 = vault.addAccount(walletId2, {
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