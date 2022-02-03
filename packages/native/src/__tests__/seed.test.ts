import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "./_commons";
import {
    SeedReference,
    MnemonicSeedDefinition, BlockchainId
} from "@emeraldpay/emerald-vault-core";

describe("Seeds", () => {

    describe("List addresses without import", () => {
        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("seed")
            });
            vault.open();
        });

        describe('24 words', () => {

            const type: MnemonicSeedDefinition = {
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea",
                    password: undefined
                }
            };

            describe('Check connection', () => {
                test("Always connected", async () => {
                    const act = await vault.isSeedAvailable(type);
                    expect(act).toBeTruthy();
                });
            });


            describe('List addresses', () => {

                test("List ethereum", async () => {
                    const act = await vault.listSeedAddresses(type, BlockchainId.ETHEREUM, [
                        "m/44'/60'/0'/0/0",
                        "m/44'/60'/0'/0/1",
                        "m/44'/60'/0'/0/2",
                        "m/44'/60'/0'/1/0",
                        "m/44'/60'/0'/1/1",
                        "m/44'/60'/1'/42/100",
                        "m/44'/60'/1'/42/101",
                    ]);
                    // console.log(act);
                    expect(act["m/44'/60'/0'/0/0"]).toBe('0x110c84fCC6A775f788d3CA6A9492Abd5B3fEc588'.toLowerCase());
                    expect(act["m/44'/60'/0'/0/1"]).toBe('0xb4BbAaC4Acd7E86AF282e80C7a62fda78D071950'.toLowerCase());
                    expect(act["m/44'/60'/0'/0/2"]).toBe('0xd1bdBfb39e13aD7969e7D49bf7896AE6A868610C'.toLowerCase());
                    expect(act["m/44'/60'/0'/1/0"]).toBe('0xfDdFe028e0157DD8D315C6351C45D7AFf694E9C1'.toLowerCase());
                    expect(act["m/44'/60'/0'/1/1"]).toBe('0xe84A870Fa3057B5212B735D0c574F70aA32913dD'.toLowerCase());
                    expect(act["m/44'/60'/1'/42/100"]).toBe('0xB0109c9D4837C54c1D8Df7E181f5427B5499BBeC'.toLowerCase());
                    expect(act["m/44'/60'/1'/42/101"]).toBe('0x14bBd231A213c0A6715c67DB3b7f191C052C9E17'.toLowerCase());
                });

                test("List bitcoin", async () => {
                    const act = await vault.listSeedAddresses(type, BlockchainId.BITCOIN, [
                        "m/84'/0'/0'/0/0",
                        "m/84'/0'/0'/0/1",
                        "m/84'/0'/1'/0/0"
                    ]);
                    // console.log(act);
                    expect(act["m/84'/0'/0'/0/0"]).toBe('bc1qxqz4qerrm662nt4hxh39mqltvqcffcvzzfc49z');
                    expect(act["m/84'/0'/0'/0/1"]).toBe('bc1qj4zhepcsjp6gpqf252329daum6ey6hhqagccaf');
                    expect(act["m/84'/0'/1'/0/0"]).toBe('bc1qhetq9vhlk3pdxn8a3754z8ntz7yqvh8tsduqkt');
                });

                test("List bitcoin xpub", async () => {
                    const act = await vault.listSeedAddresses(type, BlockchainId.BITCOIN, [
                        "m/84'/0'/0'",
                        "m/84'/0'/1'",
                        "m/44'/0'/0'",
                        "m/49'/0'/0'",
                    ]);
                    // console.log(act);
                    expect(act["m/84'/0'/0'"]).toBe('zpub6rgquuQgjiNdUjkU7qZck9t3JU5K9U9EG2aVAwzDy2BJKHKMekVNsyZF2e4dw9L9AoT9WHy5iDVdUHz2XkrANy5LRVGLt3XMkar752N2hvq');
                    expect(act["m/84'/0'/1'"]).toBe('zpub6rgquuQgjiNdWtkm1t1XUnnTC5qDJoDrVwoUnMC6bEb8cWSRRDYcqGM4BpXbzhfHkWAGWh2VjZiYKyh9qVdpTkJEvgXgB9g5U2iRE3jiDgQ');
                    expect(act["m/44'/0'/0'"]).toBe('xpub6DRy3BJWmkVz5WVunR37BpXM48ARFhTQCLZJN3rjtSgRDsz2zbU9E3BGtpr2kpWAmQ2oYMkWjDjSigQCQu1xbEp5gRVoKUvbT1L8CbPrVLS');
                    expect(act["m/49'/0'/0'"]).toBe('ypub6XKWqjEULzxUZ1AaNausD7JFWzg8jKCFmdycJpojoiRLDCNuLxKREUXnvTD26q3AAsiSBDymo2E21yhAiUY8Vrnu4UHQvfTrKRcvzyV2Pd2');
                });
            });

        });

        describe('24 words with password', () => {
            const type: MnemonicSeedDefinition = {
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea",
                    password: "emerald"
                }
            };

            describe('Check connection', () => {
                test("Always connected", async () => {
                    const act = await vault.isSeedAvailable(type);
                    expect(act).toBeTruthy();
                });
            });

            describe('List addresses', () => {

                test("List ethereum", async () => {
                    const act = await vault.listSeedAddresses(type, BlockchainId.ETHEREUM, [
                        "m/44'/60'/0'/0/0",
                        "m/44'/60'/0'/0/1",
                        "m/44'/60'/0'/0/2",
                    ]);
                    // console.log(act);
                    expect(act["m/44'/60'/0'/0/0"]).toBe('0x5B1E304FB5923feE02aB6F2d0048096a34330cEF'.toLowerCase());
                    expect(act["m/44'/60'/0'/0/1"]).toBe('0x8A66db65fc9da4122ECa06e6089F4989d661AD45'.toLowerCase());
                    expect(act["m/44'/60'/0'/0/2"]).toBe('0x62342e8c2f34CBa5407B6e8780aB43215e74CC6A'.toLowerCase());
                });

                test("List Goerli Testnet", async () => {
                    const act = await vault.listSeedAddresses(type, BlockchainId.GOERLI_TESTNET, [
                        "m/44'/60'/160720'/0/0",
                        "m/44'/60'/160720'/0/1",
                        "m/44'/60'/160720'/0/2",
                    ]);
                    // console.log(act);
                    expect(act["m/44'/60'/160720'/0/0"]).toBe('0x4D5C1AA948De28c61CF86FEeEe8fc79061Df9398'.toLowerCase());
                    expect(act["m/44'/60'/160720'/0/1"]).toBe('0xE755197C5152a3D10ab9C37aE86778ee083D04B6'.toLowerCase());
                    expect(act["m/44'/60'/160720'/0/2"]).toBe('0x7a328887BD35a55D1F85dAb8FF39673bEFF9Fe10'.toLowerCase());
                });

                test("List bitcoin", async () => {
                    const act = await vault.listSeedAddresses(type, BlockchainId.BITCOIN, [
                        "m/84'/0'/0'/0/0",
                        "m/84'/0'/0'/0/1",
                        "m/84'/0'/1'/0/0"
                    ]);
                    // console.log(act);
                    expect(act["m/84'/0'/0'/0/0"]).toBe('bc1qgjxdwjyqr647m73vp5yvlyaetfmksj4ra5ttyt');
                    expect(act["m/84'/0'/0'/0/1"]).toBe('bc1q9s5nnp3ynsh6emhq82gja64geqtljp04jvqdp7');
                    expect(act["m/84'/0'/1'/0/0"]).toBe('bc1q553u2fatq9lk8yvdg7xcasyn42gygr2d0eu9rj');
                });
            });

        });

        describe('21 words', () => {
            const type: MnemonicSeedDefinition = {
                type: "mnemonic",
                value: {
                    value: "pepper mention magic uncover vicious spare echo fitness solid bonus phrase predict pen grow lyrics certain swallow grass rain company tuna",
                    password: null
                }
            };

            describe('List addresses', () => {

                test("List ethereum", async () => {
                    const act = await vault.listSeedAddresses(type, BlockchainId.ETHEREUM_CLASSIC, [
                        "m/44'/61'/1'/0/0",
                        "m/44'/61'/1'/0/1",
                        "m/44'/61'/1'/0/2",
                    ]);
                    // console.log(act);
                    expect(act["m/44'/61'/1'/0/0"]).toBe('0x50449D9039660fe13Afc2D75f698F7c0eDdb8818'.toLowerCase());
                    expect(act["m/44'/61'/1'/0/1"]).toBe('0xEa6C68Ca34400f7e05C773bce1E4AF6A05D116d4'.toLowerCase());
                    expect(act["m/44'/61'/1'/0/2"]).toBe('0x7dC0B25C51fC5FEc597De01C482b734433E577b7'.toLowerCase());
                });
            });

        });
    });

    describe("Create Seed", () => {
        let vault: EmeraldVaultNative;
        beforeEach(async () => {
            vault = new EmeraldVaultNative({
                dir: tempPath("seed-create")
            });
            await vault.createGlobalKey("test-global")
        });

        test("List empty", async () => {
            let seeds = await vault.listSeeds();
            expect(seeds.length).toBe(0);
        });

        test("Import mnemonic", async () => {
            let id = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test-global"
            });
            expect(id).toBeDefined();

            let seeds = await vault.listSeeds();
            expect(seeds.length).toBe(1);

            let available = await vault.isSeedAvailable(id);
            expect(available).toBeTruthy();

            let ref: SeedReference = {
                type: "id",
                value: id,
                password: "test-global"
            }

            let addresses = await vault.listSeedAddresses(ref, BlockchainId.ETHEREUM, ["m/44'/60'/0'/0/1"]);
            expect(addresses["m/44'/60'/0'/0/1"].toLowerCase()).toBe("0xb4BbAaC4Acd7E86AF282e80C7a62fda78D071950".toLowerCase())
        });

        test("Create with label", async () => {
            let id = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test-global",
                label: "Hello World!",
            });
            expect(id).toBeDefined();
            let seed = (await vault.listSeeds())[0];
            expect(seed.id).toBe(id);
            expect(seed.label).toBe("Hello World!");
        });

        test("Uses current date", async () => {
            const start = new Date();
            let id = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test-global",
            });
            expect(id).toBeDefined();
            let seed = (await vault.listSeeds())[0];
            expect(seed.id).toBe(id);
            expect(seed.createdAt).toBeDefined();
            const createdAt = new Date(seed.createdAt);
            expect(createdAt.getTime()).toBeGreaterThanOrEqual(start.getTime());
            //sometimes fails, with couple of millis skew on check, so add extra 10ms window
            expect(createdAt.getTime()).toBeLessThanOrEqual(new Date().getTime() + 10);
        });

    });

});