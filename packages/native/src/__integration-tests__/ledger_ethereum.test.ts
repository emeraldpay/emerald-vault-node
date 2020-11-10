import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "../__tests__/_commons";
import {
    BitcoinEntry,
    EthereumEntry,
    LedgerSeedReference,
    SeedPKRef,
    Uuid
} from "@emeraldpay/emerald-vault-core";

const IS_CONNECTED = process.env.EMERALD_TEST_LEDGER === 'true';

const testAddresses = {
    "m/44'/60'/0'/0/0": '0x3d66483b4cad3518861029ff86a387ebc4705172',
    "m/44'/60'/0'/0/1": '0x40a11b117f14376ca6de569974c7be566249a0d5',
    "m/44'/60'/0'/0/2": '0x722cfc11488ee6fa4041b6fdf8d708b21936f0fa'
}

describe('Verify connection', () => {
    let vault: EmeraldVaultNative;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: tempPath("ledger-seed")
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
            {type: "ledger", connected: true, app: "ethereum"}
        ])
    });
});

describe('List addresses', () => {
    let vault: EmeraldVaultNative;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: tempPath("ledger-list")
        });
        vault.open();
    });

    const ledgerReference: LedgerSeedReference = {
        type: "ledger",
    };

    test("List ethereum", async () => {
        if (!IS_CONNECTED) {
            console.warn("Ignore Ledger tests");
            return;
        }
        const act = await vault.listSeedAddresses(ledgerReference, 100, [
            "m/44'/60'/0'/0/0",
            "m/44'/60'/0'/0/1",
            "m/44'/60'/0'/0/2",
        ]);
        console.log(act);
        expect(act["m/44'/60'/0'/0/0"]).toBe(testAddresses["m/44'/60'/0'/0/0"].toLowerCase());
        expect(act["m/44'/60'/0'/0/1"]).toBe(testAddresses["m/44'/60'/0'/0/1"].toLowerCase());
        expect(act["m/44'/60'/0'/0/2"]).toBe(testAddresses["m/44'/60'/0'/0/2"].toLowerCase());
    });


    test("List ethereum with created ledger", async () => {
        if (!IS_CONNECTED) {
            console.warn("Ignore Ledger tests");
            return;
        }
        let id: Uuid = await vault.importSeed(ledgerReference)
        const act = await vault.listSeedAddresses(id, 100, [
            "m/44'/60'/0'/0/0",
            "m/44'/60'/0'/0/1",
            "m/44'/60'/0'/0/2",
        ]);
        console.log(act);
        expect(act["m/44'/60'/0'/0/0"]).toBe(testAddresses["m/44'/60'/0'/0/0"].toLowerCase());
        expect(act["m/44'/60'/0'/0/1"]).toBe(testAddresses["m/44'/60'/0'/0/1"].toLowerCase());
        expect(act["m/44'/60'/0'/0/2"]).toBe(testAddresses["m/44'/60'/0'/0/2"].toLowerCase());
    });
});

describe('Create entries', () => {
    let vault: EmeraldVaultNative;

    beforeEach(() => {
        vault = new EmeraldVaultNative({
            dir: tempPath("ledger-with-wallet")
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
            blockchain: 100,
            key: {
                seed: {type: "id", value: seedId},
                hdPath: "m/44'/60'/0'/0/0",
                address: testAddresses["m/44'/60'/0'/0/0"]
            },
        });
        let wallet = await vault.getWallet(walletId);
        let entry = wallet.entries[0] as EthereumEntry;
        expect(entry.key.type).toBe("hd-path");
        let key = entry.key as SeedPKRef;
        expect(key.seedId).toBe(seedId);
        expect(key.hdPath).toBe("m/44'/60'/0'/0/0");
        expect(entry.address).toEqual({type: "single", value: testAddresses["m/44'/60'/0'/0/0"]});
    });

    test("Cannot create entry if expected address is not equal", async () => {
        if (!IS_CONNECTED) {
            console.warn("Ignore Ledger tests");
            return;
        }
        let walletId = await vault.addWallet("wallet 1");
        let seedId = await vault.importSeed({
            type: "ledger",
        })
        await expect(
            vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 100,
                key: {
                    seed: {type: "id", value: seedId},
                    hdPath: "m/44'/60'/0'/0/0",
                    // use wrong address
                    address: testAddresses["m/44'/60'/0'/0/2"]
                },
            })
        ).rejects.toThrow()
        let wallet = await vault.getWallet(walletId);
        expect(wallet.entries.length).toBe(0);
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
            blockchain: 100,
            key: {
                seed: {type: "id", value: seedId},
                hdPath: "m/44'/60'/0'/0/0"
            }
        });
        await vault.addEntry(walletId, {
            type: "hd-path",
            blockchain: 100,
            key: {
                seed: {type: "id", value: seedId},
                hdPath: "m/44'/60'/0'/0/1"
            }
        });
        await vault.addEntry(walletId, {
            type: "hd-path",
            blockchain: 100,
            key: {
                seed: {type: "id", value: seedId},
                hdPath: "m/44'/60'/0'/0/2"
            }
        });

        let wallet = await vault.getWallet(walletId);
        expect(wallet.entries.length).toBe(3);
        let entry = wallet.entries[0] as EthereumEntry;
        expect(entry.address).toEqual({type: "single", value: testAddresses["m/44'/60'/0'/0/0"]});
        entry = wallet.entries[1] as EthereumEntry;
        expect(entry.address).toEqual({type: "single", value: testAddresses["m/44'/60'/0'/0/1"]});
        entry = wallet.entries[2] as EthereumEntry;
        expect(entry.address).toEqual({type: "single", value: testAddresses["m/44'/60'/0'/0/2"]});
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
            blockchain: 100,
            key: {
                seed: {type: "ledger"},
                hdPath: "m/44'/60'/0'/0/0"
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
            blockchain: 100,
            key: {
                seed: {type: "ledger"},
                hdPath: "m/44'/60'/0'/0/0"
            }
        });

        let seeds = await vault.listSeeds();
        expect(seeds.length).toBe(1);
        expect(seeds[0].id).toBe(seedId);

        let entry = (await vault.getWallet(walletId)).entries[0];
        let entryKey = entry.key as SeedPKRef;
        expect(entryKey.seedId).toBe(seedId);
    });

    test("Creates bitcoin entry if xpub provided", async () => {
        let walletId = await vault.addWallet("wallet 1");
        let seedId = await vault.importSeed({
            type: "ledger",
        })
        let entryId = await vault.addEntry(walletId, {
            type: "hd-path",
            blockchain: 1,
            key: {
                seed: {type: "id", value: seedId},
                hdPath: "m/84'/0'/0'",
                address: "zpub6rRF9XhDBRQSKiGLTD9vTaBfdpRrxJA9eG5YHmTwFfRN2Rbv7w7XNgCZg93Gk7CdRdfjY5hwM5ugrwXak9RgVsx5fwHfAdHdbf5UKmokEtJ"
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
});
