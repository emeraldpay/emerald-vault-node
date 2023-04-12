import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "../__tests__/_commons";
import {isLedgerDetails} from "@emeraldpay/emerald-vault-core";

describe("Watch Ledger", () => {

    describe('Wait', () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("ledger-watch")
            });
            vault.open();
        });
        afterAll(() => {
            vault.close();
        });

        test("Wait Ethereum connected", async () => {
            let current = await vault.watch({type: "get-current"});
            console.log("Current state", JSON.stringify(current));

            let change = await vault.watch({type: "change", version: current.version});
            console.log("Change", JSON.stringify(change));

            let avail = await vault.watch({type: "available", blockchain: 100});
            console.log("Available", JSON.stringify(avail));
            expect(avail.devices.length).toBe(1);
            expect(avail.devices[0].blockchains).toEqual([100]);
            expect(avail.devices[0].device).toBeDefined();
            expect(avail.devices[0].device.type).toBe("ledger");
            expect(isLedgerDetails(avail.devices[0].device)).toBeTruthy();
            expect(avail.devices[0].device.app).toBe("Ethereum");
        });

        test("Wait Bitcoin connected", async () => {
            let current = await vault.watch({type: "get-current"});
            console.log("Current state", JSON.stringify(current));

            let change = await vault.watch({type: "change", version: current.version});
            console.log("Change", JSON.stringify(change));

            let avail = await vault.watch({type: "available", blockchain: 1});
            console.log("Available", JSON.stringify(avail));
            expect(avail.devices.length).toBe(1);
            expect(avail.devices[0].blockchains).toEqual([1]);
            expect(avail.devices[0].device).toBeDefined();
            expect(avail.devices[0].device.type).toBe("ledger");
            expect(isLedgerDetails(avail.devices[0].device)).toBeTruthy();
            expect(avail.devices[0].device.app).toBe("Bitcoin");
        })
    });

});