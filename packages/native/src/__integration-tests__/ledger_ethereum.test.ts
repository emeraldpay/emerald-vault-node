import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "../__tests__/_commons";
import {
    BitcoinEntry,
    EthereumEntry,
    isEntryId,
    LedgerSeedReference,
    SeedPKRef,
    UnsignedBasicEthereumTx,
    Uuid
} from "@emeraldpay/emerald-vault-core";
import {TransactionFactory} from '@ethereumjs/tx';
import {Common, Hardfork} from '@ethereumjs/common';

const IS_CONNECTED = process.env.EMERALD_TEST_LEDGER === 'true';

const testAddresses = {
    "m/44'/60'/0'/0/0": '0x3d66483b4cad3518861029ff86a387ebc4705172',
    "m/44'/60'/0'/0/1": '0x40a11b117f14376ca6de569974c7be566249a0d5',
    "m/44'/60'/0'/0/2": '0x722cfc11488ee6fa4041b6fdf8d708b21936f0fa',

    "m/44'/61'/0'/0/0": '0x903A5B134315B2A450740eb61C5446A580e4A781',
}

describe("Ethereum Integration Test", () => {

    describe('Wait', () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger-seed")
            });
            vault.open();
        });
        afterAll(() => {
            vault.close();
        });

        test("Wait connected", async () => {
            let avail = await vault.watch({type: "available", blockchain: 100});
            console.log("available", JSON.stringify(avail));
            expect(avail.devices.length).toBe(1);
            expect(avail.devices[0].blockchains).toEqual([100]);
        })
    })

    describe('Verify connection', () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger-seed")
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
            console.log("IS_CONNECTED", IS_CONNECTED)
            expect(act).toBe(IS_CONNECTED);
        });

        test("When created as seed", async () => {
            let id: Uuid = await vault.importSeed(ledgerReference)
            const act = await vault.isSeedAvailable(id);
            expect(act).toBe(IS_CONNECTED);
        });

        test("App opened", async () => {
            let details = await vault.getConnectedHWDetails();
            console.log("details", details[0]);
            expect(details[0].type).toBe("ledger");
            expect(details[0].connected).toBeTruthy();
            expect(details[0].app).toBe("Ethereum");
            expect(details[0].appVersion).toBeDefined();
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
        afterEach(() => {
            vault.close();
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

        test("Create few entries right from ledger", async () => {
            if (!IS_CONNECTED) {
                console.warn("Ignore Ledger tests");
                return;
            }
            expect((await vault.listSeeds()).length).toBe(0);
            let walletId = await vault.addWallet("wallet from ledger");
            let entryId1 = await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 100,
                key: {
                    seed: {type: "ledger"},
                    hdPath: "m/44'/60'/0'/0/0",
                }
            });

            expect(isEntryId(entryId1)).toBeTruthy();

            let entryId2 = await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 100,
                key: {
                    seed: {type: "ledger"},
                    hdPath: "m/44'/60'/0'/0/1"
                }
            });

            expect(isEntryId(entryId2)).toBeTruthy();

            let seeds = await vault.listSeeds();
            console.log("seeds", seeds);
            expect(seeds.length).toBe(1);
            expect(seeds[0].type).toBe("ledger");
            expect(seeds[0].available).toBeTruthy();

            let entry1 = (await vault.getWallet(walletId)).entries[0];
            let entry1Key = entry1.key as SeedPKRef;
            expect(entry1Key.type).toBe("hd-path");
            expect(entry1Key.seedId).toBe(seeds[0].id);

            let entry2 = (await vault.getWallet(walletId)).entries[1];
            let entry2Key = entry2.key as SeedPKRef;
            expect(entry2Key.type).toBe("hd-path");
            expect(entry2Key.seedId).toBe(seeds[0].id);
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

    describe('Sign Tx', () => {
        let vault: EmeraldVaultNative;

        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger-with-wallet")
            });
            vault.open();
        });
        afterEach(() => {
            vault.close();
        });

        test("Sign standard ETH tx", async () => {
            if (!IS_CONNECTED) {
                console.warn("Ignore Ledger tests");
                return;
            }
            let walletId = await vault.addWallet("wallet 1");
            let seedId = await vault.importSeed({
                type: "ledger",
            })
            let ledgers = await vault.getConnectedHWDetails();
            expect(ledgers.length).toBe(1);
            expect(ledgers[0].seedId).toBeNull();
            let entryId = await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 100,
                key: {
                    seed: {type: "id", value: seedId},
                    hdPath: "m/44'/60'/0'/0/0",
                    address: testAddresses["m/44'/60'/0'/0/0"]
                },
            });

            let tx: UnsignedBasicEthereumTx = {
                from: "0x3d66483b4cad3518861029ff86a387ebc4705172",
                to: "0x3d66483b4cad3518861029ff86a387ebc4705172",
                value: "0",
                gas: 21000,
                gasPrice: "10000000",
                nonce: 1,
            }

            let txSigned = await vault.signTx(
                entryId, tx, null
            )

            // first check with an external lib in case we have a broken logic
            const data = Buffer.from(txSigned.raw.slice(2), 'hex');
            let options = new Common({ hardfork: Hardfork.Shanghai, chain: 1 });
            let parsedTx = TransactionFactory.fromSerializedData(data, {common: options});
            expect(parsedTx.isSigned()).toBeTruthy();
            expect(parsedTx.verifySignature()).toBeTruthy();
            expect(parsedTx.getSenderAddress().toString().toLowerCase()).toBe("0x3d66483b4cad3518861029ff86a387ebc4705172");

            // that's an expected encoded tx
            expect(txSigned.raw).toBe("0xf8620183989680825208943d66483b4cad3518861029ff86a387ebc47051728080" +
                "26" + // encoded chain id
                "a099a1d0271a0e3c3d2cd1f659b262675646653a0a3ca6adc6f1c3ec93a589572e" +
                "a039ea3005f6baaf56e03440254065cf5ae7020e7c31cdc3fbf305c7fbe262a3db");

            // after a successful signature seed must learn its ledger device (though it may learn it on adding the entry too)
            let ledgers2 = await vault.getConnectedHWDetails();
            expect(ledgers2.length).toBe(1);
            expect(ledgers2[0].seedId).toBe(seedId);

            let watchCurrent = await vault.watch({type: "get-current"});
            expect(watchCurrent.devices[0].device!!.seedId).toBe(seedId);
        });

        test("Sign standard ETC tx", async () => {
            if (!IS_CONNECTED) {
                console.warn("Ignore Ledger tests");
                return;
            }
            let walletId = await vault.addWallet("wallet 1");
            let seedId = await vault.importSeed({
                type: "ledger",
            })
            let ledgers = await vault.getConnectedHWDetails();
            expect(ledgers.length).toBe(1);
            expect(ledgers[0].seedId).toBeNull();
            let entryId = await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 101,
                key: {
                    seed: {type: "id", value: seedId},
                    hdPath: "m/44'/61'/0'/0/0",
                    address: testAddresses["m/44'/61'/0'/0/0"]
                },
            });

            let tx: UnsignedBasicEthereumTx = {
                from: "0x903A5B134315B2A450740eb61C5446A580e4A781",
                to: "0x903A5B134315B2A450740eb61C5446A580e4A781",
                value: "0",
                gas: 21000,
                gasPrice: "10000000",
                nonce: 1,
            }

            let txSigned = await vault.signTx(
                entryId, tx, null
            )

            // first check with an external lib in case we have a broken logic
            const data = Buffer.from(txSigned.raw.slice(2), 'hex');
            let options = Common.custom({ chainId: 61 }, { baseChain: 1, hardfork: Hardfork.Byzantium });
            let parsedTx = TransactionFactory.fromSerializedData(data, {common: options});
            expect(parsedTx.isSigned()).toBeTruthy();
            expect(parsedTx.verifySignature()).toBeTruthy();
            expect(parsedTx.getSenderAddress().toString().toLowerCase()).toBe("0x903a5b134315b2a450740eb61c5446a580e4a781");

            // that's an expected encoded tx
            expect(txSigned.raw).toBe("0xf863018398968082520894903a5b134315b2a450740eb61c5446a580e4a781808081" +
                "9d" + // encoded chain id
                "a011faa926106ef424580c8166202b6497e4b0649a334092b5c46b7793476e6b7b" +
                "a05a70fefbd65b8937ca152110b9f15e5688856c678ae7baa6901b0ffdbeb77e78");

            // after a successful signature seed must learn its ledger device (though it may learn it on adding the entry too)
            let ledgers2 = await vault.getConnectedHWDetails();
            expect(ledgers2.length).toBe(1);
            expect(ledgers2[0].seedId).toBe(seedId);

            let watchCurrent = await vault.watch({type: "get-current"});
            expect(watchCurrent.devices[0].device!!.seedId).toBe(seedId);
        });
    });

});
