import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {
    EthereumEntry,
    WalletsOp,
    WalletOp,
    EntryIdOp,
    PKRef,
    SeedPKRef,
    AddressRefOp,
    AddEntry,
    isEthereumEntry, isBitcoinEntry,
    BitcoinEntry,
    BlockchainId
} from "@emeraldpay/emerald-vault-core";
import {tempPath} from "./_commons";


describe("Entries", () => {

    describe("Details", () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("entry-details")
            });
            vault.open();
        });

        test("refers pk", async () => {
            let walletId = await vault.addWallet("wallet 1");
            let entryId = await vault.addEntry(walletId, {
                type: "generate-random",
                blockchain: 100,
                password: "test"
            });
            let wallet = await vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.key.type).toBe("pk");
            let key = entry.key as PKRef;
            expect(key.keyId).toBeDefined();
        });

        test("refers seed", async () => {
            let walletId = await vault.addWallet("wallet 1");
            let seedId = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "pepper mention magic uncover vicious spare echo fitness solid bonus phrase predict pen grow lyrics certain swallow grass rain company tuna",
                    password: null
                },
                password: "test"
            })
            let entryId = await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 100,
                key: {
                    seed: {type: "id", value: seedId, password: "test"},
                    hdPath: "m/44'/60'/0'/1/1"
                }
            });
            let wallet = await vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.key.type).toBe("hd-path");
            let key = entry.key as SeedPKRef;
            expect(key.seedId).toBe(seedId);
            expect(key.hdPath).toBe("m/44'/60'/0'/1/1");
        });

        test("set label", async () => {
            let walletId = await vault.addWallet("wallet 1");
            let entryId = await vault.addEntry(walletId, {
                type: "generate-random",
                blockchain: 100,
                password: "test"
            });
            await vault.setEntryLabel(entryId, "test entry label");
            let wallet = await vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.label).toBe("test entry label");
        });

        test("remove label", async () => {
            let walletId = await vault.addWallet("wallet 1");
            let entryId = await vault.addEntry(walletId, {
                type: "generate-random",
                blockchain: 100,
                password: "test"
            });
            await vault.setEntryLabel(entryId, "test entry label");
            let wallet = await vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.label).toBe("test entry label");

            await vault.setEntryLabel(entryId, undefined);

            wallet = await vault.getWallet(walletId);
            entry = wallet.entries[0] as EthereumEntry;
            expect(entry.label).toBeNull();
        });

        test("disable receiving", async () => {
            let walletId = await vault.addWallet("wallet 1");
            let entryId = await vault.addEntry(walletId, {
                type: "generate-random",
                blockchain: 100,
                password: "test"
            });
            let wallet = await vault.getWallet(walletId);
            let entry = wallet.entries[0];
            expect(entry.receiveDisabled).toBeFalsy();

            await vault.setEntryReceiveDisabled(entryId, true);
            wallet = await vault.getWallet(walletId);
            entry = wallet.entries[0] as EthereumEntry;
            expect(entry.receiveDisabled).toBeTruthy();
        });

        test("enable receiving", async () => {
            let walletId = await vault.addWallet("wallet 1");
            let entryId = await vault.addEntry(walletId, {
                type: "generate-random",
                blockchain: 100,
                password: "test"
            });
            let wallet = await vault.getWallet(walletId);
            let entry = wallet.entries[0];
            expect(entry.receiveDisabled).toBeFalsy();

            await vault.setEntryReceiveDisabled(entryId, true);
            wallet = await vault.getWallet(walletId);
            entry = wallet.entries[0] as EthereumEntry;
            expect(entry.receiveDisabled).toBeTruthy();

            await vault.setEntryReceiveDisabled(entryId, false);
            wallet = await vault.getWallet(walletId);
            entry = wallet.entries[0] as EthereumEntry;
            expect(entry.receiveDisabled).toBeFalsy();
        });

        test("Uses receive index on bitcoin", async () => {
            let id = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let walletId = await vault.addWallet("test seed");
            let addEntry: AddEntry = {
                blockchain: 1,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: id, password: "test"},
                    hdPath: "m/84'/0'/0'/0/1",
                }
            };
            await vault.addEntry(walletId, addEntry);
            vault.setState({
                accountIndexes: [
                    {walletId, entryId: 0, change: 0, receive: 5}
                ]
            })
            let wallets = await vault.listWallets();
            let wallet = WalletsOp.of(wallets).getWallet(walletId).value;
            let entry = wallet.entries[0] as BitcoinEntry;
            expect(entry.addresses).toEqual([
                {
                    "address": "bc1qv0upcfs7j20xu83z9kmh7gvd7hfexdmnd37yxs",
                    "hdPath": "m/84'/0'/0'/0/5",
                    "role": "receive"
                }
            ]);
        })
    });

    describe("List", () => {

        describe('Migrate vault 0.10.1', () => {

            let vault: EmeraldVaultNative;
            beforeAll(() => {
                vault = new EmeraldVaultNative({
                    dir: "./testdata/vault-0.10.1-migrate"
                });
                vault.open();
            });

            test("list eth", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(100);
                expect(entries.length).toBe(0);
            });

            test("list etc", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(101)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));
                expect(entries.length).toBe(2);
                expect(entries[0].address.value).toBe("0x410891c20e253a2d284f898368860ec7ffa6153c");
                expect(entries[0].receiveDisabled).toBeFalsy();
                expect(entries[1].address.value).toBe("0x5b30de96fdf94ac6c5b4a8c243f991c649d66fa1");
                expect(entries[1].receiveDisabled).toBeFalsy();
            });

            test("list kovan", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(10002)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));
                expect(entries.length).toBe(0);
            });

        });

        describe('Migrate vault 0.26 with ledger', () => {

            let vault;
            beforeAll(() => {
                vault = new EmeraldVaultNative({
                    dir: "./testdata/vault-0.26-ledger"
                });
                vault.open();
            });

            test("list eth", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(100)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));

                expect(entries.length).toBe(3);
                expect(entries[0].address.value).toBe("0x3EAF0B987B49C4D782EE134FDC1243FD0CCDFDD3".toLowerCase());
                expect(entries[0].receiveDisabled).toBeFalsy();
                expect(entries[1].address.value).toBe("0x410891C20E253A2D284F898368860EC7FFA6153C".toLowerCase());
                expect(entries[1].receiveDisabled).toBeFalsy();
                expect(entries[2].address.value).toBe("0xBD5222391BBB9F17484F2565455FB6610D9E145F".toLowerCase());
                expect(entries[2].receiveDisabled).toBeFalsy();
            });

            test("list etc", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(101)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));
                expect(entries[0].address.value).toBe("0x5B30DE96FDF94AC6C5B4A8C243F991C649D66FA1".toLowerCase());
            });

            test("list kovan", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(10002)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));
                expect(entries.length).toBe(0);
            });

        });

        describe('Test vault 0.26 basic', () => {

            let vault;
            beforeAll(() => {
                vault = new EmeraldVaultNative({
                    dir: "./testdata/vault-0.26-basic"
                });
                vault.open();
            });

            test("list eth", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(100)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));
                expect(entries.length).toBe(2);
                expect(entries[0].address.value).toBe("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
                expect(entries[0].receiveDisabled).toBeFalsy();
                expect(entries[1].address.value).toBe("0x410891c20e253a2d284f898368860ec7ffa6153c");
                expect(entries[1].receiveDisabled).toBeFalsy();

                let entry = wallets.findWalletByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3").value;
                expect(entry.name).toBe("foo bar");
                // expect(entries[0].description).toBe("teßt entry #1");
            });

            test("list etc", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(101)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));
                expect(entries.length).toBe(1);
                expect(entries[0].address.value).toBe("0x5b30de96fdf94ac6c5b4a8c243f991c649d66fa1");
            });

            test("list kovan", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(10002)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));
                expect(entries.length).toBe(0);
            });

        });

        describe('Test default dir', () => {

            let vault;
            beforeAll(() => {
                vault = new EmeraldVaultNative();
            });

            test("list etc", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(100)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));
                // console.log("entries", entries);
            });

            test("list eth", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(101)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));
                // console.log("entries", entries);
            });

            test("list kovan", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(10002)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));
                // console.log("entries", entries);
            });

        });

        describe('Test vault 0.26 with Snappy compression', () => {

            let vault;
            beforeAll(() => {
                vault = new EmeraldVaultNative({
                    dir: "./testdata/vault-0.26-snappy"
                });
                vault.open();
            });

            test("list etc", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let entries = wallets.entriesByBlockchain(101)
                    .sort((a, b) => AddressRefOp.of(a.address).compareTo(b.address));
                expect(entries.length).toBe(2);
                expect(entries[0].address.value).toBe("0x1e728c6d055380b69ac1c0fdc27425158621f109");
                expect(entries[1].address.value).toBe("0xca1c2e76f2122fdda9f97da0c4e37674727645cc");
            });

        });
    });

    describe("Export", () => {
        describe('Test export JSON', () => {

            let vault: EmeraldVaultNative;
            beforeAll(() => {
                vault = new EmeraldVaultNative({
                    dir: tempPath("export-json")
                });
            });

            test("errors for unknown entry", (done) => {
                let walletCreated = false;
                vault.addWallet("test").then((walletId) => {
                    walletCreated = true;
                    return vault.exportJsonPk(EntryIdOp.create(walletId, 0).value, "none")
                })
                    .then(() => done.fail())
                    .catch(() => {
                        if (!walletCreated) {
                            done.fail("not created")
                        } else {
                            done()
                        }
                    });
            });

            test("import & export 6412c428", async () => {
                let data = {
                    "version": 3,
                    "id": "305f4853-80af-4fa6-8619-6f285e83cf28",
                    "address": "6412c428fc02902d137b60dc0bd0f6cd1255ea99",
                    "name": "Hello",
                    "description": "World!!!!",
                    "visible": true,
                    "crypto": {
                        "cipher": "aes-128-ctr",
                        "cipherparams": {"iv": "e4610fb26bd43fa17d1f5df7a415f084"},
                        "ciphertext": "dc50ab7bf07c2a793206683397fb15e5da0295cf89396169273c3f49093e8863",
                        "kdf": "scrypt",
                        "kdfparams": {
                            "dklen": 32,
                            "salt": "86c6a8857563b57be9e16ad7a3f3714f80b714bcf9da32a2788d695a194f3275",
                            "n": 1024,
                            "r": 8,
                            "p": 1
                        },
                        "mac": "8dfedc1a92e2f2ca1c0c60cd40fabb8fb6ce7c05faf056281eb03e0a9996ecb0"
                    }
                };
                let walletId = await vault.addWallet("test");
                let entryId = await vault.addEntry(walletId, {
                    blockchain: 100,
                    type: "ethereum-json",
                    key: JSON.stringify(data)
                });

                let current = JSON.parse(await vault.exportJsonPk(entryId));
                expect(current).toBeDefined();
                expect(current.address).toBe("6412c428fc02902d137b60dc0bd0f6cd1255ea99")
            });

        });

        describe('Test export from vault-0.26', () => {

            let vault: EmeraldVaultNative;
            beforeAll(() => {
                vault = new EmeraldVaultNative({
                    dir: "./testdata/vault-0.26-basic"
                });
                vault.open();
            });

            test("export 6412c428", async () => {
                let wallets = WalletsOp.of(await vault.listWallets());
                let wallet = wallets.findWalletByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
                expect(wallet).toBeDefined();
                expect(wallet.value.name).toBe("foo bar");
                let entry = wallet.findEntryByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
                expect(entry).toBeDefined();

                let current = JSON.parse(await vault.exportJsonPk(entry.id, "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3"));
                expect(current.address).toBe("3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
            });

        });
    });

    describe("Import JSON", () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/tmp-import-json"
            });
        });

        test("import scrypt - 6412c428", async () => {
            let data = {
                "version": 3,
                "id": "305f4853-80af-4fa6-8619-6f285e83cf28",
                "address": "6412c428fc02902d137b60dc0bd0f6cd1255ea99",
                "name": "Hello",
                "description": "World!!!!",
                "visible": true,
                "crypto": {
                    "cipher": "aes-128-ctr",
                    "cipherparams": {"iv": "e4610fb26bd43fa17d1f5df7a415f084"},
                    "ciphertext": "dc50ab7bf07c2a793206683397fb15e5da0295cf89396169273c3f49093e8863",
                    "kdf": "scrypt",
                    "kdfparams": {
                        "dklen": 32,
                        "salt": "86c6a8857563b57be9e16ad7a3f3714f80b714bcf9da32a2788d695a194f3275",
                        "n": 1024,
                        "r": 8,
                        "p": 1
                    },
                    "mac": "8dfedc1a92e2f2ca1c0c60cd40fabb8fb6ce7c05faf056281eb03e0a9996ecb0"
                }
            };

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let entry = (await vault.getWallet(walletId)).entries[0] as EthereumEntry;

            expect(entry.address.value).toBe("0x6412c428fc02902d137b60dc0bd0f6cd1255ea99");
            expect(entry.receiveDisabled).toBeFalsy();
        });

        test("import scrypt - c2d7cf95", async () => {
            // https://theethereum.wiki/w/index.php/Accounts,_Addresses,_Public_And_Private_Keys,_And_Tokens
            let data = {
                "address": "c2d7cf95645d33006175b78989035c7c9061d3f9",
                "crypto": {
                    "cipher": "aes-128-ctr",
                    "ciphertext": "0f6d343b2a34fe571639235fc16250823c6fe3bc30525d98c41dfdf21a97aedb",
                    "cipherparams": {
                        "iv": "cabce7fb34e4881870a2419b93f6c796"
                    },
                    "kdf": "scrypt",
                    "kdfparams": {
                        "dklen":32,
                        "n":262144,
                        "p": 1,
                        "r": 8,
                        "salt": "1af9c4a44cf45fe6fb03dcc126fa56cb0f9e81463683dd6493fb4dc76edddd51"
                    },
                    "mac": "5cf4012fffd1fbe41b122386122350c3825a709619224961a16e908c2a366aa6"
                },
                "id": "eddd71dd-7ad6-4cd3-bc1a-11022f7db76c",
                "version": 3
            };

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 101,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let entry = (await vault.getWallet(walletId)).entries[0] as EthereumEntry;
            expect(entry.address.value).toBe("0xc2d7cf95645d33006175b78989035c7c9061d3f9");
        });

        //TODO
        xtest("import scrypt - no address", async () => {
            // https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
            let data = {
                "crypto": {
                    "cipher": "aes-128-ctr",
                    "cipherparams": {
                        "iv": "83dbcc02d8ccb40e466191a123791e0e"
                    },
                    "ciphertext": "d172bf743a674da9cdad04534d56926ef8358534d458fffccd4e6ad2fbde479c",
                    "kdf": "scrypt",
                    "kdfparams": {
                        "dklen" : 32,
                        "n" : 262144,
                        "p": 8,
                        "r": 1,
                        "salt": "ab0c7876052600dd703518d6fc3fe8984592145b591fc8fb5c6d43190334ba19"
                    },
                    "mac": "2103ac29920d71da29f15d75b4a16dbe95cfd7ff8faea1056c33131d846e3097"
                },
                "id": "3198bc9c-6672-5ab3-d995-4942343ae5b6",
                "version": 3
            };

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let entry = (await vault.getWallet(walletId)).entries[0] as EthereumEntry;

            expect(entry.address.value).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        });

        test("import pbkdf2 - c2d7cf95", async () => {
            //https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
            let data = {
                "address": "008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
                "crypto": {
                    "cipher": "aes-128-ctr",
                    "cipherparams": {
                        "iv": "6087dab2f9fdbbfaddc31a909735c1e6"
                    },
                    "ciphertext": "5318b4d5bcd28de64ee5559e671353e16f075ecae9f99c7a79a38af5f869aa46",
                    "kdf": "pbkdf2",
                    "kdfparams" : {
                        "c" : 262144,
                        "dklen": 32,
                        "prf": "hmac-sha256",
                        "salt": "ae3cd4e7013836a3df6bd7241b12db061dbe2c6785853cce422d148a624ce0bd"
                    },
                    "mac": "517ead924a9d0dc3124507e3393d175ce3ff7c1e96529c6c555ce9e51205e9b2"
                },
                "id": "3198bc9c-6672-5ab3-d995-4942343ae5b6",
                "version": 3
            };

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 101,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let entry = (await vault.getWallet(walletId)).entries[0] as EthereumEntry;
            expect(entry.address.value).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        })
    });

    describe("Import PK", () => {
        let vault;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/tmp-import-pk"
            });
        });

        test("import 0xfac192ce", async () => {
            let walletId = await vault.addWallet("import 1");
            let entryId = await vault.addEntry(walletId, {
                type: "raw-pk-hex",
                blockchain: 100,
                key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            });
            let wallet = await vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.address.value).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");

            let tx1 = await vault.signTx(entryId, {
                from: "0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4",
                to: "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
                gas: "0x5208",
                gasPrice: "0x98BCA5A00",
                value: "0xA688906BD8B00000",
                nonce: "0x0",
            }, "test");

            expect(tx1).toBe("0xf86c8085098bca5a0082520894008aeeda4d805471df9b2a5b0f38a0c3bcba786b88a688906bd8b000008025a04da6c6e9d6f3179f624b189e70115e4b30d98c396c517da0ca8a33e36719fd1aa0495f151d4229aa79f4b8213096f56ae430cf093d66efc72ef48997f1d44d5ba3");
        });

        test("import 0xfac192ce - no prefix", async () => {
            let walletId = await vault.addWallet("import 1");
            let entryId = await vault.addEntry(walletId, {
                type: "raw-pk-hex",
                blockchain: 100,
                key: "fac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            });
            let wallet = await vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.address.value).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");

            let tx1 = await vault.signTx(entryId, {
                from: "0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4",
                to: "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
                gas: "0x5208",
                gasPrice: "0x98BCA5A00",
                value: "0xA688906BD8B00000",
                nonce: "0x0",
            }, "test");

            expect(tx1).toBe("0xf86c8085098bca5a0082520894008aeeda4d805471df9b2a5b0f38a0c3bcba786b88a688906bd8b000008025a04da6c6e9d6f3179f624b189e70115e4b30d98c396c517da0ca8a33e36719fd1aa0495f151d4229aa79f4b8213096f56ae430cf093d66efc72ef48997f1d44d5ba3");
        });

        test("import 0xf06d69cd, sign with data", async () => {
            let walletId = await vault.addWallet("import 1");
            let entryId = await vault.addEntry(walletId, {
                type: "raw-pk-hex",
                blockchain: 100,
                key: "0xf06d69cdc7da0faffb1008270bca38f5e31891a3a773950e6d0fea48a7188551",
                password: "test"
            });
            let wallet = await vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.address.value).toBe("0xdb365e2b984128f5d187dbc8df1f947aa6e03361");

            let tx1 = await vault.signTx(entryId, {
                from: "0xdb365e2b984128f5d187dbc8df1f947aa6e03361",
                to: "0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4",
                gas: "0x1D8A8",
                gasPrice: "0x98BCA5A00",
                value: "0x33674060180C000",
                nonce: "0x0",
                data: "0x0158195989105810"
            }, "test");

            expect(tx1).toBe("0xf8758085098bca5a008301d8a894041b7ca652aa25e5be5d2053d7c7f96b5f7563d488033674060180c00088015819598910581026a0ad3bf903d8bb63f3dd467ba8edde3a990931b5f560dc478aeb57c77853c4c696a0536f01724eabeb68479429691e1a3d19e683f01b3f85d49b3bbd3c758ad597b0");
        });

    });

    describe("Export PK", () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("export-pk")
            });
        });

        test("import and export pk, 0xfac192ce", async () => {
            let data = {
                pk: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            };
            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: data.pk,
                password: data.password
            });
            let pk = await vault.exportRawPk(entryId, "test");

            expect(pk).toBe("0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd");
        });

        test("import and export pbkdf2", async () => {
            // https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
            let data = {
                "address": "008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
                "crypto": {
                    "cipher": "aes-128-ctr",
                    "cipherparams": {
                        "iv": "6087dab2f9fdbbfaddc31a909735c1e6"
                    },
                    "ciphertext": "5318b4d5bcd28de64ee5559e671353e16f075ecae9f99c7a79a38af5f869aa46",
                    "kdf": "pbkdf2",
                    "kdfparams" : {
                        "c": 262144,
                        "dklen": 32,
                        "prf": "hmac-sha256",
                        "salt": "ae3cd4e7013836a3df6bd7241b12db061dbe2c6785853cce422d148a624ce0bd"
                    },
                    "mac": "517ead924a9d0dc3124507e3393d175ce3ff7c1e96529c6c555ce9e51205e9b2"
                },
                "id": "3198bc9c-6672-5ab3-d995-4942343ae5b6",
                "version": 3
            };
            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let pk = await vault.exportRawPk(entryId, "testpassword");

            expect(pk).toBe("0x7a28b5ba57c53603b0b07b56bba752f7784bf506fa95edc395f5cf6c7514fe9d");
        });

        test("import and export scrypt", async () => {
            let data = {
                "version": 3,
                "id": "1d098815-15b2-42da-9bd6-e549396a3a4d",
                "address": "3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                "name": "",
                "description": "",
                "visible": true,
                "crypto": {
                    "cipher": "aes-128-ctr",
                    "cipherparams": {"iv": "07d2a1660d8d02f0dbf55578044bb2b7"},
                    "ciphertext": "91cc591b18f6a9b115555990db18f647ed828dad30cdf7e3493e2eb0a1f80514",
                    "kdf": "scrypt",
                    "kdfparams": {
                        "dklen": 32,
                        "salt": "8c20d18ae12d11128aad057e37dd840a695b60c22ef020fae1827308a6bdf485",
                        "n": 1024,
                        "r": 8,
                        "p": 1
                    },
                    "mac": "a37f95a2e5726c45c88153dad4d88b58acf72655c173bf2f0f0444a3b42b4790"
                }
            };

            let walletId = await vault.addWallet("test");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let pk = await vault.exportRawPk(entryId, "testtest");

            expect(pk).toBe("0xad901ebb27a07ca54ffe797b24f602bdd600f300283c02a0b58b7c0567f12234");
        });
    });

    describe("Remove", () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("remove")
            });
        });

        test("errors for invalid address", (done) => {
            vault.removeEntry("3198bc9c-6672-5ab3-d995-4942343ae5b6-1")
                .then(() => done.fail())
                .catch(() => done());
        });

        test("import and delete", async () => {
            let data = {
                "address": "008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
                "crypto": {
                    "cipher": "aes-128-ctr",
                    "cipherparams": {
                        "iv": "6087dab2f9fdbbfaddc31a909735c1e6"
                    },
                    "ciphertext": "5318b4d5bcd28de64ee5559e671353e16f075ecae9f99c7a79a38af5f869aa46",
                    "kdf": "pbkdf2",
                    "kdfparams": {
                        "c" : 262144,
                        "dklen": 32,
                        "prf": "hmac-sha256",
                        "salt": "ae3cd4e7013836a3df6bd7241b12db061dbe2c6785853cce422d148a624ce0bd"
                    },
                    "mac": "517ead924a9d0dc3124507e3393d175ce3ff7c1e96529c6c555ce9e51205e9b2"
                },
                "id": "3198bc9c-6672-5ab3-d995-4942343ae5b6",
                "version": 3
            };

            let walletId = await vault.addWallet("test 1");
            let entryId = await vault.addEntry(walletId, {
                type: "ethereum-json",
                key: JSON.stringify(data),
                blockchain: 101
            });

            let wallet = await vault.getWallet(walletId);

            expect(wallet).toBeDefined();
            expect(wallet.entries.length).toBe(1);
            expect(wallet.entries[0].blockchain).toBe(101);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.address.value).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");

            let removed = await vault.removeEntry(entry.id);
            expect(removed).toBeTruthy();

            let wallet2 = await vault.getWallet(walletId);
            // expect(wallet2).toBeUndefined();
            expect(wallet2.entries.length).toBe(0);
        });

    });

    describe("Create from seed", () => {
        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("seed-entry")
            });
        });

        test("Create ethereum", async () => {
            let id = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let walletId = await vault.addWallet("test seed");
            let addEntry: AddEntry = {
                blockchain: 100,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: id, password: "test"},
                    hdPath: "m/44'/60'/0'/0/1",
                }
            };
            let accId = await vault.addEntry(walletId, addEntry);
            let wallets = await vault.listWallets();
            let wallet = WalletsOp.of(wallets).getWallet(walletId).value;
            expect(wallet.entries.length).toBe(1);
            expect(wallet.entries[0].blockchain).toBe(100);
            expect(wallet.entries[0].receiveDisabled).toBeFalsy();
            expect(isEthereumEntry(wallet.entries[0])).toBeTruthy();
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.address.value).toBe("0xb4BbAaC4Acd7E86AF282e80C7a62fda78D071950".toLowerCase());
            let reserved = WalletOp.of(wallet).getHDAccounts();
            let expReserved = {};
            expReserved[id] = [0];
            expect(reserved).toStrictEqual(expReserved)

            // let key = wallet.entries[0].key as SeedPKRef;
            // expect(key.hdPath).toBe("m/44'/60'/0'/0/1");
        })

        test("Create bitcoin", async () => {
            let id = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let walletId = await vault.addWallet("test seed");
            let addEntry: AddEntry = {
                blockchain: 1,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: id, password: "test"},
                    hdPath: "m/84'/0'/0'/0/1",
                }
            };
            let accId = await vault.addEntry(walletId, addEntry);
            let wallets = await vault.listWallets();
            let wallet = WalletsOp.of(wallets).getWallet(walletId).value;
            expect(wallet.entries.length).toBe(1);
            expect(wallet.entries[0].blockchain).toBe(1);
            expect(wallet.entries[0].receiveDisabled).toBeFalsy();

            expect(isBitcoinEntry(wallet.entries[0])).toBeTruthy();
            let entry = wallet.entries[0] as BitcoinEntry;

            expect(entry.address).toBeDefined();
            expect(entry.address.type).toBe("xpub");
            expect(entry.address.value).toBe("zpub6rgquuQgjiNdUjkU7qZck9t3JU5K9U9EG2aVAwzDy2BJKHKMekVNsyZF2e4dw9L9AoT9WHy5iDVdUHz2XkrANy5LRVGLt3XMkar752N2hvq")

            let reserved = WalletOp.of(wallet).getHDAccounts();
            let expReserved = {};
            expReserved[id] = [0];
            expect(reserved).toStrictEqual(expReserved);

            expect(entry.addresses).toEqual([
                {
                    "address": "bc1qxqz4qerrm662nt4hxh39mqltvqcffcvzzfc49z",
                    "hdPath": "m/84'/0'/0'/0/0",
                    "role": "receive"
                }
            ]);
            expect(entry.xpub).toEqual([
                {
                    "xpub": "zpub6sXHdUYpJWwCnjiAafTAeNr2qKuL9pfgKce4bzWRTEZd3eWcNbAHrx3Uo44r3Q7SkenhqnTavxXc2y2pytMJLQQSTvU9Ge5cjTUGmWg57e6",
                    "role": "receive"
                },
                {
                    "xpub": "zpub6sXHdUYpJWwCqyDaxzmDaJ1GVxz392nQwEnCbx1E1LLqbq9SBL63YDaN3z6K2rCNjxcVgm54m8E9NRzo1vfTVLvo6mg3CMyH8jcg72vixuQ",
                    "role": "change"
                }
            ])
        });

        test("Get bitcoin addresses", async () => {
            let id = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let walletId = await vault.addWallet("test seed");
            let addEntry: AddEntry = {
                blockchain: 1,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: id, password: "test"},
                    hdPath: "m/84'/0'/0'/0/1",
                }
            };
            let entryId = await vault.addEntry(walletId, addEntry);
            let addresses = await vault.listEntryAddresses(entryId, "receive", 0, 7);
            expect(addresses).toEqual([
                {
                    "address": "bc1qxqz4qerrm662nt4hxh39mqltvqcffcvzzfc49z",
                    "hdPath": "m/84'/0'/0'/0/0",
                    "role": "receive"
                },
                {
                    "address": "bc1qj4zhepcsjp6gpqf252329daum6ey6hhqagccaf",
                    "hdPath": "m/84'/0'/0'/0/1",
                    "role": "receive"
                },
                {
                    "address": "bc1qnuy60h2qq7zjmj929nha54hcmpveqj6cj07sa6",
                    "hdPath": "m/84'/0'/0'/0/2",
                    "role": "receive"
                },
                {
                    "address": "bc1q6cd2ytka6huf7g4mwg3yus3nzck89c86ngr9pj",
                    "hdPath": "m/84'/0'/0'/0/3",
                    "role": "receive"
                },
                {
                    "address": "bc1qn2w44323gc0v9j6ss7flg0cv0tzfm0p3ptysr0",
                    "hdPath": "m/84'/0'/0'/0/4",
                    "role": "receive"
                },
                {
                    "address": "bc1qv0upcfs7j20xu83z9kmh7gvd7hfexdmnd37yxs",
                    "hdPath": "m/84'/0'/0'/0/5",
                    "role": "receive"
                },
                {
                    "address": "bc1q8jh9ytqthp0460zx956ycce0n0fu5hvtsxhuxe",
                    "hdPath": "m/84'/0'/0'/0/6",
                    "role": "receive"
                }
            ]);

            let addresses2 = await vault.listEntryAddresses(entryId, "change", 2, 3);
            expect(addresses2).toEqual([
                {
                    "address": "bc1qdqtpvw9e4f6cma0rd0cpd39vgyel56kwkcen9m",
                    "hdPath": "m/84'/0'/0'/1/2",
                    "role": "change"
                },
                {
                    "address": "bc1qltrzz23vvd7c34fha2622yz86qmus4mjqsumkp",
                    "hdPath": "m/84'/0'/0'/1/3",
                    "role": "change"
                },
                {
                    "address": "bc1q27wcjrxex9dewp3cykg43nm9x82v6fjexchvzt",
                    "hdPath": "m/84'/0'/0'/1/4",
                    "role": "change"
                },
            ]);

        });

        test("Get bitcoin addresses - acc 3", async () => {
            let id = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let walletId = await vault.addWallet("test seed");
            let addEntry: AddEntry = {
                blockchain: 1,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: id, password: "test"},
                    hdPath: "m/84'/0'/3'/0/1",
                }
            };
            let entryId = await vault.addEntry(walletId, addEntry);
            let addresses = await vault.listEntryAddresses(entryId, "receive", 0, 3);
            expect(addresses).toEqual([
                {
                    "address": "bc1qd2zly9rxs2th8m63mcdtjvz6rspz8us0vdk9j3",
                    "hdPath": "m/84'/0'/3'/0/0",
                    "role": "receive"
                },
                {
                    "address": "bc1qe5j8mlep8s5sr0ymfqh7ghhg7w7tqce8ykawy7",
                    "hdPath": "m/84'/0'/3'/0/1",
                    "role": "receive"
                },
                {
                    "address": "bc1qrd9vmkjfl8u4evsgk2way29pyackz36y03xur5",
                    "hdPath": "m/84'/0'/3'/0/2",
                    "role": "receive"
                },
            ]);

            let addresses2 = await vault.listEntryAddresses(entryId, "change", 0, 3);
            expect(addresses2).toEqual([
                {
                    "address": "bc1q77p5rars35ka0zg964xggwdkjnf9nvqf4q4guu",
                    "hdPath": "m/84'/0'/3'/1/0",
                    "role": "change"
                },
                {
                    "address": "bc1qyvjdkqs74skz6ypdc4wpayc307jjkzj809tsgg",
                    "hdPath": "m/84'/0'/3'/1/1",
                    "role": "change"
                },
                {
                    "address": "bc1qmx07wew39njjyv8gn0907kxx5whzmvdrg5zphu",
                    "hdPath": "m/84'/0'/3'/1/2",
                    "role": "change"
                },
            ]);

        });

        test("Create bitcoin - acc 2", async () => {
            let id = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let walletId = await vault.addWallet("test seed");
            let addEntry: AddEntry = {
                blockchain: 1,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: id, password: "test"},
                    hdPath: "m/84'/0'/2'/0/1",
                }
            };
            let accId = await vault.addEntry(walletId, addEntry);
            let wallets = await vault.listWallets();
            let wallet = WalletsOp.of(wallets).getWallet(walletId).value;
            expect(wallet.entries.length).toBe(1);
            expect(wallet.entries[0].blockchain).toBe(1);
            expect(wallet.entries[0].receiveDisabled).toBeFalsy();

            expect(isBitcoinEntry(wallet.entries[0])).toBeTruthy();
            let entry = wallet.entries[0] as BitcoinEntry;

            expect(entry.address).toBeDefined();
            expect(entry.address.type).toBe("xpub");
            expect(entry.address.value).toBe("zpub6rgquuQgjiNdbjGmbMT98k1CtY7bBAQYRkLypM8KPBjiK6Dwqqq4ePDx2Xp5PZ8AzjUxrzZbrhYW2vy4QnJA5iYwxsmzThe5JzAMD6xDY1D")

            let reserved = WalletOp.of(wallet).getHDAccounts();
            let expReserved = {};
            expReserved[id] = [2];
            expect(reserved).toStrictEqual(expReserved);

            expect(entry.addresses).toEqual([
                {
                    "address": "bc1q74z03fz8lhy87zx3gfwu4k3t57yew2yefreakn",
                    "hdPath": "m/84'/0'/2'/0/0",
                    "role": "receive"
                }
            ]);
            expect(entry.xpub).toEqual([
                {
                    "xpub": "zpub6sFWF5HYGtpUCYb2CWGzYNLE7iEV9EDSTBXX8GP8Sq9XReGGGZYgGAhxbjT5n4omfegYRdr6VMGBNte8zYGZBB2xjPBGturjDTNqibUfdMU",
                    "role": "receive"
                },
                {
                    "xpub": "zpub6sFWF5HYGtpUFaaFXRbKLRjDrQycNQPqvQeUjw476oMaRL1c9m2NNqTCTuoMX6C3eLGfKSidx1RCZk7NAoaDd1MbfUmEyCnVAzpWG8gRm6g",
                    "role": "change"
                }
            ])
        });

        test("Create testnet bitcoin", async () => {
            let id = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let walletId = await vault.addWallet("test seed");
            let addEntry: AddEntry = {
                blockchain: BlockchainId.BITCOIN_TESTNET,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: id, password: "test"},
                    hdPath: "m/84'/1'/0'/0/1",
                }
            };
            let entryId = await vault.addEntry(walletId, addEntry);
            let wallets = await vault.listWallets();
            let wallet = WalletsOp.of(wallets).getWallet(walletId).value;
            expect(wallet.entries.length).toBe(1);
            expect(wallet.entries[0].blockchain).toBe(10003);
            expect(wallet.entries[0].receiveDisabled).toBeFalsy();

            expect(isBitcoinEntry(wallet.entries[0])).toBeTruthy();
            let entry = wallet.entries[0] as BitcoinEntry;

            expect(entry.address).toBeDefined();
            expect(entry.address.type).toBe("xpub");
            expect(entry.address.value).toBe("vpub5YGnqbekLbxqX6ZSAVY9KNwAiLraqvMUqzHDzKUKAD2XBFN2Lgk7DqLSroEwDt2KWna3ZYvAdbok7LVrFuvkefh71Ck4CxhapMg9qK1rxGr")

            let reserved = WalletOp.of(wallet).getHDAccounts();
            let expReserved = {};
            expReserved[id] = [0];
            expect(reserved).toStrictEqual(expReserved);

            expect(entry.addresses).toEqual([
                {
                    "address": "tb1qqc860epsueh8zzhx9r8p4e5zk8z09zcm3l47u6",
                    "hdPath": "m/84'/1'/0'/0/0",
                    "role": "receive"
                }
            ]);
        });
    });

});