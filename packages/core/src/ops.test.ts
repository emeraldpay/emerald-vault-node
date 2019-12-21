import {Wallet} from "./types";
import {WalletsOp} from "./ops";

describe("Ops", () => {

    describe("WalletsOp", () => {
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


});