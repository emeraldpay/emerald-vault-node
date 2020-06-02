import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "../__tests__/_commons";
import {EthereumEntry, SeedDefinition, SeedPKRef, SeedReference, Uuid} from "@emeraldpay/emerald-vault-core";

const shouldExist = process.env.EMERALD_TEST_LEDGER === 'true';

const testAddresses = {
    "m/44'/60'/0'/0/0": '0x3d66483b4cad3518861029ff86a387ebc4705172',
    "m/44'/60'/0'/0/1": '0x40a11b117f14376ca6de569974c7be566249a0d5',
    "m/44'/60'/0'/0/2": '0x722cfc11488ee6fa4041b6fdf8d708b21936f0fa'
}

describe('Use ledger', () => {
    let vault: EmeraldVaultNative;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: tempPath("ledger-seed")
        });
        vault.open();
    });

    const ledgerReference: SeedReference = {
        type: "ledger",
        value: {}
    };
    const ledgerDefinition: SeedDefinition = {
        type: "ledger",
        value: {}
    };

    describe('Ledger connection', () => {
        test("When connected", () => {
            const act = vault.isSeedAvailable(ledgerReference);
            expect(act).toBe(shouldExist);
        });

        test("When created as seed", () => {
            let id: Uuid = vault.importSeed(ledgerDefinition)
            const act = vault.isSeedAvailable(id);
            expect(act).toBe(shouldExist);
        });

    });

    describe('List addresses', () => {
        test("List ethereum", () => {
            if (!shouldExist) {
                console.warn("Ignore Ledger tests");
                return;
            }
            const act = vault.listSeedAddresses(ledgerReference, "ethereum", [
                "m/44'/60'/0'/0/0",
                "m/44'/60'/0'/0/1",
                "m/44'/60'/0'/0/2",
            ]);
            console.log(act);
            expect(act["m/44'/60'/0'/0/0"]).toBe(testAddresses["m/44'/60'/0'/0/0"].toLowerCase());
            expect(act["m/44'/60'/0'/0/1"]).toBe(testAddresses["m/44'/60'/0'/0/1"].toLowerCase());
            expect(act["m/44'/60'/0'/0/2"]).toBe(testAddresses["m/44'/60'/0'/0/2"].toLowerCase());
        });


        test("List ethereum with created ledger", () => {
            if (!shouldExist) {
                console.warn("Ignore Ledger tests");
                return;
            }
            let id: Uuid = vault.importSeed(ledgerDefinition)
            const act = vault.listSeedAddresses(id, "ethereum", [
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

    describe('Use with wallet', () => {
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger-with-wallet")
            });
            vault.open();
        });

        test("Create entry", () => {
            let walletId = vault.addWallet("wallet 1");
            let seedId = vault.importSeed({
                type: "ledger",
                value: {}
            })
            let entryId = vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 100,
                key: {
                    seedId: seedId,
                    hdPath: "m/44'/60'/0'/0/0",
                    address: testAddresses["m/44'/60'/0'/0/0"]
                },
            });
            let wallet = vault.getWallet(walletId);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.key.type).toBe("hd-path");
            let key = entry.key as SeedPKRef;
            expect(key.seedId).toBe(seedId);
            expect(key.hdPath).toBe("m/44'/60'/0'/0/0");
            expect(entry.address).toBe(testAddresses["m/44'/60'/0'/0/0"]);
        });

        test("Cannot create entry if expected address is not equal", () => {
            let walletId = vault.addWallet("wallet 1");
            let seedId = vault.importSeed({
                type: "ledger",
                value: {}
            })
            expect(() => {
                vault.addEntry(walletId, {
                    type: "hd-path",
                    blockchain: 100,
                    key: {
                        seedId: seedId,
                        hdPath: "m/44'/60'/0'/0/0",
                        // use wrong address
                        address: testAddresses["m/44'/60'/0'/0/2"]
                    },
                });
            }).toThrow()
            let wallet = vault.getWallet(walletId);
            expect(wallet.entries.length).toBe(0);
        });

        test("Create few entries", () => {
            let walletId = vault.addWallet("wallet 1");
            let seedId = vault.importSeed({
                type: "ledger",
                value: {}
            })
            vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 100,
                key: {
                    seedId: seedId,
                    hdPath: "m/44'/60'/0'/0/0"
                }
            });
            vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 100,
                key: {
                    seedId: seedId,
                    hdPath: "m/44'/60'/0'/0/1"
                }
            });
            vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 100,
                key: {
                    seedId: seedId,
                    hdPath: "m/44'/60'/0'/0/2"
                }
            });

            let wallet = vault.getWallet(walletId);
            expect(wallet.entries.length).toBe(3);
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.address).toBe(testAddresses["m/44'/60'/0'/0/0"]);
            entry = wallet.entries[1] as EthereumEntry;
            expect(entry.address).toBe(testAddresses["m/44'/60'/0'/0/1"]);
            entry = wallet.entries[2] as EthereumEntry;
            expect(entry.address).toBe(testAddresses["m/44'/60'/0'/0/2"]);
        });

    });
});