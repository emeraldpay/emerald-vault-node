import { Seed } from './Seed';

const should_exist = process.env.EMERALD_TEST_LEDGER === 'true';

describe('Test connection', () => {

    const seed = new Seed();

    test("When connected", () => {
        const act = seed.isAvailable();
        expect(act).toBe(should_exist);
    });

});