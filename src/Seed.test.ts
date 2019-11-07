import { Seed, SeedRef, SeedDefinition } from './Seed';

const should_exist = process.env.EMERALD_TEST_LEDGER === 'true';

describe('Test ledger', () => {
    const seed = new Seed();
    const type: SeedDefinition = {
        type: "ledger",
    };

    describe('Ledger connection', () => {
        test("When connected", () => {
            const act = seed.isAvailable(type);
            expect(act).toBe(should_exist);
        });

    });


    describe('List addresses', () => {

        test("List ethereum", () => {
            if (!should_exist) {
                console.warn("Ignore Ledger tests");
                return;
            }
            const act = seed.listAddresses(type, "ethereum", [
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


describe('Test mnemonic - 24', () => {
    const seed = new Seed();
    const type: SeedDefinition = {
        type: "mnemonic",
        mnemonic: {
            value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
        }
    };

    describe('Check connection', () => {
        test("Always connected", () => {
            const act = seed.isAvailable(type);
            expect(act).toBeTruthy();
        });
    });


    describe('List addresses', () => {

        test("List ethereum", () => {
            const act = seed.listAddresses(type, "ethereum", [
                "m/44'/60'/0'/0/0",
                "m/44'/60'/0'/0/1",
                "m/44'/60'/0'/0/2",
                "m/44'/60'/0'/1/0",
                "m/44'/60'/0'/1/1",
                "m/44'/60'/1'/42/100",
                "m/44'/60'/1'/42/101",
            ]);
            console.log(act);
            expect(act["m/44'/60'/0'/0/0"]).toBe('0x110c84fCC6A775f788d3CA6A9492Abd5B3fEc588'.toLowerCase());
            expect(act["m/44'/60'/0'/0/1"]).toBe('0xb4BbAaC4Acd7E86AF282e80C7a62fda78D071950'.toLowerCase());
            expect(act["m/44'/60'/0'/0/2"]).toBe('0xd1bdBfb39e13aD7969e7D49bf7896AE6A868610C'.toLowerCase());
            expect(act["m/44'/60'/0'/1/0"]).toBe('0xfDdFe028e0157DD8D315C6351C45D7AFf694E9C1'.toLowerCase());
            expect(act["m/44'/60'/0'/1/1"]).toBe('0xe84A870Fa3057B5212B735D0c574F70aA32913dD'.toLowerCase());
            expect(act["m/44'/60'/1'/42/100"]).toBe('0xB0109c9D4837C54c1D8Df7E181f5427B5499BBeC'.toLowerCase());
            expect(act["m/44'/60'/1'/42/101"]).toBe('0x14bBd231A213c0A6715c67DB3b7f191C052C9E17'.toLowerCase());
        });
    });

});

describe('Test mnemonic - 24 with password', () => {
    const seed = new Seed();
    const type: SeedDefinition = {
        type: "mnemonic",
        mnemonic: {
            value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea",
            password: "emerald"
        }
    };

    describe('Check connection', () => {
        test("Always connected", () => {
            const act = seed.isAvailable(type);
            expect(act).toBeTruthy();
        });
    });

    describe('List addresses', () => {

        test("List ethereum", () => {
            const act = seed.listAddresses(type, "ethereum", [
                "m/44'/60'/0'/0/0",
                "m/44'/60'/0'/0/1",
                "m/44'/60'/0'/0/2",
            ]);
            console.log(act);
            expect(act["m/44'/60'/0'/0/0"]).toBe('0x5B1E304FB5923feE02aB6F2d0048096a34330cEF'.toLowerCase());
            expect(act["m/44'/60'/0'/0/1"]).toBe('0x8A66db65fc9da4122ECa06e6089F4989d661AD45'.toLowerCase());
            expect(act["m/44'/60'/0'/0/2"]).toBe('0x62342e8c2f34CBa5407B6e8780aB43215e74CC6A'.toLowerCase());
        });
    });

});

describe('Test mnemonic - 21', () => {
    const seed = new Seed();
    const type: SeedDefinition = {
        type: "mnemonic",
        mnemonic: {
            value: "pepper mention magic uncover vicious spare echo fitness solid bonus phrase predict pen grow lyrics certain swallow grass rain company tuna",
            password: null
        }
    };

    describe('List addresses', () => {

        test("List ethereum", () => {
            const act = seed.listAddresses(type, "ethereum", [
                "m/44'/61'/1'/0/0",
                "m/44'/61'/1'/0/1",
                "m/44'/61'/1'/0/2",
            ]);
            console.log(act);
            expect(act["m/44'/61'/1'/0/0"]).toBe('0x50449D9039660fe13Afc2D75f698F7c0eDdb8818'.toLowerCase());
            expect(act["m/44'/61'/1'/0/1"]).toBe('0xEa6C68Ca34400f7e05C773bce1E4AF6A05D116d4'.toLowerCase());
            expect(act["m/44'/61'/1'/0/2"]).toBe('0x7dC0B25C51fC5FEc597De01C482b734433E577b7'.toLowerCase());
        });
    });

});