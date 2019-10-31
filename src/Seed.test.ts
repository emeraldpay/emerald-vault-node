import { Seed } from './Seed';

const should_exist = process.env.EMERALD_TEST_LEDGER === 'true';

describe('Test ledger', () => {
    const seed = new Seed();

    describe('Ledger connection', () => {
        test("When connected", () => {
            const act = seed.isAvailable();
            expect(act).toBe(should_exist);
        });

    });


    describe('List addresses', () => {

        test("List ethereum", () => {
            if (!should_exist) {
                console.warn("Ignore Ledger tests");
                return;
            }
            const act = seed.listAddresses("ethereum", [
                "m/44'/60'/0'/0/0",
                "m/44'/60'/0'/0/1",
                "m/44'/60'/0'/0/2",
            ]);
            console.log(act);
            expect(act["m/44'/60'/0'/0/0"]).toBe(process.env.EMERALD_TEST_LEDGER_P0.toLowerCase());
            expect(act["m/44'/60'/0'/0/1"]).toBe(process.env.EMERALD_TEST_LEDGER_P1.toLowerCase());
            expect(act["m/44'/60'/0'/0/2"]).toBe(process.env.EMERALD_TEST_LEDGER_P2.toLowerCase());
        });

    });
});

