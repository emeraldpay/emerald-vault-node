import {AddressRef, EthereumEntry, Wallet} from "./types";
import {AddressRefOp, EntryIdOp, WalletOp, WalletsOp} from "./ops";

describe("Ops", () => {

    describe("WalletOp", () => {
        test("typeof", () => {
            let data: Wallet = {
                id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                entries: [],
                name: "test",
                createdAt: new Date(),
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
                entries: [],
                name: "test",
                createdAt: new Date(),
            };

            let wallet = WalletOp.of(data);

            expect(WalletOp.isOp(WalletOp.of(wallet))).toBeTruthy();
            expect(WalletOp.isOp(WalletOp.of(data))).toBeTruthy();
        });

        describe("return active HDPath entries", () => {
            test("single", () => {
                let acc1: EthereumEntry = {
                    address: {value: '0x343d1de24ac7a891575857855c5579f9de19b427', type: "single"},
                    blockchain: 100,
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feae1',
                    key: {
                        type: "hd-path",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc'
                    },
                    createdAt: new Date(),
                };
                let wallet1: Wallet = {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    entries: [acc1],
                    name: "test",
                    createdAt: new Date(),
                };

                let act = WalletOp.of(wallet1).getHDAccounts();
                expect(Object.entries(act).length).toBe(1);
                expect(act['5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc']).toStrictEqual([0])
            });

            test("stored as reserved, but doesn't exist as entry", () => {
                let acc1: EthereumEntry = {
                    address: {value: '0x343d1de24ac7a891575857855c5579f9de19b427', type: "single"},
                    blockchain: 100,
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feae1',
                    key: {
                        type: "hd-path",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc'
                    },
                    createdAt: new Date(),
                };
                let acc2: EthereumEntry = {
                    address: {value: '0x343d1de24ac7a891575857855c5579f9de19b427', type: "single"},
                    blockchain: 100,
                    id: '364b848e-caf2-43db-a3b5-375f64a61bf4',
                    key: {
                        type: "hd-path",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892'
                    },
                    createdAt: new Date(),
                };
                let wallet1: Wallet = {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    entries: [acc1, acc2],
                    name: "test",
                    reserved: [
                        {seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc', accountId: 0},
                        {seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc', accountId: 1},
                        {seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892', accountId: 0}
                    ],
                    createdAt: new Date(),
                };

                let act = WalletOp.of(wallet1).getHDAccounts();
                expect(Object.entries(act).length).toBe(2);
                expect(act['5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc']).toStrictEqual([0, 1]);
                expect(act['cbb38ce9-d818-4aa3-9c87-bbdbb7796892']).toStrictEqual([0]);
            });

            test("two on different seed", () => {
                let acc1: EthereumEntry = {
                    address: {value: '0x343d1de24ac7a891575857855c5579f9de19b427', type: "single"},
                    blockchain: 100,
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feae1',
                    key: {
                        type: "hd-path",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc'
                    },
                    createdAt: new Date(),
                };
                let acc2: EthereumEntry = {
                    address: {value: '0x343d1de24ac7a891575857855c5579f9de19b427', type: "single"},
                    blockchain: 100,
                    id: '364b848e-caf2-43db-a3b5-375f64a61bf4',
                    key: {
                        type: "hd-path",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892'
                    },
                    createdAt: new Date(),
                };
                let wallet1: Wallet = {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    entries: [acc1, acc2],
                    name: "test",
                    createdAt: new Date(),
                };

                let act = WalletOp.of(wallet1).getHDAccounts();
                expect(Object.entries(act).length).toBe(2);
                expect(act['5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc']).toStrictEqual([0]);
                expect(act['cbb38ce9-d818-4aa3-9c87-bbdbb7796892']).toStrictEqual([0]);
            });

            test("multiple", () => {
                let acc1: EthereumEntry = {
                    address: {value: '0x343d1de24ac7a891575857855c5579f9de19b427', type: "single"},
                    blockchain: 100,
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feae1',
                    key: {
                        type: "hd-path",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc'
                    },
                    createdAt: new Date(),
                };

                let acc2: EthereumEntry = {
                    address: {value: '0x343d1de24ac7a891575857855c5579f9de19b427', type: "single"},
                    blockchain: 100,
                    id: '364b848e-caf2-43db-a3b5-375f64a61bf4',
                    key: {
                        type: "hd-path",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892'
                    },
                    createdAt: new Date(),
                };
                let acc3: EthereumEntry = {
                    address: {type: 'single', value: '0x343d1de24ac7a891575857855c5579f9de19b427'},
                    blockchain: 100,
                    id: '364b848e-caf2-43db-a3b5-375f64a61bf4',
                    key: {
                        type: "hd-path",
                        hdPath: "m/44'/60'/1'/0/0",
                        seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892'
                    },
                    createdAt: new Date(),
                };
                let acc4: EthereumEntry = {
                    address: {type: 'single', value: '0x343d1de24ac7a891575857855c5579f9de19b427'},
                    blockchain: 100,
                    id: '364b848e-caf2-43db-a3b5-375f64a61bf4',
                    key: {
                        type: "hd-path",
                        hdPath: "m/44'/60'/5'/0/0",
                        seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892'
                    },
                    createdAt: new Date(),
                };

                let acc5: EthereumEntry = {
                    address: {type: 'single', value: '0x343d1de24ac7a891575857855c5579f9de19b427'},
                    blockchain: 101,
                    id: '364b848e-caf2-43db-a3b5-375f64a61bf4',
                    key: {
                        type: "hd-path",
                        hdPath: "m/44'/60'/0'/0/0",
                        seedId: 'cbb38ce9-d818-4aa3-9c87-bbdbb7796892'
                    },
                    createdAt: new Date(),
                };

                let wallet1: Wallet = {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    //acc5 is same path for different coin
                    entries: [acc1, acc2, acc3, acc4, acc5],
                    name: "test",
                    createdAt: new Date(),
                };

                let act = WalletOp.of(wallet1).getHDAccounts();
                expect(Object.entries(act).length).toBe(2);
                expect(act['5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc']).toStrictEqual([0]);
                expect(act['cbb38ce9-d818-4aa3-9c87-bbdbb7796892']).toStrictEqual([0, 1, 5]);
            });

        })
    });

    describe("WalletsOp", () => {
        test("typeof", () => {
            let data: Wallet[] = [
                {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    entries: [],
                    name: "test",
                    createdAt: new Date(),
                },
                {
                    id: '6a79d3ff-7d96-42f8-bcff-000325f5e900',
                    entries: [],
                    createdAt: new Date(),
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
                    entries: [],
                    name: "test",
                    createdAt: new Date(),
                },
                {
                    id: '6a79d3ff-7d96-42f8-bcff-000325f5e900',
                    entries: [],
                    createdAt: new Date(),
                }
            ];

            let wallets = WalletsOp.of(data);

            expect(WalletsOp.isOp(WalletsOp.of(wallets))).toBeTruthy();
            expect(WalletsOp.isOp(WalletsOp.of(data))).toBeTruthy();
        });

        test("getWallet", () => {
            let data: Wallet[] = [
                {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    entries: [],
                    name: "test",
                    createdAt: new Date(),
                },
                {
                    id: '6a79d3ff-7d96-42f8-bcff-000325f5e900',
                    entries: [],
                    createdAt: new Date(),
                }
            ];

            let wallets = WalletsOp.of(data);

            let wallet = wallets.getWallet('6a79d3ff-7d96-42f8-bcff-000325f5e900');
            expect(wallet).toBeDefined();

            expect(() =>
                wallets.getWallet('8be53925-534f-4ead-a8ae-170b04d54d8c')
            ).toThrow();
        });

        test("findWalletByEntry", () => {
            let data: Wallet[] = [
                {
                    id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea',
                    entries: [
                        {
                            id: '9ce1f45b-4a8e-46ee-b81f-1efd034feaea-1',
                            blockchain: 100,
                            address: {type: 'single', value: '0x343d1de24ac7a891575857855c5579f9de19b427'},
                            key: {
                                type: "hd-path",
                                hdPath: "m/44'/1",
                                seedId: '5d1f51a7-3310-43bb-9b0c-7a8e5ab9fdcc'
                            },
                            createdAt: new Date(),
                        }
                    ],
                    name: "test",
                    createdAt: new Date(),
                },
                {
                    id: '6a79d3ff-7d96-42f8-bcff-000325f5e900',
                    entries: [],
                    createdAt: new Date(),
                },
            ];

            let wallets = WalletsOp.of(data);

            let wallet = wallets.findWalletByEntry("9ce1f45b-4a8e-46ee-b81f-1efd034feaea-1");
            expect(wallet).toBeDefined();
            expect(wallet.value.id).toBe("9ce1f45b-4a8e-46ee-b81f-1efd034feaea");

            // Wallet exist, but entry doesn't exist
            let wallet2 = wallets.findWalletByEntry("9ce1f45b-4a8e-46ee-b81f-1efd034feaea-2");
            expect(wallet2).toBeUndefined();

            // Wallet doesn't exist
            let wallet3 = wallets.findWalletByEntry("d0659bdd-8090-4b08-90a2-3b951cb98b37-0");
            expect(wallet3).toBeUndefined();
        });
    });

    describe("EntryOp", () => {
        test("typeof", () => {
            expect(EntryIdOp.isOp(EntryIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37-0"))).toBeTruthy();

            expect(EntryIdOp.isOp("d0659bdd-8090-4b08-90a2-3b951cb98b37-0")).toBeFalsy();
            expect(EntryIdOp.isOp("d0659bdd-8090-4b08-90a2-3b951cb98b37")).toBeFalsy();
            expect(EntryIdOp.isOp(null)).toBeFalsy();
            expect(EntryIdOp.isOp(undefined)).toBeFalsy();
        });

        test("Fails on invalid value", () => {
            expect(() => {
                EntryIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37")
            }).toThrow();

            expect(() => {
                EntryIdOp.of(null)
            }).toThrow();

            expect(() => {
                EntryIdOp.of(undefined)
            }).toThrow();

            expect(() => {
                EntryIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37-foobar")
            }).toThrow();
        });

        test("Create from valid id", () => {
            expect(EntryIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37-0")).toBeDefined();
            expect(EntryIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37-1")).toBeDefined();
            expect(EntryIdOp.of("d0659bdd-8090-4b08-90a2-3b951cb98b37-51")).toBeDefined();
        })

    })

    describe("AddressRefOp", () => {
        test("typeof for op", () => {
            expect(AddressRefOp.isOp({type: "single", value: ""})).toBeFalsy();
            expect(AddressRefOp.isOp(null)).toBeFalsy();
            expect(AddressRefOp.isOp(undefined)).toBeFalsy();
        });

        test("typeof for non-op", () => {
            expect(AddressRefOp.isOp({type: "single", value: ""})).toBeFalsy();
            expect(AddressRefOp.isOp(null)).toBeFalsy();
            expect(AddressRefOp.isOp(undefined)).toBeFalsy();
        });


        test("Fails on invalid value", () => {
            expect(() => {
                AddressRefOp.of(null)
            }).toThrow();

            expect(() => {
                AddressRefOp.of(undefined)
            }).toThrow();

            expect(() => {
                // @ts-ignore
                AddressRefOp.of("other")
            }).toThrow();

            expect(() => {
                // @ts-ignore
                AddressRefOp.of({})
            }).toThrow();

            expect(() => {
                // @ts-ignore
                AddressRefOp.of({type: "other", value: "nono"})
            }).toThrow();
        });

        test("isSame for similar single address", () => {
            expect(
                AddressRefOp.of({type: "single", value: "ADDR"}).isSame("ADDR")
            ).toBeTruthy();
            expect(
                AddressRefOp.of({type: "single", value: "ADDR"}).isSame("addr")
            ).toBeTruthy();
            expect(
                AddressRefOp.of({type: "single", value: "ADDR"}).isSame("Addr")
            ).toBeTruthy();
        });

        test("isSame for different single address", () => {
            expect(
                AddressRefOp.of({type: "single", value: "ADDR"}).isSame("Home")
            ).toBeFalsy();
        });

        test("sort", () => {
            let values: AddressRef[] = [
                {type: "single", value: "123AB"},
                {type: "xpub", value: "zpub1234"},
                {type: "single", value: "99999"},
                {type: "xpub", value: "xpub1234"},
            ]
            let sorted = values.sort((a, b) => AddressRefOp.of(a).compareTo(b));
            expect(sorted).toEqual([
                {type: "single", value: "123AB"},
                {type: "single", value: "99999"},
                {type: "xpub", value: "xpub1234"},
                {type: "xpub", value: "zpub1234"},
            ]);
        })

        test("equal for same values", () => {
            expect(
                AddressRefOp.of({type: "single", value: "ADDR"})
                    .isEqual({type: "single", value: "ADDR"})
            ).toBeTruthy();

            expect(
                AddressRefOp.of({type: "xpub", value: "ADDR"})
                    .isEqual({type: "xpub", value: "ADDR"})
            ).toBeTruthy();
        })

        test("equal for different values", () => {
            expect(
                AddressRefOp.of({type: "single", value: "ADDR"})
                    .isEqual({type: "xpub", value: "ADDR"})
            ).toBeFalsy();

            expect(
                AddressRefOp.of({type: "xpub", value: "ADDR"})
                    .isEqual({type: "xpub", value: "addr"})
            ).toBeFalsy();
        })

    })

});