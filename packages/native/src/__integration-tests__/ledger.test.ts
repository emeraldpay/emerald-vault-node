import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "../__tests__/_commons";
import {SeedDefinition} from "@emeraldpay/emerald-vault-core";

const should_exist = process.env.EMERALD_TEST_LEDGER === 'true';

describe('Use ledger', () => {
    let vault: EmeraldVaultNative;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: tempPath("seed")
        });
        vault.open();
    });

    const type: SeedDefinition = {
        type: "ledger",
        value: "any"
    };

    describe('Ledger connection', () => {
        test("When connected", () => {
            const act = vault.isSeedAvailable(type);
            expect(act).toBe(should_exist);
        });

    });


    describe('List addresses', () => {

        test("List ethereum", () => {
            if (!should_exist) {
                console.warn("Ignore Ledger tests");
                return;
            }
            const act = vault.listSeedAddresses(type, "ethereum", [
                "m/44'/60'/0'/0/0",
                "m/44'/60'/0'/0/1",
                "m/44'/60'/0'/0/2",
            ]);
            // console.log(act);
            expect(act["m/44'/60'/0'/0/0"]).toBe(process.env.EMERALD_TEST_LEDGER_P0.toLowerCase());
            expect(act["m/44'/60'/0'/0/1"]).toBe(process.env.EMERALD_TEST_LEDGER_P1.toLowerCase());
            expect(act["m/44'/60'/0'/0/2"]).toBe(process.env.EMERALD_TEST_LEDGER_P2.toLowerCase());
        });

    });
});