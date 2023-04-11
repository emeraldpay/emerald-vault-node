import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {AddEntry, EntryId, UnsignedBitcoinTx} from "@emeraldpay/emerald-vault-core";
import * as bitcoin from "bitcoinjs-lib";
import sha256 from 'crypto-js/sha256';
import CryptoJS from 'crypto-js';
import {tempPath} from "../__tests__/_commons";

describe('Sign different tx combinations (slow to execute)', () => {

    let vault: EmeraldVaultNative;
    beforeAll(async () => {
        vault = new EmeraldVaultNative({
            dir: tempPath("./testdata/sign-btc-tx-variants")
        });
        await vault.createGlobalKey("global-password");
    });
    afterAll(() => {
        vault.close();
    });

    function testAll(entryId: EntryId): Promise<any> {
        let result = [];

        const from = [
            {
                address: "bc1q74z03fz8lhy87zx3gfwu4k3t57yew2yefreakn",
                hdPath: "m/84'/0'/2'/0/0",
                pk: "039c0689db4980e316764be6835e821d18264001354a11065763e940bd84f2c3ef",
                sk: "KznErxyWRrTP3yHhqzbXXVEa6jjKJnU4F7ijRpU25THorvxEpGxu"
            },
            {
                address: "bc1qmtnxrxa8vnfypm0qyezcl239lstpcz7rwf3zsj",
                hdPath: "m/84'/0'/2'/1/0",
                pk: "035d9e89469f95cb30ddd06b9a3a62fd8121986c0c58b29baf082affc61512af84",
                sk: "L1m6J778EQ57xJWapQuxUwTKSLR2pD86MfsmRR5VTZPx2AjSfDhC"
            },
            {
                address: "bc1qqv8zszylce4389vwzsnm8rx88ytmd6cn829sly",
                hdPath: "m/84'/0'/2'/0/1",
                pk: "0330e8aec9b84518c1650378353077164426dc4e977ac24d9a8bab020715868c54",
                sk: "L4Euf68NvhihsJbgmDH4cccnqXFCJYTLLKd8iUict3yziUuDHUMs"
            },
            {
                address: "bc1q99lf0duddskggxjhkp92ghn0alz5xm7u3nfws8",
                hdPath: "m/84'/0'/2'/0/2",
                pk: "03e4119f40ebd34ce410c9f1b91401d56eef6ef7311bfaf3ea10e07aeedcdea80d",
                sk: "KxCgnk2oVws1E5RMMP9stmuTzvMHPravvQTwVFjsGrrUvndTEd8b"
            },
            {
                address: "bc1qcvvkckfkshvg9y4anvhq93kp8cnagyzz6kgqcq",
                hdPath: "m/84'/0'/2'/1/1",
                pk: "0210ad94ef4b483677f5d42681cdbb7416097cf971e01988c64610afd9879d0e44",
                sk: "KysoHqoWUEVtoNs2FjQDdjtEc1Ky4rsF5Zfm5a1F4nhRW22JvjA7"
            },
        ];

        const to = [
            "bc1qj9mp085rv3740av9q8azzduewatwhruleqthtx",
            "bc1qavd0jlsq6p7ra98uhpc8q5wdjf3u2u2e2m33ka",
            "bc1q53mqy5nz74nzt4330ky4wz04x0rw50tcu8f7xj",
            "bc1qe3rauua0pax4nxfd7a7dkuxytnerlp5arrecf3",
        ]

        for (let i = 0; i < 50; i++) {
            const fromCount = i % 4 + 1;
            let totalSend = 0;
            const inputs = from.concat(from).slice(i % from.length, i % from.length + fromCount).map((it) => {
                let amount = parseInt(sha256(it.address + "_" + i).toString(CryptoJS.Hex).substring(0, 8), 16);
                totalSend += amount;
                return {
                    txid: sha256(i + "_" + it.hdPath).toString(CryptoJS.Hex),
                    vout: i % 3,
                    amount,
                    ...it
                }
            });

            const toCount = i % 2 + 1;
            const fee = parseInt(sha256(i + "_" + fromCount + "_" + toCount).toString(CryptoJS.Hex).substring(0, 5), 16);
            const totalOutput = totalSend - fee;
            let currentSendAmount = totalOutput;
            let pos = 0;
            const outputs = to.concat(to).slice(i % to.length, i % to.length + toCount).map((it) => {
                pos++;
                let amount = Math.min(
                    currentSendAmount,
                    parseInt(sha256(it).toString(CryptoJS.Hex).substring(0, 8), 16)
                );
                if (pos == toCount) {
                    amount = currentSendAmount;
                }
                currentSendAmount -= amount;
                return {
                    address: it,
                    amount
                }
            });

            const tx: UnsignedBitcoinTx = {
                inputs,
                outputs,
                fee
            };

            result.push(
                vault.signTx(entryId, tx, "global-password")
                    .then((raw) => {
                        // console.log("raw", raw);

                        expect(raw).toBeDefined();
                        expect(raw.raw.length > 100).toBeTruthy();

                        const parsed = bitcoin.Transaction.fromHex(raw.raw);
                        expect(parsed.hasWitnesses()).toBeTruthy();
                        expect(parsed.getId()).toBe(raw.txid);

                        expect(parsed.ins.length).toBe(fromCount);
                        for (let j = 0; j < fromCount; j++) {
                            const currentInput = parsed.ins[j];
                            const inputHash = Buffer.alloc(currentInput.hash.length);
                            currentInput.hash.copy(inputHash);
                            inputHash.reverse();
                            expect(inputHash.toString('hex')).toBe(inputs[j].txid);
                            expect(currentInput.index).toBe(inputs[j].vout);
                            expect(currentInput.witness[1].toString('hex')).toBe(inputs[j].pk);
                            try {
                                const p2wpkh = bitcoin.payments.p2wpkh({
                                    witness: currentInput.witness,
                                    pubkey: Buffer.from(inputs[j].pk, 'hex'),
                                });
                                const p2pkh = bitcoin.payments.p2pkh({pubkey: p2wpkh.pubkey});
                                const ss = bitcoin.script.signature.decode(p2wpkh.signature);
                                const hash = parsed.hashForWitnessV0(
                                    j, p2pkh.output, inputs[j].amount,
                                    bitcoin.Transaction.SIGHASH_ALL
                                );
                                const keyPair = bitcoin.ECPair.fromWIF(inputs[j].sk);
                                expect(keyPair.verify(hash, ss.signature)).toBeTruthy();
                            } catch (e) {
                                console.log("failed to verify input " + j);
                                throw e;
                            }
                        }

                        expect(parsed.outs.length).toBe(toCount);

                        return raw;
                    })
                    .catch((err) => {
                        console.error("Failed to sign", err.message, tx);
                        throw err;
                    })
            )
        }

        return Promise.all(result);
    }

    test("BTC", async () => {
        let seed_id = await vault.importSeed({
            type: "mnemonic",
            value: {
                value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
            },
            password: "global-password"
        });

        let walletId = await vault.addWallet("test seed");
        let addEntry: AddEntry = {
            blockchain: 1,
            type: "hd-path",
            key: {
                seed: {type: "id", value: seed_id, password: "global-password"},
                hdPath: "m/84'/0'/2'/0/1",
            }
        };
        let entryId = await vault.addEntry(walletId, addEntry);

        await testAll(entryId);
    });

});
