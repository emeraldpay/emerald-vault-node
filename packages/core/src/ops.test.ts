import {EthereumAccount, Wallet} from "./types";
import {AccountIdOp, WalletOp, WalletsOp} from "./ops";

describe("Ops", () => {

    describe("WalletOp", () => {
        test("typeof", () => {
            let data: Wallet = {
                id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                accounts: [],
                name: "test"
            };

            let wallet = WalletOp.of(data);

            expect(WalletOp.isOp(data)).toBeFalsy();
            expect(WalletOp.isOp(wallet)).toBeTruthy();

            // @ts-ignore
            expect(WalletOp.isOp({})).toBeFalsy();
            expect(WalletOp.isOp(null)).toBeFalsy();
            expect(WalletOp.isOp(undefined)).toBeFalsy();
        });

        test("convert to op", () => {
            let data: Wallet = {
                id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                accounts: [],
                name: "test"
            };

            let wallet = WalletOp.of(data);

            expect(WalletOp.isOp(WalletOp.asOp(wallet))).toBeTruthy();
            expect(WalletOp.isOp(WalletOp.asOp(data))).toBeTruthy();
        });

        describe("return active HDPath accounts", () => {
            test("single", () => {
                let acc1: EthereumAccount = {
                    address: '0x343d1de24ac7a891575857855c5579f9de19b427',
                    blockchain: 100,
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feae1',
                    key: {
                        type: "seed-hd",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc'
                    }
                };
                let wallet1: Wallet = {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    accounts: [acc1],
                    name: "test"
                };

                let act = WalletOp.of(wallet1).getActiveHdAccounts();
                expect(act.length).toBe(1);
                expect(act[0]).toStrictEqual({seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc', accountId: 0})
            });

            test("two on different seed", () => {
                let acc1: EthereumAccount = {
                    address: '0x343d1de24ac7a891575857855c5579f9de19b427',
                    blockchain: 100,
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feae1',
                    key: {
                        type: "seed-hd",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc'
                    }
                };
                let acc2: EthereumAccount = {
                    address: '0x343d1de24ac7a891575857855c5579f9de19b427',
                    blockchain: 100,
                    id: '364b848e-caf2-43db-a3b5-375f64a61bf4',
                    key: {
                        type: "seed-hd",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892'
                    }
                };
                let wallet1: Wallet = {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    accounts: [acc1, acc2],
                    name: "test"
                };

                let act = WalletOp.of(wallet1).getActiveHdAccounts();
                expect(act.length).toBe(2);
                expect(act[0]).toStrictEqual({seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc', accountId: 0});
                expect(act[1]).toStrictEqual({seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892', accountId: 0});
            });

            test("multiple", () => {
                let acc1: EthereumAccount = {
                    address: '0x343d1de24ac7a891575857855c5579f9de19b427',
                    blockchain: 100,
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feae1',
                    key: {
                        type: "seed-hd",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc'
                    }
                };

                let acc2: EthereumAccount = {
                    address: '0x343d1de24ac7a891575857855c5579f9de19b427',
                    blockchain: 100,
                    id: '364b848e-caf2-43db-a3b5-375f64a61bf4',
                    key: {
                        type: "seed-hd",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892'
                    }
                };
                let acc3: EthereumAccount = {
                    address: '0x343d1de24ac7a891575857855c5579f9de19b427',
                    blockchain: 100,
                    id: '364b848e-caf2-43db-a3b5-375f64a61bf4',
                    key: {
                        type: "seed-hd",
                        hdPath: "m/44'/60'/1'/0/0",
                        seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892'
                    }
                };
                let acc4: EthereumAccount = {
                    address: '0x343d1de24ac7a891575857855c5579f9de19b427',
                    blockchain: 100,
                    id: '364b848e-caf2-43db-a3b5-375f64a61bf4',
                    key: {
                        type: "seed-hd",
                        hdPath: "m/44'/60'/5'/0/0",
                        seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892'
                    }
                };

                let acc5: EthereumAccount = {
                    address: '0x343d1de24ac7a891575857855c5579f9de19b427',
                    blockchain: 101,
                    id: '364b848e-caf2-43db-a3b5-375f64a61bf4',
                    key: {
                        type: "seed-hd",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892'
                    }
                };

                let wallet1: Wallet = {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    //acc5 is same path for different coin
                    accounts: [acc1, acc2, acc3, acc4, acc5],
                    name: "test"
                };

                let act = WalletOp.of(wallet1).getActiveHdAccounts();
                expect(act.length).toBe(4);
                expect(act[0]).toStrictEqual({seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc', accountId: 0});
                expect(act[1]).toStrictEqual({seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892', accountId: 0});
                expect(act[2]).toStrictEqual({seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892', accountId: 1});
                expect(act[3]).toStrictEqual({seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892', accountId: 5});
            });

        })
    });

    describe("WalletsOp", () => {
        test("typeof", () => {
            let data: Wallet[] = [
                {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    accounts: [],
                    name: "test"
                },
                {
                    id: '6a79d3ff-7d96-42f8-bcff-000325f5e900',
                    accounts: []
                }
            ];

            let wallets = WalletsOp.of(data);

            expect(WalletsOp.isOp(data)).toBeFalsy();
            expect(WalletsOp.isOp(wallets)).toBeTruthy();

            // @ts-ignore
            expect(WalletsOp.isOp(wallets.getWallets()[0])).toBeFalsy();
            expect(WalletsOp.isOp(null)).toBeFalsy();
            expect(WalletsOp.isOp(undefined)).toBeFalsy();
        });

        test("convert to op", () => {
            let data: Wallet[] = [
                {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    accounts: [],
                    name: "test"
                },
                {
                    id: '6a79d3ff-7d96-42f8-bcff-000325f5e900',
                    accounts: []
                }
            ];

            let wallets = WalletsOp.of(data);

            expect(WalletsOp.isOp(WalletsOp.asOp(wallets))).toBeTruthy();
            expect(WalletsOp.isOp(WalletsOp.asOp(data))).toBeTruthy();
        });

        test("getWallet", () => {
            let data: Wallet[] = [
                {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    accounts: [],
                    name: "test"
                },
                {
                    id: '6a79d3ff-7d96-42f8-bcff-000325f5e900',
                    accounts: []
                }
            ];

            let wallets = WalletsOp.of(data);

            let wallet = wallets.getWallet('6a79d3ff-7d96-42f8-bcff-000325f5e900');
            expect(wallet).toBeDefined();

            expect(() =>
                wallets.getWallet('8be53925-534f-4ead-a8ae-170b04d54d8c')
            ).toThrow();
        });

        test("findWalletByAccount", () => {
            let data: Wallet[] = [
                {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    accounts: [
                        {
                            id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea-1',
                            blockchain: 100,
                            address: '0x343d1de24ac7a891575857855c5579f9de19b427',
                            key: {
                                type: "seed-hd",
                                hdPath: "m/44'/1",
                                seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc'
                            }
                        }
                    ],
                    name: "test"
                },
                {
                    id: '6a79d3ff-7d96-42f8-bcff-000325f5e900',
                    accounts: []
                }
            ];

            let wallets = WalletsOp.of(data);

            let wallet = wallets.findWalletByAccount("9ce1f45b-4a8e-46ee-b81f-1efd034feaea-1");
            expect(wallet).toBeDefined();
            expect(wallet.value.id).toBe("9ce1f45b-4a8e-46ee-b81f-1efd034feaea");

            // Wallet exist, but account doesn't exist
            let wallet2 = wallets.findWalletByAccount("9ce1f45b-4a8e-46ee-b81f-1efd034feaea-2");
            expect(wallet2).toBeUndefined();

            // Wallet doesn't exist
            let wallet3 = wallets.findWalletByAccount("d0659bdd-8090-4b08-90a2-3b951cb98b37-0");
            expect(wallet3).toBeUndefined();
        });
    });

    describe("AccountOp", () => {
        test("typeof", () => {
            expect(AccountIdOp.isOp(AccountIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37-0"))).toBeTruthy();

            expect(AccountIdOp.isOp("d0659bdd-8090-4b08-90a2-3b951cb98b37-0")).toBeFalsy();
            expect(AccountIdOp.isOp("d0659bdd-8090-4b08-90a2-3b951cb98b37")).toBeFalsy();
            expect(AccountIdOp.isOp(null)).toBeFalsy();
            expect(AccountIdOp.isOp(undefined)).toBeFalsy();
        });

        test("Fails on invalid value", () => {
            expect(() => {
                AccountIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37")
            }).toThrow();

            expect(() => {
                AccountIdOp.of(null)
            }).toThrow();

            expect(() => {
                AccountIdOp.of(undefined)
            }).toThrow();

            expect(() => {
                AccountIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37-foobar")
            }).toThrow();
        });

        test("Create from valid id", () => {
            expect(AccountIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37-0")).toBeDefined();
            expect(AccountIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37-1")).toBeDefined();
            expect(AccountIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37-51")).toBeDefined();
        })

    })

});