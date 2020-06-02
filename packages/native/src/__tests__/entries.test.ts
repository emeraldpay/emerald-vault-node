import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {EthereumEntry, WalletsOp, WalletOp, EntryIdOp, PKRef, SeedPKRef} from "@emeraldpay/emerald-vault-core";
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

        test("refers pk", () => {
            let walletId = vault.addWallet("wallet 1");
            let entryId = vault.addEntry(walletId, {
                type: "generate-random",
                blockchain: 100,
                password: "test"
            });
            let wallet = vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.key.type).toBe("pk");
            let key = entry.key as PKRef;
            expect(key.keyId).toBeDefined();
        });

        test("refers seed", () => {
            let walletId = vault.addWallet("wallet 1");
            let seedId = vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "pepper mention magic uncover vicious spare echo fitness solid bonus phrase predict pen grow lyrics certain swallow grass rain company tuna",
                    password: null
                },
                password: "test"
            })
            let entryId = vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 100,
                key: {
                    seedId: seedId,
                    hdPath: "m/44'/60'/0'/1/1",
                    password: "test"
                }
            });
            let wallet = vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.key.type).toBe("hd-path");
            let key = entry.key as SeedPKRef;
            expect(key.seedId).toBe(seedId);
            expect(key.hdPath).toBe("m/44'/60'/0'/1/1");
        });

        test("set label", () => {
            let walletId = vault.addWallet("wallet 1");
            let entryId = vault.addEntry(walletId, {
                type: "generate-random",
                blockchain: 100,
                password: "test"
            });
            vault.setEntryLabel(entryId, "test entry label");
            let wallet = vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.label).toBe("test entry label");
        });

        test("remove label", () => {
            let walletId = vault.addWallet("wallet 1");
            let entryId = vault.addEntry(walletId, {
                type: "generate-random",
                blockchain: 100,
                password: "test"
            });
            vault.setEntryLabel(entryId, "test entry label");
            let wallet = vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.label).toBe("test entry label");

            vault.setEntryLabel(entryId, undefined);

            wallet = vault.getWallet(walletId);
            entry = wallet.entries[0] as EthereumEntry;
            expect(entry.label).toBeNull();
        });

        test("disable receiving", () => {
            let walletId = vault.addWallet("wallet 1");
            let entryId = vault.addEntry(walletId, {
                type: "generate-random",
                blockchain: 100,
                password: "test"
            });
            let wallet = vault.getWallet(walletId);
            let entry = wallet.entries[0];
            expect(entry.receiveDisabled).toBeFalsy();

            vault.setEntryReceiveDisabled(entryId, true);
            wallet = vault.getWallet(walletId);
            entry = wallet.entries[0] as EthereumEntry;
            expect(entry.receiveDisabled).toBeTruthy();
        });

        test("enable receiving", () => {
            let walletId = vault.addWallet("wallet 1");
            let entryId = vault.addEntry(walletId, {
                type: "generate-random",
                blockchain: 100,
                password: "test"
            });
            let wallet = vault.getWallet(walletId);
            let entry = wallet.entries[0];
            expect(entry.receiveDisabled).toBeFalsy();

            vault.setEntryReceiveDisabled(entryId, true);
            wallet = vault.getWallet(walletId);
            entry = wallet.entries[0] as EthereumEntry;
            expect(entry.receiveDisabled).toBeTruthy();

            vault.setEntryReceiveDisabled(entryId, false);
            wallet = vault.getWallet(walletId);
            entry = wallet.entries[0] as EthereumEntry;
            expect(entry.receiveDisabled).toBeFalsy();
        });

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

            test("list eth", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(100);
                expect(entries.length).toBe(0);
            });

            test("list etc", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(101)
                    .sort((a, b) => a.address.localeCompare(b.address));
                expect(entries.length).toBe(2);
                expect(entries[0].address).toBe("0x410891c20e253a2d284f898368860ec7ffa6153c");
                expect(entries[0].receiveDisabled).toBeFalsy();
                expect(entries[1].address).toBe("0x5b30de96fdf94ac6c5b4a8c243f991c649d66fa1");
                expect(entries[1].receiveDisabled).toBeFalsy();
            });

            test("list kovan", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(10002)
                    .sort((a, b) => a.address.localeCompare(b.address));
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

            test("list eth", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(100)
                    .sort((a, b) => a.address.localeCompare(b.address));

                expect(entries.length).toBe(3);
                expect(entries[0].address).toBe("0x3EAF0B987B49C4D782EE134FDC1243FD0CCDFDD3".toLowerCase());
                expect(entries[0].receiveDisabled).toBeFalsy();
                expect(entries[1].address).toBe("0x410891C20E253A2D284F898368860EC7FFA6153C".toLowerCase());
                expect(entries[1].receiveDisabled).toBeFalsy();
                expect(entries[2].address).toBe("0xBD5222391BBB9F17484F2565455FB6610D9E145F".toLowerCase());
                expect(entries[2].receiveDisabled).toBeFalsy();
            });

            test("list etc", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(101)
                    .sort((a, b) => a.address.localeCompare(b.address));
                expect(entries[0].address).toBe("0x5B30DE96FDF94AC6C5B4A8C243F991C649D66FA1".toLowerCase());
            });

            test("list kovan", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(10002)
                    .sort((a, b) => a.address.localeCompare(b.address));
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

            test("list eth", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(100)
                    .sort((a, b) => a.address.localeCompare(b.address));
                expect(entries.length).toBe(2);
                expect(entries[0].address).toBe("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
                expect(entries[0].receiveDisabled).toBeFalsy();
                expect(entries[1].address).toBe("0x410891c20e253a2d284f898368860ec7ffa6153c");
                expect(entries[1].receiveDisabled).toBeFalsy();

                let entry = wallets.findWalletByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3").value;
                expect(entry.name).toBe("foo bar");
                // expect(entries[0].description).toBe("teßt entry #1");
            });

            test("list etc", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(101)
                    .sort((a, b) => a.address.localeCompare(b.address));
                expect(entries.length).toBe(1);
                expect(entries[0].address).toBe("0x5b30de96fdf94ac6c5b4a8c243f991c649d66fa1");
            });

            test("list kovan", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(10002)
                    .sort((a, b) => a.address.localeCompare(b.address));
                expect(entries.length).toBe(0);
            });

        });

        describe('Test default dir', () => {

            let vault;
            beforeAll(() => {
                vault = new EmeraldVaultNative();
            });

            test("list etc", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(100)
                    .sort((a, b) => a.address.localeCompare(b.address));
                // console.log("entries", entries);
            });

            test("list eth", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(101)
                    .sort((a, b) => a.address.localeCompare(b.address));
                // console.log("entries", entries);
            });

            test("list kovan", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(10002)
                    .sort((a, b) => a.address.localeCompare(b.address));
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

            test("list etc", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let entries = wallets.entriesByBlockchain(101)
                    .sort((a, b) => a.address.localeCompare(b.address));
                expect(entries.length).toBe(2);
                expect(entries[0].address).toBe("0x1e728c6d055380b69ac1c0fdc27425158621f109");
                expect(entries[1].address).toBe("0xca1c2e76f2122fdda9f97da0c4e37674727645cc");
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

            test("errors for unknown entry", () => {
                let walletId = vault.addWallet("test");
                expect(() => {
                    vault.exportJsonPk(EntryIdOp.create(walletId, 0).value, "none");
                }).toThrow()
            });

            test("import & export 6412c428", () => {
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
                let walletId = vault.addWallet("test");
                let entryId = vault.addEntry(walletId, {
                    blockchain: 100,
                    type: "ethereum-json",
                    key: JSON.stringify(data)
                });

                let current = JSON.parse(vault.exportJsonPk(entryId));
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

            test("export 6412c428", () => {
                let wallets = WalletsOp.of(vault.listWallets());
                let wallet = wallets.findWalletByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
                expect(wallet).toBeDefined();
                expect(wallet.value.name).toBe("foo bar");
                let entry = wallet.findEntryByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
                expect(entry).toBeDefined();

                let current = JSON.parse(vault.exportJsonPk(entry.id, "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3"));
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

        test("import scrypt - 6412c428", () => {
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

            let walletId = vault.addWallet("test");
            let entryId = vault.addEntry(walletId, {
                blockchain: 100,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let entry = vault.getWallet(walletId).entries[0] as EthereumEntry;

            expect(entry.address).toBe("0x6412c428fc02902d137b60dc0bd0f6cd1255ea99");
            expect(entry.receiveDisabled).toBeFalsy();
        });

        test("import scrypt - c2d7cf95", () => {
            // https://theethereum.wiki/w/index.php/Accounts,_Addresses,_Public_And_Private_Keys,_And_Tokens
            let data = {
                "address":"c2d7cf95645d33006175b78989035c7c9061d3f9",
                "crypto":{
                    "cipher":"aes-128-ctr",
                    "ciphertext":"0f6d343b2a34fe571639235fc16250823c6fe3bc30525d98c41dfdf21a97aedb",
                    "cipherparams":{
                        "iv":"cabce7fb34e4881870a2419b93f6c796"
                    },
                    "kdf":"scrypt",
                    "kdfparams": {
                        "dklen":32,
                        "n":262144,
                        "p":1,
                        "r":8,
                        "salt":"1af9c4a44cf45fe6fb03dcc126fa56cb0f9e81463683dd6493fb4dc76edddd51"
                    },
                    "mac":"5cf4012fffd1fbe41b122386122350c3825a709619224961a16e908c2a366aa6"
                },
                "id":"eddd71dd-7ad6-4cd3-bc1a-11022f7db76c",
                "version": 3
            };

            let walletId = vault.addWallet("test");
            let entryId = vault.addEntry(walletId, {
                blockchain: 101,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let entry = vault.getWallet(walletId).entries[0] as EthereumEntry;
            expect(entry.address).toBe("0xc2d7cf95645d33006175b78989035c7c9061d3f9");
        });

        //TODO
        xtest("import scrypt - no address", () => {
            // https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
            let data = {
                "crypto" : {
                    "cipher" : "aes-128-ctr",
                    "cipherparams" : {
                        "iv" : "83dbcc02d8ccb40e466191a123791e0e"
                    },
                    "ciphertext" : "d172bf743a674da9cdad04534d56926ef8358534d458fffccd4e6ad2fbde479c",
                    "kdf" : "scrypt",
                    "kdfparams" : {
                        "dklen" : 32,
                        "n" : 262144,
                        "p" : 8,
                        "r" : 1,
                        "salt" : "ab0c7876052600dd703518d6fc3fe8984592145b591fc8fb5c6d43190334ba19"
                    },
                    "mac" : "2103ac29920d71da29f15d75b4a16dbe95cfd7ff8faea1056c33131d846e3097"
                },
                "id" : "3198bc9c-6672-5ab3-d995-4942343ae5b6",
                "version" : 3
            };

            let walletId = vault.addWallet("test");
            let entryId = vault.addEntry(walletId, {
                blockchain: 100,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let entry = vault.getWallet(walletId).entries[0] as EthereumEntry;

            expect(entry.address).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        });

        test("import pbkdf2 - c2d7cf95", () => {
            //https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
            let data = {
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
                "version": 3
            };

            let walletId = vault.addWallet("test");
            let entryId = vault.addEntry(walletId, {
                blockchain: 101,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let entry = vault.getWallet(walletId).entries[0] as EthereumEntry;
            expect(entry.address).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        })
    });

    describe("Import PK", () => {
        let vault;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/tmp-import-pk"
            });
        });

        test("import 0xfac192ce", () => {
            let walletId = vault.addWallet("import 1");
            let entryId = vault.addEntry(walletId, {
                type: "raw-pk-hex",
                blockchain: 100,
                key: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            });
            let wallet = vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.address).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");

            let tx1 = vault.signTx(entryId, {
                from: "0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4",
                to: "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
                gas: "0x5208",
                gasPrice: "0x98BCA5A00",
                value: "0xA688906BD8B00000",
                nonce: "0x0",
            }, "test");

            expect(tx1).toBe("0xf86c8085098bca5a0082520894008aeeda4d805471df9b2a5b0f38a0c3bcba786b88a688906bd8b000008025a04da6c6e9d6f3179f624b189e70115e4b30d98c396c517da0ca8a33e36719fd1aa0495f151d4229aa79f4b8213096f56ae430cf093d66efc72ef48997f1d44d5ba3");
        });

        test("import 0xfac192ce - no prefix", () => {
            let walletId = vault.addWallet("import 1");
            let entryId = vault.addEntry(walletId, {
                type: "raw-pk-hex",
                blockchain: 100,
                key: "fac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            });
            let wallet = vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.address).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");

            let tx1 = vault.signTx(entryId, {
                from: "0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4",
                to: "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
                gas: "0x5208",
                gasPrice: "0x98BCA5A00",
                value: "0xA688906BD8B00000",
                nonce: "0x0",
            }, "test");

            expect(tx1).toBe("0xf86c8085098bca5a0082520894008aeeda4d805471df9b2a5b0f38a0c3bcba786b88a688906bd8b000008025a04da6c6e9d6f3179f624b189e70115e4b30d98c396c517da0ca8a33e36719fd1aa0495f151d4229aa79f4b8213096f56ae430cf093d66efc72ef48997f1d44d5ba3");
        });

        test("import 0xf06d69cd, sign with data", () => {
            let walletId = vault.addWallet("import 1");
            let entryId = vault.addEntry(walletId, {
                type: "raw-pk-hex",
                blockchain: 100,
                key: "0xf06d69cdc7da0faffb1008270bca38f5e31891a3a773950e6d0fea48a7188551",
                password: "test"
            });
            let wallet = vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.address).toBe("0xdb365e2b984128f5d187dbc8df1f947aa6e03361");

            let tx1 = vault.signTx(entryId, {
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

        test("import and export pk, 0xfac192ce", () => {
            let data = {
                pk: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            };
            let walletId = vault.addWallet("test");
            let entryId = vault.addEntry(walletId, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: data.pk,
                password: data.password
            });
            let pk = vault.exportRawPk(entryId, "test");

            expect(pk).toBe("0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd");
        });

        test("import and export pbkdf2", () => {
            // https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
            let data = {
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
            let walletId = vault.addWallet("test");
            let entryId = vault.addEntry(walletId, {
                blockchain: 100,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let pk = vault.exportRawPk(entryId, "testpassword");

            expect(pk).toBe("0x7a28b5ba57c53603b0b07b56bba752f7784bf506fa95edc395f5cf6c7514fe9d");
        });

        test("import and export scrypt", () => {
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

            let walletId = vault.addWallet("test");
            let entryId = vault.addEntry(walletId, {
                blockchain: 100,
                type: "ethereum-json",
                key: JSON.stringify(data)
            });

            let pk = vault.exportRawPk(entryId, "testtest");

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

        test("errors for invalid address", () => {
            expect(() => {
                vault.removeEntry("3198bc9c-6672-5ab3-d995-4942343ae5b6-1");
            }).toThrow()
        });

        test("import and delete", () => {
            let data = {
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

            let walletId = vault.addWallet("test 1");
            let entryId = vault.addEntry(walletId, {
                type: "ethereum-json",
                key: JSON.stringify(data),
                blockchain: 101
            });

            let wallet = vault.getWallet(walletId);

            expect(wallet).toBeDefined();
            expect(wallet.entries.length).toBe(1);
            expect(wallet.entries[0].blockchain).toBe(101);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.address).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");

            let removed = vault.removeEntry(entry.id);
            expect(removed).toBeTruthy();

            let wallet2 = vault.getWallet(walletId);
            // expect(wallet2).toBeUndefined();
            expect(wallet2.entries.length).toBe(0);
        });

    });

});