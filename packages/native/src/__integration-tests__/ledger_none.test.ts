import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "../__tests__/_commons";
import {SeedPKRef} from "@emeraldpay/emerald-vault-core";

const IS_CONNECTED = process.env.EMERALD_TEST_LEDGER === 'true';

describe("Ledger Integration Test", () => {

    describe('When connected', () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger")
            });
            vault.open();
        });

        test("Apps", async () => {
            if (!IS_CONNECTED) {
                return
            }
            let details = await vault.getConnectedHWDetails();
            console.log("Apps", details);
            expect(details.length).toBe(1);
            details.forEach((d) =>
                expect(d.app).toBeNull()
            )
        });

        test("Create entries without app open", async () => {
            if (!IS_CONNECTED) {
                console.warn("Ignore Ledger tests");
                return;
            }

            expect((await vault.listSeeds()).length).toBe(0);
            let walletId = await vault.addWallet("wallet from ledger");
            let entryId1 = await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 1,
                key: {
                    seed: {type: "ledger"},
                    hdPath: "m/84'/0'/0'/0/0",
                    address: "zpub6rRF9XhDBRQSKiGLTD9vTaBfdpRrxJA9eG5YHmTwFfRN2Rbv7w7XNgCZg93Gk7CdRdfjY5hwM5ugrwXak9RgVsx5fwHfAdHdbf5UKmokEtJ"
                }
            });
            let entryId2 = await vault.addEntry(walletId, {
                type: "hd-path",
                blockchain: 100,
                key: {
                    seed: {type: "ledger"},
                    hdPath: "m/44'/60'/0'/0/0",
                    address: "0x3d66483b4Cad3518861029Ff86a387eBc4705172"
                }
            });

            let wallet = await vault.getWallet(walletId);
            console.log("wallet", wallet);
            expect(wallet.entries.length).toBe(2);
        });
    });

    describe('When not connected', () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger")
            });
            vault.open();
        });

        test("Apps", async () => {
            if (IS_CONNECTED) {
                return
            }
            let conn = await vault.isSeedAvailable({type: "ledger"})
            expect(conn).toBeFalsy();
        });
    });

})