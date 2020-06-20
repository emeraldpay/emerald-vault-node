import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "./_commons";
import {WalletsOp} from "@emeraldpay/emerald-vault-core";


describe("Sign transaction", () => {
    describe('Use vault 0.26', () => {

        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/vault-0.26-basic"
            });
            vault.open();
        });

        test("sign", () => {
            let tx = {
                from: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0x1051",
                gas: "0x5208",
                gasPrice: "0x77359400",
                nonce: "0x2"
            };
            let wallets = WalletsOp.of(vault.listWallets());
            let wallet = wallets.findWalletByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
            let entry = wallet.findEntryByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");

            let raw = vault.signTx(entry.id, tx, "testtest");

            expect(raw).toBe("0xf865028477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd38210518025a09d38cc96e9856d1a82ede28bee743dcff816ea3cb2217b927d4eab11887d9b9da05a236057d16224e93f59230e1c722e4511553e7264a80e787bcd29c6ec6a90c4");
        });

        test("sign with nonce 0x196", () => {
            let tx = {
                from: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0x292d3069b0a00",
                gas: "0x5208",
                gasPrice: "0x77359400",
                nonce: "0x196"
            };
            let wallets = WalletsOp.of(vault.listWallets());
            let wallet = wallets.findWalletByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
            let entry = wallet.findEntryByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
            let raw = vault.signTx(entry.id, tx, "testtest");

            expect(raw).toBe("0xf86c8201968477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3870292d3069b0a008026a0073d38c0929a96f0af687aa519e817bc5cee830cf27bbb0525fd2b102d364318a00b2ab0a20e908a0cd2f96720cae6f1dd900f3de7d40e4bb45fcb76263026c51c");
        });

        test("sign with data", () => {
            let tx = {
                from: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0x0",
                gas: "0x5208",
                gasPrice: "0x77359400",
                nonce: "0x19",
                data: "0xa9059cbb0000000000000000000000000d0707963952f2fba59dd06f2b425ace40b492fe0000000000000000000000000000000000000000000002650fe6fe599c940000"
            };
            let wallets = WalletsOp.of(vault.listWallets());
            let wallet = wallets.findWalletByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
            let entry = wallet.findEntryByAddress("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
            let raw = vault.signTx(entry.id, tx, "testtest");

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

        test("sign with scrypt", () => {
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
            let walletId = vault.addWallet("test sign 1");
            let entryId = vault.addEntry(walletId, {
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
            let raw = vault.signTx(entryId, tx, "sign with scrypt");

            expect(raw).toBe("0xf863198477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3808026a0f3357ca4028bcfd26de329b5405ed60342a3aad785e84ea3776ef650818e7de5a0469efc686f479b242f311480911668c8b1993188908f87bd1d1c56b82a0b4fa6");
        });

        test("sign with pbkdf2", () => {
            //https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
            let pk = {
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
            let walletId = vault.addWallet("test sign 2");
            let entryId = vault.addEntry(walletId, {
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
            let raw = vault.signTx(entryId, tx, "testpassword");

            expect(raw).toBe("0xf863198477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3808025a06b2a5f318f1362404bd3f5bb68b7947091ae9dd06c8a01bdd967c20b1cd04ac5a059ab6b5aacf77ba3b5b3938254916e27e69f2b0ddfc028ec710eaaea96e3cff8");
        });

        test("use mnemonic", () => {
            let mnemonic = {
                password: "1234",
                hdPath: "m/44'/60'/0'/0/3",
                mnemonic: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
            };

            let walletId = vault.addWallet("test sign 2");
            let seedId = vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "fever misery evidence miss toddler fold scatter mail believe fire cabbage story verify tunnel echo"
                },
                password: "1234"
            });
            let entryId = vault.addEntry(walletId, {
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
            let raw = vault.signTx(entryId, tx, "1234");

            expect(raw).toBe("0xf863198477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3808025a02eab8b290050239e77329cb6d0d663c9bdbf0fe15918e4937be727dd67a0c593a05dda8f7b748b5907c0b414be260809f9c2dcfcd35a4a9b1cc801a7f4fe2154eb");
        });
    });
});

