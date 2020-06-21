import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "./_commons";
import {
    AddEntry,
    EthereumEntry,
    WalletsOp,
    WalletOp,
    SeedReference,
    MnemonicSeedDefinition
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
                test("Always connected", () => {
                    const act = vault.isSeedAvailable(type);
                    expect(act).toBeTruthy();
                });
            });


            describe('List addresses', () => {

                test("List ethereum", () => {
                    const act = vault.listSeedAddresses(type, "ethereum", [
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
                test("Always connected", () => {
                    const act = vault.isSeedAvailable(type);
                    expect(act).toBeTruthy();
                });
            });

            describe('List addresses', () => {

                test("List ethereum", () => {
                    const act = vault.listSeedAddresses(type, "ethereum", [
                        "m/44'/60'/0'/0/0",
                        "m/44'/60'/0'/0/1",
                        "m/44'/60'/0'/0/2",
                    ]);
                    // console.log(act);
                    expect(act["m/44'/60'/0'/0/0"]).toBe('0x5B1E304FB5923feE02aB6F2d0048096a34330cEF'.toLowerCase());
                    expect(act["m/44'/60'/0'/0/1"]).toBe('0x8A66db65fc9da4122ECa06e6089F4989d661AD45'.toLowerCase());
                    expect(act["m/44'/60'/0'/0/2"]).toBe('0x62342e8c2f34CBa5407B6e8780aB43215e74CC6A'.toLowerCase());
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

                test("List ethereum", () => {
                    const act = vault.listSeedAddresses(type, "ethereum", [
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
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("seed-create")
            });
        });

        test("List empty", () => {
            let seeds = vault.listSeeds();
            expect(seeds.length).toBe(0);
        });

        test("Import mnemonic", () => {
            let id = vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let seeds = vault.listSeeds();
            expect(seeds.length).toBe(1);

            let available = vault.isSeedAvailable(id);
            expect(available).toBeTruthy();

            let ref: SeedReference = {
                type: "id",
                value: id,
                password: "test"
            }

            let addresses = vault.listSeedAddresses(ref, "ethereum", ["m/44'/60'/0'/0/1"]);
            expect(addresses["m/44'/60'/0'/0/1"].toLowerCase()).toBe("0xb4BbAaC4Acd7E86AF282e80C7a62fda78D071950".toLowerCase())
        });

        test("Create with label", () => {
            let id = vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test",
                label: "Hello World!",
            });
            expect(id).toBeDefined();
            let seed = vault.listSeeds()[0];
            expect(seed.id).toBe(id);
            expect(seed.label).toBe("Hello World!");
        });

        test("Uses current date", () => {
            const start = new Date();
            let id = vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test",
            });
            expect(id).toBeDefined();
            let seed = vault.listSeeds()[0];
            expect(seed.id).toBe(id);
            expect(seed.createdAt).toBeDefined();
            const createdAt = new Date(seed.createdAt);
            expect(createdAt.getTime()).toBeGreaterThanOrEqual(start.getTime());
            expect(createdAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
        });

    });

    describe("Create Entry", () => {
        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("seed-entry")
            });
        });

        test("Create ethereum", () => {
            let id = vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let walletId = vault.addWallet("test seed");
            let addEntry: AddEntry = {
                blockchain: 100,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: id, password: "test"},
                    hdPath: "m/44'/60'/0'/0/1",
                }
            };
            let accId = vault.addEntry(walletId, addEntry);
            let wallets = vault.listWallets();
            let wallet = WalletsOp.of(wallets).getWallet(walletId).value;
            expect(wallet.entries.length).toBe(1);
            expect(wallet.entries[0].blockchain).toBe(100);
            expect(wallet.entries[0].receiveDisabled).toBeFalsy();
            let entry = wallet.entries[0] as EthereumEntry;
            expect(entry.address).toBe("0xb4BbAaC4Acd7E86AF282e80C7a62fda78D071950".toLowerCase());
            let reserved = WalletOp.of(wallet).getHDAccounts();
            let expReserved = {};
            expReserved[id] = [0];
            expect(reserved).toStrictEqual(expReserved)

            // let key = wallet.entries[0].key as SeedPKRef;
            // expect(key.hdPath).toBe("m/44'/60'/0'/0/1");
        })
    });
});