import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "../__tests__/_commons";
import {EthereumEntry, LedgerSeedReference, SeedPKRef, Uuid, BitcoinEntry} from "@emeraldpay/emerald-vault-core";

const IS_CONNECTED = process.env.EMERALD_TEST_LEDGER === 'true';

describe('Verify connection', () => {
    let vault: EmeraldVaultNative;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: tempPath("ledger-seed-btc")
        });
        vault.open();
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
        expect(details).toEqual([
            {type: "ledger", connected: true, app: "bitcoin"}
        ])
    })
});

describe('List addresses', () => {
    let vault: EmeraldVaultNative;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: tempPath("ledger-list-btc")
        });
        vault.open();
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

describe('Create entries', () => {
    let vault: EmeraldVaultNative;

    beforeEach(() => {
        vault = new EmeraldVaultNative({
            dir: tempPath("ledger-with-wallet-btc")
        });
        vault.open();
    });

    test("Create entry", async () => {
        if (!IS_CONNECTED) {
            console.warn("Ignore Ledger tests");
            return;
        }
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
        if (!IS_CONNECTED) {
            console.warn("Ignore Ledger tests");
            return;
        }
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
        if (!IS_CONNECTED) {
            console.warn("Ignore Ledger tests");
            return;
        }
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
        if (!IS_CONNECTED) {
            console.warn("Ignore Ledger tests");
            return;
        }
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
