import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {AccountId, WalletOp} from "@emeraldpay/emerald-vault-core";
import Common from "ethereumjs-common";
import {Transaction} from "ethereumjs-tx";

function convertHex(b: Buffer): string {
    let value = b.toString('hex');
    if (value === "") {
        return "0x0"
    }
    return "0x"+value
}

function convertNum(b: Buffer): number {
    let hex = convertHex(b).substr(2);
    return parseInt(hex, 16)
}

function hexQuantity(hex: string): string {
    if (hex.startsWith("0x0")) {
        if (hex === "0x0") {
            return hex
        }
        return hexQuantity("0x" + hex.substr(3))
    }
    return hex
}


describe('Sign different tx combinations (slow to execute)', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: "./testdata/tmp-sign-tx-variants"
        });
    });

    let pk = {
        "version": 3,
        "id": "a7f5c572-b87e-4417-b8d9-a38aa944e02e",
        "address": "36a8ce9b0b86361a02070e4303d5e24d6c63b3f1",
        "name": null,
        "description": null,
        "visible": true,
        "crypto": {
            "cipher": "aes-128-ctr",
            "ciphertext": "4eb6b07fb90835cd83cbbbee107d5e54e70155b09b5f865f3102ceaa35696a87",
            "cipherparams": {"iv": "acfa1a37866a6d6c9da6cbe74adb7de3"},
            "kdf": "pbkdf2",
            "kdfparams": {
                "prf": "hmac-sha256",
                "c": 1,
                "dklen": 32,
                "salt": "921c530404f8e9b5b2f9c7dfb0179cda5f277717254f832f0a4cb808363c2ba1"
            },
            "mac": "f50fdab2ccd23df371926f4dbf2d187cdd75dfb8799cab7ed77566d1ffafb391"
        }
    };


    function testAll(accountId: AccountId, chainId: number) {
        let chainConfig = {};
        if (chainId !== 1) {
            chainConfig = {common: Common.forCustomChain(1, {chainId}, 'byzantium')};
        }
        ["0x0", "0x1", "0xff", "0x100", "0xde0b6b3a7640000", "0xab5461ca4b100000"].forEach((value) => {
            ["0x5208", "0x1fbd0", "0x1", "0xb7", "0x100"].forEach((gas) => {
                ["0x77359400", "0x1", "0x0", "0x80"].forEach((gasPrice) => {
                    ["0x0", "0x1", "0x1f", "0xff", "0x38ae"].forEach((nonce) => {
                        ["", "d0e30db0", "095ea7b300000000000000000000000036a8ce9b0b86361a02070e4303d5e24d6c63b3f10000000000000000000000000000000000000000033b2e3c9fd0803ce8000000"].forEach((data) => {
                            ["0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3"].forEach((to) => {
                                let tx = {
                                    from: "0x36a8ce9b0b86361a02070e4303d5e24d6c63b3f1",
                                    to,
                                    value,
                                    gas,
                                    gasPrice,
                                    nonce,
                                    data
                                };
                                let raw = vault.signTx(accountId, tx, "123456");
                                expect(raw).toBeDefined();
                                let parsed;
                                try {
                                    parsed = new Transaction(raw, chainConfig);
                                } catch (e) {
                                    console.error("Invalid signature", tx);
                                    console.error("Raw", raw);
                                    console.error(e);
                                }

                                expect(parsed).toBeDefined();
                                expect(convertHex(parsed.getSenderAddress())).toBe("0x36a8ce9b0b86361a02070e4303d5e24d6c63b3f1");
                                expect(convertHex(parsed.to)).toBe(to);
                                expect(hexQuantity(convertHex(parsed.value))).toBe(value);
                                expect(hexQuantity(convertHex(parsed.gasLimit))).toBe(gas);
                                expect(hexQuantity(convertHex(parsed.gasPrice))).toBe(gasPrice);
                                expect(hexQuantity(convertHex(parsed.nonce))).toBe(nonce);
                                expect(parsed.data.toString('hex')).toBe(data);
                                expect(convertNum(parsed.v)).toBeGreaterThanOrEqual(chainId * 2 + 35);
                                expect(convertNum(parsed.v)).toBeLessThanOrEqual(chainId * 2 + 36);
                            })
                        })
                    })
                })
            })
        });
    }

    test("ETH", () => {
        let walletId = vault.addWallet("slow sign ETH");
        let accountId = vault.addAccount(walletId, {
            blockchain: 100,
            type: "ethereum-json",
            key: JSON.stringify(pk)
        });
        testAll(accountId, 1);
    });

    test("ETC", () => {
        let walletId = vault.addWallet("slow sign ETC");
        let accountId = vault.addAccount(walletId, {
            blockchain: 101,
            type: "ethereum-json",
            key: JSON.stringify(pk)
        });
        testAll(accountId,61);
    });

    test("Kovan", () => {
        let walletId = vault.addWallet("slow sign Kovan");
        let accountId = vault.addAccount(walletId, {
            blockchain: 10002,
            type: "ethereum-json",
            key: JSON.stringify(pk)
        });
        testAll(accountId,42);
    })

});

describe('Sign different key combinations (slow to execute)', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: "./testdata/tmp-sign-key-variants"
        });
    });

    test("500 keys on same mnemonic", () => {
        let seedId = vault.importSeed({
            type: "mnemonic",
            password: "testtest",
            value: {
                value: "gravity tornado laugh hold engine relief next math sleep organ above purse prefer afraid wife service opinion gallery swap violin middle"
            }
        });

        let chainId = 1;
        let walletId = vault.addWallet("test");

        for (let i = 0; i < 500; i++) {
            vault.addAccount(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: "m/44'/60'/0'/0/" + i,
                    seedId: seedId,
                    password: "testtest"
                }
            });
        }
        let accounts = WalletOp.of(vault.getWallet(walletId)).getEthereumAccounts();
        expect(accounts.length).toBe(500);
        accounts.forEach(account => {
            let tx = {
                from: account.address,
                to: "0x36a8ce9b0b86361a02070e4303d5e24d6c63b3f1",
                value: "0x1234",
                gas: "0x5678",
                gasPrice: "0x9012",
                nonce: "0x0"
            };

            let raw = vault.signTx(account.id, tx, "testtest");
            expect(raw).toBeDefined();
            let parsed;
            try {
                parsed = new Transaction(raw);
            } catch (e) {
                console.error("Invalid signature", tx);
                console.error("Raw", raw);
                console.error(e);
            }

            expect(parsed).toBeDefined();
            expect(convertHex(parsed.getSenderAddress())).toBe(account.address);
            expect(convertHex(parsed.to)).toBe("0x36a8ce9b0b86361a02070e4303d5e24d6c63b3f1");
            expect(hexQuantity(convertHex(parsed.value))).toBe("0x1234");
            expect(hexQuantity(convertHex(parsed.gasLimit))).toBe("0x5678");
            expect(hexQuantity(convertHex(parsed.gasPrice))).toBe("0x9012");
            expect(hexQuantity(convertHex(parsed.nonce))).toBe("0x0");
            expect(parsed.data.toString('hex')).toBe("");
            expect(convertNum(parsed.v)).toBeGreaterThanOrEqual(chainId * 2 + 35);
            expect(convertNum(parsed.v)).toBeLessThanOrEqual(chainId * 2 + 36);

        });
    });



});