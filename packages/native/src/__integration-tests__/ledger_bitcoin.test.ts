import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "../__tests__/_commons";
import {
    LedgerSeedReference,
    SeedPKRef,
    Uuid,
    BitcoinEntry,
    UnsignedTx,
    UnsignedBitcoinTx, EntryId
} from "@emeraldpay/emerald-vault-core";

const IS_CONNECTED = process.env.EMERALD_TEST_LEDGER === 'true';

describe("Bitcoin Integration Test", () => {

    describe('Verify connection', () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger-seed-btc")
            });
            vault.open();
        });
        afterAll(() => {
            vault.close();
        });

        const ledgerReference: LedgerSeedReference = {
            type: "ledger",
        };

        test("As simple reference", async () => {
            const act = await vault.isSeedAvailable(ledgerReference);
            expect(act).toBe(IS_CONNECTED);
        });

        test("When created as seed", async () => {
            let id: Uuid = await vault.importSeed(ledgerReference)
            const act = await vault.isSeedAvailable(id);
            expect(act).toBe(IS_CONNECTED);
        });

        test("App opened", async () => {
            let details = await vault.getConnectedHWDetails();
            expect(details.length).toBeGreaterThanOrEqual(1);
            console.log("details", details[0]);
            expect(details[0].type).toBe("ledger");
            expect(details[0].connected).toBeTruthy();
            expect(details[0].app).toBe("Bitcoin");
            expect(details[0].appVersion).toBeDefined();
        });
    });

    describe('List addresses', () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger-list-btc")
            });
            vault.open();
        });
        afterAll(() => {
            vault.close();
        });

        const ledgerReference: LedgerSeedReference = {
            type: "ledger",
        };

        test("Just list (acc 0)", async () => {
            if (!IS_CONNECTED) {
                console.warn("Ignore Ledger tests");
                return;
            }
            const act = await vault.listSeedAddresses(ledgerReference, 1, [
                "m/84'/0'/0'/0/0",
                "m/84'/0'/0'/0/1",
                "m/84'/0'/0'/1/0",
            ]);
            console.log(act);
            expect(act["m/84'/0'/0'/0/0"]).toBe("bc1qaaayykrrx84clgnpcfqu00nmf2g3mf7f53pk3n");
            expect(act["m/84'/0'/0'/0/1"]).toBe("bc1q9qr2nfsa4eumzf28n79wacw2p5756lj5wmgum8");
            expect(act["m/84'/0'/0'/1/0"]).toBe("bc1ql94lhl8scs00legn005e6x3t8ht2vdk4r9rrmx");
        });

        test("Just list (acc 1)", async () => {
            if (!IS_CONNECTED) {
                console.warn("Ignore Ledger tests");
                return;
            }
            const act = await vault.listSeedAddresses(ledgerReference, 1, [
                "m/84'/0'/1'/0/0",
                "m/84'/0'/1'/0/1",
            ]);
            console.log(act);
            expect(act["m/84'/0'/1'/0/0"]).toBe("bc1q3tfxzcx47yspaejvlvyylvhdn237safumetuch");
            expect(act["m/84'/0'/1'/0/1"]).toBe("bc1q4gtzmz6rujfcpaseddgjuemywx3lqscvc4mtxk");
        });

        test("List with created ledger", async () => {
            if (!IS_CONNECTED) {
                console.warn("Ignore Ledger tests");
                return;
            }
            let id: Uuid = await vault.importSeed(ledgerReference)
            const act = await vault.listSeedAddresses(id, 1, [
                "m/84'/0'/0'/0/0",
                "m/84'/0'/0'/0/1",
            ]);
            console.log(act);
            expect(act["m/84'/0'/0'/0/0"]).toBe("bc1qaaayykrrx84clgnpcfqu00nmf2g3mf7f53pk3n");
            expect(act["m/84'/0'/0'/0/1"]).toBe("bc1q9qr2nfsa4eumzf28n79wacw2p5756lj5wmgum8");
        });
    });

    describe('List xpub', () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger-list-btc")
            });
            vault.open();
        });
        afterAll(() => {
            vault.close();
        });

        const ledgerReference: LedgerSeedReference = {
            type: "ledger",
        };

        test("Just list", async () => {
            const act = await vault.listSeedAddresses(ledgerReference, 1, [
                "m/84'/0'/0'",
                "m/84'/0'/1'",
            ]);
            console.log(act);
            expect(act["m/84'/0'/0'"]).toBe("zpub6rRF9XhDBRQSKiGLTD9vTaBfdpRrxJA9eG5YHmTwFfRN2Rbv7w7XNgCZg93Gk7CdRdfjY5hwM5ugrwXak9RgVsx5fwHfAdHdbf5UKmokEtJ");
            expect(act["m/84'/0'/1'"]).toBe("zpub6rRF9XhDBRQSP251N6St8X4MpUvexnmdu9qFAMXf2xetav5BQ4PNQjKQrC3Sa265foZmoTdtt5sNZVtz5FjwFqrQWiG14th53GB53wQ6E4M");
        });

        test("List with created ledger", async () => {
            let id: Uuid = await vault.importSeed(ledgerReference)
            const act = await vault.listSeedAddresses(id, 1, [
                "m/84'/0'/0'",
                "m/84'/0'/1'",
            ]);
            console.log(act);
            expect(act["m/84'/0'/0'"]).toBe("zpub6rRF9XhDBRQSKiGLTD9vTaBfdpRrxJA9eG5YHmTwFfRN2Rbv7w7XNgCZg93Gk7CdRdfjY5hwM5ugrwXak9RgVsx5fwHfAdHdbf5UKmokEtJ");
            expect(act["m/84'/0'/1'"]).toBe("zpub6rRF9XhDBRQSP251N6St8X4MpUvexnmdu9qFAMXf2xetav5BQ4PNQjKQrC3Sa265foZmoTdtt5sNZVtz5FjwFqrQWiG14th53GB53wQ6E4M");
        });
    });

    describe('Create entries', () => {
        let vault: EmeraldVaultNative;

        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger-with-wallet-btc")
            });
            vault.open();
        });
        afterEach(() => {
            vault.close();
        });

        test("Create entry", async () => {
            let walletId = await vault.addWallet("wallet 1");
            let seedId = await vault.importSeed({
                type: "ledger",
            })
            let entryId = await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 1,
                key: {
                    seed: {type: "id", value: seedId},
                    hdPath: "m/84'/0'/0'"
                },
            });
            let wallet = await vault.getWallet(walletId);
            let entry = wallet.entries[0] as BitcoinEntry;
            expect(entry.key.type).toBe("hd-path");
            let key = entry.key as SeedPKRef;
            expect(key.seedId).toBe(seedId);
            expect(key.hdPath).toBe("m/84'/0'/0'/0/0");
            expect(entry.address).toEqual({
                type: "xpub",
                value: "zpub6rRF9XhDBRQSKiGLTD9vTaBfdpRrxJA9eG5YHmTwFfRN2Rbv7w7XNgCZg93Gk7CdRdfjY5hwM5ugrwXak9RgVsx5fwHfAdHdbf5UKmokEtJ"
            });
        });

        test("Create few entries", async () => {
            let walletId = await vault.addWallet("wallet 1");
            let seedId = await vault.importSeed({
                type: "ledger",
            })
            await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 1,
                key: {
                    seed: {type: "id", value: seedId},
                    hdPath: "m/84'/0'/0'"
                }
            });
            await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 1,
                key: {
                    seed: {type: "id", value: seedId},
                    hdPath: "m/84'/0'/1'"
                }
            });
            await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 1,
                key: {
                    seed: {type: "id", value: seedId},
                    hdPath: "m/84'/0'/2'"
                }
            });

            let wallet = await vault.getWallet(walletId);
            expect(wallet.entries.length).toBe(3);
            let entry = wallet.entries[0] as BitcoinEntry;
            expect(entry.address).toEqual({
                type: "xpub",
                value: "zpub6rRF9XhDBRQSKiGLTD9vTaBfdpRrxJA9eG5YHmTwFfRN2Rbv7w7XNgCZg93Gk7CdRdfjY5hwM5ugrwXak9RgVsx5fwHfAdHdbf5UKmokEtJ"
            });
            entry = wallet.entries[1] as BitcoinEntry;
            expect(entry.address).toEqual({
                type: "xpub",
                value: "zpub6rRF9XhDBRQSP251N6St8X4MpUvexnmdu9qFAMXf2xetav5BQ4PNQjKQrC3Sa265foZmoTdtt5sNZVtz5FjwFqrQWiG14th53GB53wQ6E4M"
            });
            entry = wallet.entries[2] as BitcoinEntry;
            expect(entry.address).toEqual({
                type: "xpub",
                value: "zpub6rRF9XhDBRQSREv5uR3bhbg5jCakrWcRmqCeirqWvGxNSUMu4V3yKBddRYKKqgzoDJ4J4mfDr95zkPCfqGhaFzodtyD4vgT9oNDeGprKqQb"
            });
        });

        test("Create entries right from ledger", async () => {
            expect((await vault.listSeeds()).length).toBe(0);
            let walletId = await vault.addWallet("wallet from ledger");
            let entryId = await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 1,
                key: {
                    seed: {type: "ledger"},
                    hdPath: "m/84'/0'/0'"
                }
            });

            let seeds = await vault.listSeeds();
            expect(seeds.length).toBe(1);
            expect(seeds[0].type).toBe("ledger");
            expect(seeds[0].available).toBeTruthy();


            let entry = (await vault.getWallet(walletId)).entries[0];
            let entryKey = entry.key as SeedPKRef;
            expect(entryKey.type).toBe("hd-path");
            expect(entryKey.seedId).toBe(seeds[0].id);
        });

        test("Create entries from existing ledger by referring", async () => {
            expect((await vault.listSeeds()).length).toBe(0);
            let walletId = await vault.addWallet("wallet from ledger");
            let seedId = await vault.importSeed({
                type: "ledger",
            })
            let entryId = await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 1,
                key: {
                    seed: {type: "ledger"},
                    hdPath: "m/84'/0'/0'"
                }
            });

            let seeds = await vault.listSeeds();
            expect(seeds.length).toBe(1);
            expect(seeds[0].id).toBe(seedId);

            let entry = (await vault.getWallet(walletId)).entries[0];
            let entryKey = entry.key as SeedPKRef;
            expect(entryKey.seedId).toBe(seedId);
        });
    });

    describe('Sign Tx', () => {
        let vault: EmeraldVaultNative;

        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger-with-wallet-btc")
            });
            vault.open();
        });
        afterEach(() => {
            vault.close();
        });

        test("Create entry", async () => {
            let walletId = await vault.addWallet("wallet 1");
            let seedId = await vault.importSeed({
                type: "ledger",
            })
            let entryId = await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 1,
                key: {
                    seed: {type: "id", value: seedId},
                    hdPath: "m/84'/0'/0'"
                },
            });

            let tx: UnsignedBitcoinTx = {
                inputs: [{
                    txid: "38bc4e35c9e63f91ca203439ff7f075c88fe8e63a64a1a462dea01e0c9998dae",
                    vout: 1,
                    amount: 123,
                    hdPath: "m/84'/0'/0'/0/0",
                    address: "bc1qaaayykrrx84clgnpcfqu00nmf2g3mf7f53pk3n",
                    entryId: entryId,
                }],
                outputs: [{
                    address: "bc1qaaayykrrx84clgnpcfqu00nmf2g3mf7f53pk3n",
                    amount: 101,
                }],
                fee: 22
            }

            let txSigned = await vault.signTx(
                entryId, tx, null
            )

            expect(txSigned.raw).toBe("02000000000101ae8d99c9e001ea2d461a4aa6638efe885c077fff393420ca913fe6c9354ebc380100000000feffffff016500000000000000160014ef7a42586331eb8fa261c241c7be7b4a911da7c9024730440220336c4f67ca00ecc50e46f48a5d58c0dab01bebcc09958476f507e2b85e99d3a902203d0925123cf2fed7e6fe07089676d0f1b905c32e5f0791d9f5053df28673151e01210365fa75cc427606b99d9aaa326fdc7d0d30add37c545c5795eab1112839ccb40600000000");

        });
    });
})