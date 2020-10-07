import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "./_commons";
import {UnsignedBitcoinTx, WalletsOp} from "@emeraldpay/emerald-vault-core";


describe("Sign transaction", () => {
    describe('Use vault 0.26', () => {

        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/vault-0.26-basic"
            });
            vault.open();
        });

        test("sign", async () => {
            let tx = {
                from: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0x1051",
                gas: "0x5208",
                gasPrice: "0x77359400",
                nonce: "0x2"
            };
            let wallets = WalletsOp.of(await vault.listWallets());
            let wallet = wallets.findWalletByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
            let entry = wallet.findEntryByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");

            let raw = await vault.signTx(entry.id, tx, "testtest");

            expect(raw).toBe("0xf865028477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd38210518025a09d38cc96e9856d1a82ede28bee743dcff816ea3cb2217b927d4eab11887d9b9da05a236057d16224e93f59230e1c722e4511553e7264a80e787bcd29c6ec6a90c4");
        });

        test("sign with nonce 0x196", async () => {
            let tx = {
                from: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0x292d3069b0a00",
                gas: "0x5208",
                gasPrice: "0x77359400",
                nonce: "0x196"
            };
            let wallets = WalletsOp.of(await vault.listWallets());
            let wallet = wallets.findWalletByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
            let entry = wallet.findEntryByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
            let raw = await vault.signTx(entry.id, tx, "testtest");

            expect(raw).toBe("0xf86c8201968477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3870292d3069b0a008026a0073d38c0929a96f0af687aa519e817bc5cee830cf27bbb0525fd2b102d364318a00b2ab0a20e908a0cd2f96720cae6f1dd900f3de7d40e4bb45fcb76263026c51c");
        });

        test("sign with data", async () => {
            let tx = {
                from: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0x0",
                gas: "0x5208",
                gasPrice: "0x77359400",
                nonce: "0x19",
                data: "0xa9059cbb0000000000000000000000000d0707963952f2fba59dd06f2b425ace40b492fe0000000000000000000000000000000000000000000002650fe6fe599c940000"
            };
            let wallets = WalletsOp.of(await vault.listWallets());
            let wallet = wallets.findWalletByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
            let entry = wallet.findEntryByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
            let raw = await vault.signTx(entry.id, tx, "testtest");

            expect(raw).toBe("0xf8a8198477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd380b844a9059cbb0000000000000000000000000d0707963952f2fba59dd06f2b425ace40b492fe0000000000000000000000000000000000000000000002650fe6fe599c94000025a0b2501b7c0ccd6cb000b6f568e504ed605f41e5fbdbdffe2a440e636aa499da1ca02e7e76de7b0167a09fda23395039443cf0bb523ceeacdf0f9fa873408753a7a3");
        });

    });

    describe('Import and sign', () => {

        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("import-sign")
            });
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
                key: JSON.stringify(pk)
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
            let raw = await vault.signTx(entryId, tx, "sign with scrypt");

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
                key: JSON.stringify(pk)
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
            let raw = await vault.signTx(entryId, tx, "testpassword");

            expect(raw).toBe("0xf863198477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3808025a06b2a5f318f1362404bd3f5bb68b7947091ae9dd06c8a01bdd967c20b1cd04ac5a059ab6b5aacf77ba3b5b3938254916e27e69f2b0ddfc028ec710eaaea96e3cff8");
        });

        test("use mnemonic", async () => {
            let mnemonic = {
                password: "1234",
                hdPath: "m/44'/60'/0'/0/3",
                mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
            };

            let walletId = await vault.addWallet("test sign 2");
            let seedId = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
                },
                password: "1234"
            });
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: seedId, password: "1234"},
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
            let raw = await vault.signTx(entryId, tx, "1234");

            expect(raw).toBe("0xf863198477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3808025a02eab8b290050239e77329cb6d0d663c9bdbf0fe15918e4937be727dd67a0c593a05dda8f7b748b5907c0b414be260809f9c2dcfcd35a4a9b1cc801a7f4fe2154eb");
        });

        test("sign bitcoin tx", async () => {
            let walletId = await vault.addWallet("test sign 2");
            let seedId = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
                },
                password: "1234"
            });
            let entryId = await vault.addEntry(walletId, {
                blockchain: 1,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: seedId, password: "1234"},
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

            let raw = await vault.signTx(entryId, tx, "1234");

            expect(raw).toBe("01000000000101ae0b16370f4e3ded9068c5a89ad740f1fe2d8839b693ecead1dab64339571d040100000000feffffff0169716202000000001600142c0d6288124ca4b82415b85464d085363ba5ee020247304402205d9d09bcf731d1842b6e0d4bef4c71ceff471fd6a6439042e669c8abb64de69202206865babae800f53c3d1bf04c13062e2b42302aeaed03e2390b0cb6b3430c64f1012102e2ec110e2fff8c7ad0879015044d09395cf1665eb9a8ea80e1c30b53ea39cedb00000000");
        });

        test("sign bitcoin tx - multiple in/out", async () => {
            let walletId = await vault.addWallet("test sign 2");
            let seedId = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
                },
                password: "1234"
            });
            let entryId = await vault.addEntry(walletId, {
                blockchain: 1,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: seedId, password: "1234"},
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

            let raw = await vault.signTx(entryId, tx, "1234");
            expect(raw).toBe("01000000000102ae0b16370f4e3ded9068c5a89ad740f1fe2d8839b693ecead1dab64339571d04010000000000000000ae0b16370f4e3ded9098633bc9ae1ead6d3b9473d54160c5a89ad740f1fe2d880200000000332211000280969800000000001600142c0d6288124ca4b82415b85464d085363ba5ee024ae6af0200000000160014ccdd1ceb262be59f227fe9a1ba1f91ac79a4d49702483045022100d51bd759794a032be7cd1a57817c32513369963354f8496f96f2bd7c974b23d802200ef88dfb57952057a5fc87f384c6b978841e872a1a4f08b1d626a61ce9a148a6012102e2ec110e2fff8c7ad0879015044d09395cf1665eb9a8ea80e1c30b53ea39cedb02483045022100dfbb3e9a32d9d98aa5b816534f7387704b078cdbdb4c99a1a798f573fda99b05022006029eb5bb36a2d2df656d05db7397339c39f3bb21271007db409825bec8d90e012102e2ec110e2fff8c7ad0879015044d09395cf1665eb9a8ea80e1c30b53ea39cedb00000000");
        })
    });
});

