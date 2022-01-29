import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "./_commons";
import {UnsignedBitcoinTx, WalletsOp} from "@emeraldpay/emerald-vault-core";


describe("Sign transaction", () => {
    describe('Import and sign', () => {

        let vault: EmeraldVaultNative;
        beforeAll(async () => {
            vault = new EmeraldVaultNative({
                dir: tempPath("import-sign")
            });
            await vault.createGlobalKey("test-global")
        });

        test("sign with scrypt", async () => {
            let pk = {
                "version": 3,
                "id": "f2528b47-3058-4405-bb82-731f74e8ffea",
                "address": "0cf0523fc884ad99f7df146848f08cb8608a38a7",
                "crypto": {
                    "ciphertext": "47072ffb47493b0fcb2b051aa1d76b5864c094518f9a5f0478ccd667406eaf59",
                    "cipherparams": {"iv": "b6962fd8cf43f371031e0db458c11677"},
                    "cipher": "aes-128-ctr",
                    "kdf": "scrypt",
                    "kdfparams": {
                        "dklen": 32,
                        "salt": "37744fdd151b14a12e07a78e94902018a2a98d6465bf2f2d1b607a3be94d5265",
                        "n": 8192,
                        "r": 8,
                        "p": 1
                    },
                    "mac": "1c2e771fd7f602288baa5ba5d5ae9dba685fc09d17ec6608d185355be306135e"
                }
            };
            let walletId = await vault.addWallet("test sign 1");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "ethereum-json",
                key: JSON.stringify(pk),
                jsonPassword: "sign with scrypt",
                password: "test-global"
            });

            let tx = {
                from: "0x0cf0523fc884ad99f7df146848f08cb8608a38a7",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0x0",
                gas: "0x5208",
                gasPrice: "0x77359400",
                nonce: "0x19",
                data: ""
            };
            let raw = await vault.signTx(entryId, tx, "test-global");

            expect(raw).toBe("0xf863198477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3808026a0f3357ca4028bcfd26de329b5405ed60342a3aad785e84ea3776ef650818e7de5a0469efc686f479b242f311480911668c8b1993188908f87bd1d1c56b82a0b4fa6");
        });

        test("sign with pbkdf2", async () => {
            //https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
            let pk = {
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
            let walletId = await vault.addWallet("test sign 2");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "ethereum-json",
                key: JSON.stringify(pk),
                jsonPassword: "testpassword",
                password: "test-global"
            });

            let tx = {
                from: "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0x0",
                gas: "0x5208",
                gasPrice: "0x77359400",
                nonce: "0x19",
                data: ""
            };
            let raw = await vault.signTx(entryId, tx, "test-global");

            expect(raw).toBe("0xf863198477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3808025a06b2a5f318f1362404bd3f5bb68b7947091ae9dd06c8a01bdd967c20b1cd04ac5a059ab6b5aacf77ba3b5b3938254916e27e69f2b0ddfc028ec710eaaea96e3cff8");
        });

        test("use mnemonic", async () => {
            let mnemonic = {
                password: "test-global",
                hdPath: "m/44'/60'/0'/0/3",
                mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
            };

            let walletId = await vault.addWallet("test sign 2");
            let seedId = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
                },
                password: "test-global"
            });
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: seedId, password: "test-global"},
                    hdPath: "m/44'/60'/0'/0/3",
                }
            });


            let tx = {
                from: "0xD4345AbBeEF14d2Fd2E0DEB898A67c26F1cbC4F1",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0x0",
                gas: "0x5208",
                gasPrice: "0x77359400",
                nonce: "0x19",
                data: ""
            };
            let raw = await vault.signTx(entryId, tx, "test-global");

            expect(raw).toBe("0xf863198477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3808025a02eab8b290050239e77329cb6d0d663c9bdbf0fe15918e4937be727dd67a0c593a05dda8f7b748b5907c0b414be260809f9c2dcfcd35a4a9b1cc801a7f4fe2154eb");
        });

        test("sign bitcoin tx", async () => {
            let walletId = await vault.addWallet("test sign 2");
            let seedId = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
                },
                password: "test-global"
            });
            let entryId = await vault.addEntry(walletId, {
                blockchain: 1,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: seedId, password: "test-global"},
                    hdPath: "m/84'/0'/2'/0/0",
                }
            });

            let tx: UnsignedBitcoinTx = {
                inputs: [
                    {
                        txid: "041d573943b6dad1eaec93b639882dfef140d79aa8c56890ed3d4e0f37160bae",
                        vout: 1,
                        amount: 40006493,
                        // pubkey must be 02e2ec110e2fff8c7ad0879015044d09395cf1665eb9a8ea80e1c30b53ea39cedb
                        address: "bc1q5c4g4njf4g7a2ugu0tq5rjjdg3j0yexus7x3f4"
                    }
                ],
                outputs: [
                    {
                        address: "bc1q9sxk9zqjfjjtsfq4hp2xf5y9xca6tmszju9jy6",
                        amount: 40006493 - 500
                    }
                ],
                fee: 500
            };

            let raw = await vault.signTx(entryId, tx, "test-global");

            expect(raw).toBe("02000000000101ae0b16370f4e3ded9068c5a89ad740f1fe2d8839b693ecead1dab64339571d040100000000feffffff0169716202000000001600142c0d6288124ca4b82415b85464d085363ba5ee02024830450221008ac94f1e95782d92a50aacf8730547b11815c11a3ac95cc8ca314da5bf7f00ed022049e58da09d003c95ab2020b8446e888c300dd7dabc99ee9dbd3ab3574646dbc0012102e2ec110e2fff8c7ad0879015044d09395cf1665eb9a8ea80e1c30b53ea39cedb00000000");
        });

        test("sign bitcoin tx - multiple in/out", async () => {
            let walletId = await vault.addWallet("test sign 2");
            let seedId = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
                },
                password: "test-global"
            });
            let entryId = await vault.addEntry(walletId, {
                blockchain: 1,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: seedId, password: "test-global"},
                    hdPath: "m/84'/0'/2'/0/0",
                }
            });

            let tx: UnsignedBitcoinTx = {
                inputs: [
                    {
                        txid: "041d573943b6dad1eaec93b639882dfef140d79aa8c56890ed3d4e0f37160bae",
                        vout: 1,
                        amount: 40006493,
                        // pubkey must be 02e2ec110e2fff8c7ad0879015044d09395cf1665eb9a8ea80e1c30b53ea39cedb
                        address: "bc1q5c4g4njf4g7a2ugu0tq5rjjdg3j0yexus7x3f4",
                        sequence: 0
                    },
                    {
                        txid: "882dfef140d79aa8c56041d573943b6dad1eaec93b639890ed3d4e0f37160bae",
                        vout: 2,
                        amount: 15076493,
                        address: "bc1q5c4g4njf4g7a2ugu0tq5rjjdg3j0yexus7x3f4",
                        sequence: 0x00112233
                    }
                ],
                outputs: [
                    {
                        address: "bc1q9sxk9zqjfjjtsfq4hp2xf5y9xca6tmszju9jy6",
                        amount: 10000000
                    },
                    {
                        address: "bc1qenw3e6ex90je7gnlaxsm58u343u6f4yhj42yy4",
                        amount: 40006493 + 15076493 - 10000000 - 800
                    }
                ],
                fee: 800
            };

            let raw = await vault.signTx(entryId, tx, "test-global");
            expect(raw).toBe("02000000000102ae0b16370f4e3ded9068c5a89ad740f1fe2d8839b693ecead1dab64339571d04010000000000000000ae0b16370f4e3ded9098633bc9ae1ead6d3b9473d54160c5a89ad740f1fe2d880200000000332211000280969800000000001600142c0d6288124ca4b82415b85464d085363ba5ee024ae6af0200000000160014ccdd1ceb262be59f227fe9a1ba1f91ac79a4d49702473044022054051833b2716dece1445af56cfd825a914080c30cf7a71df3ab7c2a39aa0c3a02206de71e4eb0c79873082ba69042769b12a7ed0d93c4006be26bcd439e0fcc52c7012102e2ec110e2fff8c7ad0879015044d09395cf1665eb9a8ea80e1c30b53ea39cedb02473044022016f45acb4f3a5a139f84efca1ad399aa09607998b9325783c26c2a0d5ecde96d02207ce8ef91c9088d04723e17a11f3b56bb98a9016df5b253c53e902b3a98e0197d012102e2ec110e2fff8c7ad0879015044d09395cf1665eb9a8ea80e1c30b53ea39cedb00000000");
        })
    });
});

