import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "../__tests__/_commons";

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