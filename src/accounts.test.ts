import {EmeraldVaultNative} from "./EmeraldVaultNative";

describe("Accounts", () => {

    describe("List", () => {

        describe('Test vault 0.26 basic', () => {

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
                expect(current.name).toBe("hello");
            });

        });

        describe('Test export from vault-0.26', () => {

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

    describe("Import", () => {
        let vault;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/tmp-import-json"
            });
        });

        test("import 6412c428", () => {
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

        test("import c2d7cf95", () => {
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

        test("import c2d7cf95", () => {
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

        test("update name and description", () => {
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
            expect(created.name).toBeNull();
            expect(created.description).toBeNull();

            vault.updateAccount("eth","6412c428fc02902d137b60dc0bd0f6cd1255ea99", {name: "Hello", description: "World!"} );

            let updated = vault.exportAccount("eth", "6412c428fc02902d137b60dc0bd0f6cd1255ea99");
            expect(updated.name).toBe("hello");
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
            expect(updated.name).toBe("hello");
            expect(updated.description).toBeNull();
        });

        test("update description only", () => {
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

            vault.updateAccount("eth","12c428fc02902d137b60dc0bd0f6cd1255ea9964", {description: "Worldddd"} );
            vault.updateAccount("eth","12c428fc02902d137b60dc0bd0f6cd1255ea9964", {description: "Worldddd 2", name: "hello"} );

            let updated = vault.exportAccount("eth", "12c428fc02902d137b60dc0bd0f6cd1255ea9964");
            expect(updated.name).toBe("hello");
            expect(updated.description).toBe("worldddd 2");
        });
    });
});