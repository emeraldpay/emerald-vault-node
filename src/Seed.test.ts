import { Seed, SeedDefinition } from './Seed';
import {EmeraldVaultNative} from "./EmeraldVaultNative";
import {tempPath} from "./commons_test";
import {AddAccount, EthereumAccount, SeedPKRef} from "./types";
import * as selector from "./selectors";

const should_exist = process.env.EMERALD_TEST_LEDGER === 'true';

describe("Seeds", () => {
    describe('Use ledger', () => {
        const seed = new Seed();
        const type: SeedDefinition = {
            type: "ledger",
            value: "any"
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

    describe("List addresses without import", () => {
        describe('24 words', () => {
            const seed = new Seed();
            const type: SeedDefinition = {
                type: "mnemonic",
                value: {
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

        describe('24 words with password', () => {
            const seed = new Seed();
            const type: SeedDefinition = {
                type: "mnemonic",
                value: {
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

        describe('21 words', () => {
            const seed = new Seed();
            const type: SeedDefinition = {
                type: "mnemonic",
                value: {
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
    });

    describe("Create Seed", () => {
        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("seed-create")
            });
        });

        test("List empty", () => {
            let seeds = vault.seeds().list();
            expect(seeds.length).toBe(0);
        });

        test("Import mnemonic", () => {
            let id = vault.seeds().import({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let seeds = vault.seeds().list();
            expect(seeds.length).toBe(1);
        })
    });

    describe("Create Account", () => {
        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("seed-account")
            });
        });

        test("Create ethereum", () => {
            let id = vault.seeds().import({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test"
            });
            expect(id).toBeDefined();

            let walletId = vault.addWallet("test seed");
            let acc: AddAccount = {
                blockchain: 100,
                type: "hd-path",
                key: {
                    hdPath: "m/44'/60'/0'/0/1",
                    seedId: id,
                    password: "test"
                }
            };
            let accId = vault.addAccount(walletId, acc);
            let wallets = vault.listWallets();
            let wallet = selector.getWallet(wallets, walletId);
            expect(wallet.accounts.length).toBe(1);
            expect(wallet.accounts[0].blockchain).toBe(100);

            let account = wallet.accounts[0] as EthereumAccount;
            expect(account.address).toBe("0xb4BbAaC4Acd7E86AF282e80C7a62fda78D071950".toLowerCase());

            // let key = wallet.accounts[0].key as SeedPKRef;
            // expect(key.hdPath).toBe("m/44'/60'/0'/0/1");
        })
    });
});