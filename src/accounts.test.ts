import {EmeraldVaultNative} from "./EmeraldVaultNative";

describe("Accounts", () => {

    describe("List", () => {

        // disabled MIGRATE_V3
        xdescribe('Test vault 0.26 basic', () => {

            let vault;
            beforeAll(() => {
                vault = new EmeraldVaultNative({
                    dir: "./testdata/vault-0.26-basic"
                });
            });

            test("list eth", () => {
                let accounts = vault.listAccounts("eth");
                expect(accounts.length).toBe(2);
                expect(accounts[0].address).toBe("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
                expect(accounts[0].name).toBe("foo bar");
                expect(accounts[0].description).toBe("teßt account #1");
                expect(accounts[1].address).toBe("0x410891c20e253a2d284f898368860ec7ffa6153c");
            });

            test("list etc", () => {
                let accounts = vault.listAccounts("etc");
                expect(accounts.length).toBe(1);
                expect(accounts[0].address).toBe("0x5b30de96fdf94ac6c5b4a8c243f991c649d66fa1");
            });

            test("list kovan", () => {
                let accounts = vault.listAccounts("kovan");
                expect(accounts.length).toBe(0);
            });

            test("list morden", () => {
                let accounts = vault.listAccounts("morden");
                expect(accounts.length).toBe(0);
            });
        });

        describe('Test default dir', () => {

            let vault;
            beforeAll(() => {
                vault = new EmeraldVaultNative();
            });

            test("list etc", () => {
                let accounts = vault.listAccounts("etc");
                console.log("accounts", accounts);
            });

            test("list eth", () => {
                let accounts = vault.listAccounts("eth");
                console.log("accounts", accounts);
            });
            test("list morden", () => {
                let accounts = vault.listAccounts("morden");
                console.log("accounts", accounts);
            });
            test("list kovan", () => {
                let accounts = vault.listAccounts("kovan");
                console.log("accounts", accounts);
            });

        });

        // disabled MIGRATE_V3
        xdescribe('Test vault 0.26 with Snappy compression', () => {

            let vault;
            beforeAll(() => {
                vault = new EmeraldVaultNative({
                    dir: "./testdata/vault-0.26-snappy"
                });
            });

            test("list etc", () => {
                let accounts = vault.listAccounts("etc");
                expect(accounts.length).toBe(2);
                expect(accounts[0].address).toBe("0x1e728c6d055380b69ac1c0fdc27425158621f109");
                expect(accounts[1].address).toBe("0xca1c2e76f2122fdda9f97da0c4e37674727645cc");
            });

        });
    });

    describe("Export", () => {
        describe('Test export JSON', () => {

            let vault;
            beforeAll(() => {
                vault = new EmeraldVaultNative({
                    dir: "./testdata/tmp-export-json"
                });
            });

            test("errors for unknown account", () => {
                expect(() => {
                    vault.exportAccount("eth", "55ea99137b60dc0bd642d020f6cd112c428fc029");
                }).toThrow()
            });

            test("errors for invalid address", () => {
                expect(() => {
                    vault.exportAccount("eth", "55ea99137b60dc0bd642d020TTTT");
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
                vault.importAccount("eth", data);

                let current = vault.exportAccount("eth", "6412c428fc02902d137b60dc0bd0f6cd1255ea99");
                expect(current.name).toBe("Hello");
            });

        });

        // disabled MIGRATE_V3
        xdescribe('Test export from vault-0.26', () => {

            let vault;
            beforeAll(() => {
                vault = new EmeraldVaultNative({
                    dir: "./testdata/vault-0.26-basic"
                });
            });

            test("export 6412c428", () => {
                let current = vault.exportAccount("eth", "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
                expect(current.address).toBe("3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
                expect(current.name).toBe("foo bar");
                expect(current.description).toBe("teßt account #1");
            });

        });
    });

    describe("Import JSON", () => {
        let vault;
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
            let address = vault.importAccount("eth", data);
            expect(address).toBe("0x6412c428fc02902d137b60dc0bd0f6cd1255ea99");
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
                "version":3
            };

            let address = vault.importAccount("morden", data);
            expect(address).toBe("0xc2d7cf95645d33006175b78989035c7c9061d3f9");
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

            let address = vault.importAccount("morden", data);
            expect(address).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
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
                "version" : 3
            };

            let address = vault.importAccount("etc", data);
            expect(address).toBe("0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
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
            let data = {
                pk: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            };
            let address = vault.importPk("eth", data);
            expect(address).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");

            let tx1 = vault.signTx("eth", {
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
            let data = {
                pk: "fac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            };
            let address = vault.importPk("eth", data);
            expect(address).toBe("0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4");

            let tx1 = vault.signTx("eth", {
                from: "0x041b7ca652aa25e5be5d2053d7c7f96b5f7563d4",
                to: "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
                gas: "0x5208",
                gasPrice: "0x98BCA5A00",
                value: "0xA688906BD8B00000",
                nonce: "0x0",
            }, "test");

            expect(tx1).toBe("0xf86c8085098bca5a0082520894008aeeda4d805471df9b2a5b0f38a0c3bcba786b88a688906bd8b000008025a04da6c6e9d6f3179f624b189e70115e4b30d98c396c517da0ca8a33e36719fd1aa0495f151d4229aa79f4b8213096f56ae430cf093d66efc72ef48997f1d44d5ba3");
        });

        test("import 0xfac192ce", () => {
            let data = {
                pk: "0xf06d69cdc7da0faffb1008270bca38f5e31891a3a773950e6d0fea48a7188551",
                password: "test"
            };
            let address = vault.importPk("eth", data);
            expect(address).toBe("0xdb365e2b984128f5d187dbc8df1f947aa6e03361");

            let tx1 = vault.signTx("eth", {
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
        let vault;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/tmp-export-pk"
            });
        });

        test("import and export pk, 0xfac192ce", () => {
            let data = {
                pk: "0xfac192ceb5fd772906bea3e118a69e8bbb5cc24229e20d8766fd298291bba6bd",
                password: "test"
            };
            let address = vault.importPk("eth", data);
            let pk = vault.exportPk("eth", address, "test");

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

            let address = vault.importAccount("etc", data);

            let pk = vault.exportPk("etc", "008aeeda4d805471df9b2a5b0f38a0c3bcba786b", "testpassword");

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

            let address = vault.importAccount("eth", data);

            let pk = vault.exportPk("eth", "3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3", "testtest");

            expect(pk).toBe("0xad901ebb27a07ca54ffe797b24f602bdd600f300283c02a0b58b7c0567f12234");
        });
    });

    describe("Remove", () => {
        let vault;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/tmp-remove"
            });
        });

        test("errors for invalid address", () => {
            expect(() => {
                vault.removeAccount("eth", "55ea99137b60dc0bd642d020TTTT");
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

            vault.importAccount("etc", data);

            let exists = vault.listAccounts("etc").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
            expect(exists).toBeTruthy();

            vault.removeAccount("etc", "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
            exists = vault.listAccounts("etc").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
            expect(exists).toBeFalsy();
        });

        test("doesn't delete on another chain", () => {
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

            vault.importAccount("etc", data);
            vault.importAccount("eth", data);

            let exists = vault.listAccounts("etc").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
            expect(exists).toBeTruthy();
            exists = vault.listAccounts("eth").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
            expect(exists).toBeTruthy();

            vault.removeAccount("etc", "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
            exists = vault.listAccounts("etc").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
            expect(exists).toBeFalsy();
            exists = vault.listAccounts("eth").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
            expect(exists).toBeTruthy();
        })
    });

    describe("Update", () => {
        let vault;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/tmp-update"
            });
        });

        test("errors for unknown account", () => {
            expect(() => {
                vault.updateAccount("eth", "55ea99137b60dc0bd642d020f6cd112c428fc029", {name: "hello"});
            }).toThrow()
        });

        test("errors for invalid address", () => {
            expect(() => {
                vault.updateAccount("eth", "55ea99137b60dc0bd642d020TTTT", {name: "hello"});
            }).toThrow()
        });

        // disabled MIGRATE_V3 - description is not available
        xtest("update name and description", () => {
            let data = {
                "version": 3,
                "id": "305f4853-80af-4fa6-8619-6f285e83cf28",
                "address": "6412c428fc02902d137b60dc0bd0f6cd1255ea99",
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
            vault.importAccount("eth", data);

            let created = vault.exportAccount("eth", "6412c428fc02902d137b60dc0bd0f6cd1255ea99");
            console.log("loaded", created);
            expect(created.name).toBeNull();
            expect(created.description).toBeNull();

            vault.updateAccount("eth","6412c428fc02902d137b60dc0bd0f6cd1255ea99", {name: "Hello", description: "World!"} );

            let updated = vault.exportAccount("eth", "6412c428fc02902d137b60dc0bd0f6cd1255ea99");
            expect(updated.name).toBe("Hello");
            expect(updated.description).toBe("world!");
        });

        test("update name only", () => {
            let data = {
                "version": 3,
                "id": "305f4853-80af-4fa6-8619-6f285e83cf28",
                "address": "902d137b60dc0bd0f6cd1255ea996412c428fc02",
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
            vault.importAccount("eth", data);

            let created = vault.exportAccount("eth", "902d137b60dc0bd0f6cd1255ea996412c428fc02");
            expect(created.name).toBeNull();
            expect(created.description).toBeNull();

            vault.updateAccount("eth","902d137b60dc0bd0f6cd1255ea996412c428fc02", {name: "Hello"} );

            let updated = vault.exportAccount("eth", "902d137b60dc0bd0f6cd1255ea996412c428fc02");
            expect(updated.name).toBe("Hello");
            expect(updated.description).toBeNull();
        });

        // disabled MIGRATE_V3 - description is not available
        xtest("update description only", () => {
            let data = {
                "version": 3,
                "id": "305f4853-80af-4fa6-8619-6f285e83cf28",
                "address": "0f6cd1255ea996412c428fc02902d137b60dc0bd",
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
            vault.importAccount("eth", data);

            let created = vault.exportAccount("eth", "0f6cd1255ea996412c428fc02902d137b60dc0bd");
            expect(created.name).toBeNull();
            expect(created.description).toBeNull();

            vault.updateAccount("eth","0f6cd1255ea996412c428fc02902d137b60dc0bd", {description: "Worldddd"} );

            let updated = vault.exportAccount("eth", "0f6cd1255ea996412c428fc02902d137b60dc0bd");
            expect(updated.name).toBeNull();
            expect(updated.description).toBe("worldddd");
        });

        test("update twice", () => {
            let data = {
                "version": 3,
                "id": "305f4853-80af-4fa6-8619-6f285e83cf28",
                "address": "12c428fc02902d137b60dc0bd0f6cd1255ea9964",
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
            vault.importAccount("eth", data);

            let created = vault.exportAccount("eth", "12c428fc02902d137b60dc0bd0f6cd1255ea9964");
            expect(created.name).toBeNull();
            expect(created.description).toBeNull();

            vault.updateAccount("eth","12c428fc02902d137b60dc0bd0f6cd1255ea9964", {name: "Worldddd"} );
            vault.updateAccount("eth","12c428fc02902d137b60dc0bd0f6cd1255ea9964", {name: "hello"} );

            let updated = vault.exportAccount("eth", "12c428fc02902d137b60dc0bd0f6cd1255ea9964");
            expect(updated.name).toBe("hello");
        });
    });
});