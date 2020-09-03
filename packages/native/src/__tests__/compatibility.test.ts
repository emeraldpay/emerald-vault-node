import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {EthereumEntry, WalletsOp, WalletOp, EntryIdOp, PKRef, SeedPKRef} from "@emeraldpay/emerald-vault-core";
import {tempPath} from "./_commons";


describe("Compatibility", () => {

    describe("Use standard, v0.27", () => {

        let vault: EmeraldVaultNative;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/vault-0.27-standard"
            });
            vault.open();
        });

        test('List wallets', () => {
            let wallets = WalletsOp.of(vault.listWallets());
            expect(wallets.size).toBe(3);
        });

        test('List seeds', () => {
            let seeds = vault.listSeeds();
            expect(seeds.length).toBe(2);

            // sort for testing
            seeds.sort((a, b) => a.id.localeCompare(b.id));

            expect(seeds[0].id).toBe("14780c33-0364-4bff-9244-a7a495c0cf33");
            expect(seeds[0].label).toBe("Seed 1");
            expect(seeds[0].type).toBe("bytes");
            expect(seeds[0].available).toBeTruthy();

            expect(seeds[1].id).toBe("9a33431c-8f38-464f-92bd-c4a2fedf942d");
            expect(seeds[1].label).toBeNull();
            expect(seeds[1].type).toBe("ledger");
            expect(seeds[1].available).toBeFalsy();
        });

        test('Open wallet 1', () => {
            let wallets = WalletsOp.of(vault.listWallets());

            let wallet = wallets.getWallet("ccf06549-ab79-4ccb-a0fd-17d6904d4db1").value;
            expect(wallet.id).toBe("ccf06549-ab79-4ccb-a0fd-17d6904d4db1");
            expect(wallet.name).toBe("Test wallet 1");
            expect(wallet.reserved).toEqual([
                {"accountId": 0, "seedId": "14780c33-0364-4bff-9244-a7a495c0cf33"},
                {"accountId": 0, "seedId": "9a33431c-8f38-464f-92bd-c4a2fedf942d"}
            ]);
            expect(wallet.entries.length).toBe(2);
            expect(wallet.entries[0].blockchain).toBe(100);
            expect(wallet.entries[0].key).toEqual({
                "hdPath": "m/44'/60'/0'/0/1",
                "seedId": "14780c33-0364-4bff-9244-a7a495c0cf33",
                "type": "hd-path",
            });
            expect(wallet.entries[1].blockchain).toBe(100);
            expect(wallet.entries[1].key).toEqual({
                "hdPath": "m/44'/60'/0'/0/1",
                "seedId": "9a33431c-8f38-464f-92bd-c4a2fedf942d",
                "type": "hd-path",
            });
        });

        test('Open wallet 2', () => {
            let wallets = WalletsOp.of(vault.listWallets());

            let wallet = wallets.getWallet("8c80fc09-f20d-42db-9fea-1df4353af82a").value;
            expect(wallet.id).toBe("8c80fc09-f20d-42db-9fea-1df4353af82a");
            expect(wallet.name).toBe("Test wallet 2");
            expect(wallet.reserved).toEqual([
                {"accountId": 1, "seedId": "14780c33-0364-4bff-9244-a7a495c0cf33"}
            ]);
            expect(wallet.entries.length).toBe(1);
            expect(wallet.entries[0].blockchain).toBe(101);
            expect(wallet.entries[0].key).toEqual({
                "hdPath": "m/44'/60'/1'/0/1",
                "seedId": "14780c33-0364-4bff-9244-a7a495c0cf33",
                "type": "hd-path",
            });
        });

        test('Open wallet 3', () => {
            let wallets = WalletsOp.of(vault.listWallets());

            let wallet = wallets.getWallet("80ce0681-b506-4d0b-ae8e-5e7876625604").value;
            expect(wallet.id).toBe("80ce0681-b506-4d0b-ae8e-5e7876625604");
            expect(wallet.name).toBe("Test wallet 3");
            expect(wallet.reserved).toEqual([
                {"accountId": 2, "seedId": "14780c33-0364-4bff-9244-a7a495c0cf33"}
            ]);
            expect(wallet.entries.length).toBe(2);
            expect(wallet.entries[0].blockchain).toBe(100);
            expect(wallet.entries[0].key).toEqual({
                "hdPath": "m/44'/60'/2'/0/1",
                "seedId": "14780c33-0364-4bff-9244-a7a495c0cf33",
                "type": "hd-path",
            });
            expect(wallet.entries[1].blockchain).toBe(101);
            expect(wallet.entries[1].key).toEqual({
                "hdPath": "m/44'/60'/2'/0/1",
                "seedId": "14780c33-0364-4bff-9244-a7a495c0cf33",
                "type": "hd-path",
            });
        });

        test('Sign wallet 1', () => {
            let wallets = WalletsOp.of(vault.listWallets());

            let entry = wallets.getWallet("ccf06549-ab79-4ccb-a0fd-17d6904d4db1")
                .getEthereumEntries()[0];

            let tx = {
                from: "0xb4BbAaC4Acd7E86AF282e80C7a62fda78D071950",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0x1051",
                gas: "0x5208",
                gasPrice: "0x77359400",
                nonce: "0x2"
            };
            let raw = vault.signTx(entry.id, tx, "test");
            expect(raw).toBe("0xf865028477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd38210518026a0a8f7aacd400789614602925c4331cf7ccf83548401632da7ee36b634fd5e2ce1a05c554688d38bd762af2e4885b70a2b3e608dffe80a2c33c93606afe4add040c6");
        });

    })

});