import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "../__tests__/_commons";
import {BlockchainId, isLedgerDetails} from "@emeraldpay/emerald-vault-core";

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

    describe('Get addresses', () => {
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

        test("Get Bitcoin and Ethereum addresses", async () => {
            let current = await vault.watch({type: "get-current"});
            console.log("Current state", JSON.stringify(current));

            let bitcoin = vault
                .watch({type: "available", blockchain: 1})
                .then((event) => {
                    console.log("Bitcoin available", JSON.stringify(event));
                    return vault.listSeedAddresses({type: "ledger"}, BlockchainId.BITCOIN, ["m/84'/0'/0'/0/0"])
                })
                .then((addresses) => {
                    console.log("Bitcoin addresses", JSON.stringify(addresses));
                    return addresses["m/84'/0'/0'/0/0"];
                });

            let ethereum = vault
                .watch({type: "available", blockchain: 100})
                .then((event) => {
                    console.log("Ethereum available", JSON.stringify(event));
                    return vault.listSeedAddresses({type: "ledger"}, BlockchainId.ETHEREUM, ["m/44'/60'/0'/0/0"]);
                })
                .then((addresses) => {
                    console.log("Ethereum addresses", JSON.stringify(addresses));
                    return addresses["m/44'/60'/0'/0/0"];
                });

            let results = await Promise.all([bitcoin, ethereum]);

            expect(results[0]).toBe("bc1qaaayykrrx84clgnpcfqu00nmf2g3mf7f53pk3n");
            expect(results[1]).toBe("0x3d66483b4cad3518861029ff86a387ebc4705172");
        });
    });

});