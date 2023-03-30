import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "../__tests__/_commons";
import {
    LedgerSeedReference,
} from "@emeraldpay/emerald-vault-core";


// Build with:
// $ npm run build:rs:hwkeyemulate

const testAddresses = {
    "m/44'/60'/0'/0/0": '0xDad77910DbDFdE764fC21FCD4E74D71bBACA6D8D',
    "m/44'/60'/0'/0/1": '0xd692Cb1346262F584D17B4B470954501f6715a82',
    "m/44'/60'/0'/0/2": '0xfeb0594A0561d0DF76EA8b2F52271538e6704f75',
    "m/44'/60'/0'/0/3": '0x5c886862AAbA7e342c8708190c42C14BD63e9058',
    "m/44'/60'/0'/0/4": '0x766aedBf5FC4366Fe48D49604CAE12Ba11630A60',
    "m/44'/60'/0'/0/5": '0xbC2F9a0F57d2EDD630f2327C5E0caBff565c6B13',
    "m/44'/60'/0'/0/6": '0xF0eb55adF53795257118Af626206dAb7C43F8b04',
    "m/44'/60'/0'/0/7": '0x2de8e81E02154D954547322e412e3A2b2eE96C82',
    "m/44'/60'/0'/0/8": '0x014a648258C68b02980EF7a610E9468DAf14aBC9',
    "m/44'/60'/0'/0/9": '0xe0EA7FbA9Dc2d1901529CA45d5c2daD908F408E2',
}

describe("Speculos Ethereum Integration Test", () => {

    describe('List addresses', () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("speculos-list")
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
                "m/44'/60'/0'/0/3",
                "m/44'/60'/0'/0/4",
                "m/44'/60'/0'/0/5",
                "m/44'/60'/0'/0/6",
                "m/44'/60'/0'/0/7",
                "m/44'/60'/0'/0/8",
                "m/44'/60'/0'/0/9",
            ]);

            console.log(act);

            expect(act["m/44'/60'/0'/0/0"]).toBeDefined();
            expect(act["m/44'/60'/0'/0/0"]).toBe("0xdad77910dbdfde764fc21fcd4e74d71bbaca6d8d");

            expect(act["m/44'/60'/0'/0/0"]).toBe(testAddresses["m/44'/60'/0'/0/0"].toLowerCase());
            expect(act["m/44'/60'/0'/0/1"]).toBe(testAddresses["m/44'/60'/0'/0/1"].toLowerCase());
            expect(act["m/44'/60'/0'/0/2"]).toBe(testAddresses["m/44'/60'/0'/0/2"].toLowerCase());
            expect(act["m/44'/60'/0'/0/3"]).toBe(testAddresses["m/44'/60'/0'/0/3"].toLowerCase());
            expect(act["m/44'/60'/0'/0/4"]).toBe(testAddresses["m/44'/60'/0'/0/4"].toLowerCase());
            expect(act["m/44'/60'/0'/0/5"]).toBe(testAddresses["m/44'/60'/0'/0/5"].toLowerCase());
            expect(act["m/44'/60'/0'/0/6"]).toBe(testAddresses["m/44'/60'/0'/0/6"].toLowerCase());
            expect(act["m/44'/60'/0'/0/7"]).toBe(testAddresses["m/44'/60'/0'/0/7"].toLowerCase());
            expect(act["m/44'/60'/0'/0/8"]).toBe(testAddresses["m/44'/60'/0'/0/8"].toLowerCase());
            expect(act["m/44'/60'/0'/0/9"]).toBe(testAddresses["m/44'/60'/0'/0/9"].toLowerCase());
        });
    })

})