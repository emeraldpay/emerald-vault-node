import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {
    AddEntry,
    EntryId,
    UnsignedTx,
    WalletOp
} from "@emeraldpay/emerald-vault-core";
import {Transaction, TransactionFactory, TypedTransaction} from '@ethereumjs/tx';
import {Common, Hardfork} from '@ethereumjs/common';
import {tempPath} from "../__tests__/_commons";

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

    let vault: EmeraldVaultNative;
    beforeAll(async () => {
        vault = new EmeraldVaultNative({
            dir: tempPath("sign-tx-variants")
        });
        await vault.createGlobalKey("global-password");
    });
    afterAll(() => {
        vault.close();
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


    function testAll(entryId: EntryId, chainId: number): Promise<any> {
        let chainConfig = {};
        if (chainId !== 1) {
            chainConfig = {common: Common.custom({ chainId }, { baseChain: 1, hardfork: Hardfork.Shanghai })};
        } else {
            chainConfig = {common: new Common({ hardfork: Hardfork.Shanghai, chain: chainId })};
        }

        let result = [];
        ["0", "1", "255", "256", "1000000000000000000"].forEach((value) => {
            [0x5208, 0x1fbd0, 0x1, 0xb7, 0x100].forEach((gas) => {
                ["2000000000", "1", "0", "128"].forEach((gasPrice) => {
                    [0x0, 0x1, 0xff, 0x38ae].forEach((nonce) => {
                        ["", "d0e30db0", "095ea7b300000000000000000000000036a8ce9b0b86361a02070e4303d5e24d6c63b3f10000000000000000000000000000000000000000033b2e3c9fd0803ce8000000"].forEach((data) => {
                            ["0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3"].forEach(async (to) => {
                                let tx = {
                                    from: "0x36a8ce9b0b86361a02070e4303d5e24d6c63b3f1",
                                    to,
                                    value,
                                    gas,
                                    gasPrice,
                                    nonce,
                                    data
                                };
                                result.push(
                                    vault.signTx(entryId, tx, "global-password")
                                        .then((raw) => {
                                            expect(raw).toBeDefined();
                                            let parsed: TypedTransaction;
                                            try {
                                                const bytes = Buffer.from(raw.raw.slice(2), 'hex');
                                                parsed = TransactionFactory.fromSerializedData(bytes, chainConfig);
                                            } catch (e) {
                                                console.error("Invalid signature", tx);
                                                console.error("Raw", raw);
                                                console.error(e);
                                            }
                                            expect(parsed).toBeDefined();
                                            expect(convertHex(Buffer.from(parsed.hash()))).toBe(raw.txid);
                                            expect(parsed.getSenderAddress().toString()).toBe("0x36a8ce9b0b86361a02070e4303d5e24d6c63b3f1");
                                            expect(parsed.to.toString()).toBe(to);
                                            expect(parsed.value.toString()).toBe(value);
                                            expect(parsed.gasLimit.toString()).toBe(gas.toString());
                                            // expect(hexQuantity(convertHex(parsed.gasPrice))).toBe(gasPrice);
                                            expect(parsed.nonce.toString()).toBe(nonce.toString());
                                            expect(Buffer.from(parsed.data).toString("hex")).toBe(data);
                                            expect(parseInt(parsed.v.toString())).toBeGreaterThanOrEqual(chainId * 2 + 35);
                                            expect(parseInt(parsed.v.toString())).toBeLessThanOrEqual(chainId * 2 + 36);
                                        })
                                );
                            })
                        })
                    })
                })
            })
        });
        return Promise.all(result)
    }

    test("ETH", async () => {
        let walletId = await vault.addWallet("slow sign ETH");
        let entryId = await vault.addEntry(walletId, {
            blockchain: 100,
            type: "ethereum-json",
            key: JSON.stringify(pk),
            jsonPassword: "123456",
            password: "global-password"
        });
        await testAll(entryId, 1);
    });

    test("ETC", async () => {
        let walletId = await vault.addWallet("slow sign ETC");
        let entryId = await vault.addEntry(walletId, {
            blockchain: 101,
            type: "ethereum-json",
            key: JSON.stringify(pk),
            jsonPassword: "123456",
            password: "global-password"
        });
        await testAll(entryId, 61);
    });

});

describe('Sign different key combinations (slow to execute)', () => {

    let vault: EmeraldVaultNative;
    beforeAll(async () => {
        vault = new EmeraldVaultNative({
            dir: tempPath("sign-key-variants")
        });
        await vault.createGlobalKey("global-password");
    });
    afterAll(() => {
        vault.close();
    });

    test("500 keys on same mnemonic", async () => {
        let seedId = await vault.importSeed({
            type: "mnemonic",
            password: "global-password",
            value: {
                value: "gravity tornado laugh hold engine relief next math sleep organ above purse prefer afraid wife service opinion gallery swap violin middle"
            }
        });

        let chainId = 1;
        let walletId = await vault.addWallet("test");

        for (let i = 0; i < 500; i++) {
            await vault.addEntry(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: seedId, password: "global-password"},
                    hdPath: "m/44'/60'/0'/0/" + i,
                }
            });
        }
        let entries = WalletOp.of(await vault.getWallet(walletId)).getEthereumEntries();
        expect(entries.length).toBe(500);
        for (let i = 0; i < entries.length; i++) {
            let entry = entries[i];
            let tx: UnsignedTx = {
                from: entry.address.value,
                to: "0x36a8ce9b0b86361a02070e4303d5e24d6c63b3f1",
                value: "4660",
                gas: 0x5678,
                gasPrice: "36882",
                nonce: 0x0
            };

            let raw = await vault.signTx(entry.id, tx, "global-password");
            expect(raw).toBeDefined();
            let parsed;
            try {
                const bytes = Buffer.from(raw.raw.slice(2), 'hex');
                let chainConfig = {common: new Common({ hardfork: Hardfork.Shanghai, chain: chainId })};
                parsed = TransactionFactory.fromSerializedData(bytes, chainConfig);
            } catch (e) {
                console.error("Invalid signature", tx);
                console.error("Raw", raw);
                console.error(e);
            }

            expect(parsed).toBeDefined();
            expect(parsed.getSenderAddress().toString()).toBe(entry.address.value);
            expect(parsed.to.toString()).toBe("0x36a8ce9b0b86361a02070e4303d5e24d6c63b3f1");
            expect(parsed.value.toString()).toBe("4660");
            expect(parsed.gasLimit.toString(16)).toBe("5678");
            expect(parsed.gasPrice.toString(16)).toBe("9012");
            expect(parsed.nonce.toString()).toBe("0");
            expect(parsed.data.toString('hex')).toBe("");
            expect(parseInt(parsed.v.toString())).toBeGreaterThanOrEqual(chainId * 2 + 35);
            expect(parseInt(parsed.v.toString())).toBeLessThanOrEqual(chainId * 2 + 36);

        }
    });



});