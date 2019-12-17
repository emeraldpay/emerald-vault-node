import {Wallet} from "./types";
import {VaultSelectors} from './selectors';

describe("VaultSelectors", () => {

    test("get wallet by id", () => {
        let wallets: Wallet[] = [
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

        let wallet = VaultSelectors.getWallet(wallets, '6a79d3ff-7d96-42f8-bcff-000325f5e900');
        expect(wallet).toBeDefined();

        let wallet2 = VaultSelectors.getWallet(wallets, '8be53925-534f-4ead-a8ae-170b04d54d8c');
        expect(wallet2).toBeUndefined();
    })

});