import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {EthereumEntry, WalletsOp, WalletOp, EntryIdOp, PKRef, SeedPKRef} from "@emeraldpay/emerald-vault-core";
import {tempPath, copy} from "./_commons";


describe("Global Key", () => {

    describe("Use v27", () => {

        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: copy("vault-0.27-standard")
            });
            vault.open();
        });

        test('Check global key', async () => {
            let isSet = await vault.isGlobalKeySet();
            expect(isSet).toBeFalsy();

            let legacy = await vault.getOddPasswordItems();

            // only one, another one is Ledger
            expect(legacy).toContainEqual({type: 'seed', id: '14780c33-0364-4bff-9244-a7a495c0cf33'});
            expect(legacy.length).toBe(1);
        });

        test('Upgrade', async () => {
            let isSet = await vault.isGlobalKeySet();
            expect(isSet).toBeFalsy();

            let created = await vault.createGlobalKey("test-global");
            expect(created).toBeTruthy();
            isSet = await vault.isGlobalKeySet();
            expect(isSet).toBeTruthy();

            let upgraded1 = await vault.tryUpgradeOddItems("wrong", "test-global");
            expect(upgraded1.length).toBe(0);

            let legacy1 = await vault.getOddPasswordItems();
            expect(legacy1.length).toBe(1);

            let upgraded2 = await vault.tryUpgradeOddItems("test", "test-global");
            expect(upgraded2.length).toBe(1);

            let legacy2 = await vault.getOddPasswordItems();
            expect(legacy2.length).toBe(0);

            // check if still can sign
            let wallets = WalletsOp.of(await vault.listWallets());

            let entry = wallets.getWallet("ccf06549-ab79-4ccb-a0fd-17d6904d4db1")
                .getEthereumEntries()[0];

            let tx = {
                from: "0xb4BbAaC4Acd7E86AF282e80C7a62fda78D071950",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "4177",
                gas: 0x5208,
                gasPrice: "2000000000",
                nonce: 2,
            };
            let raw = await vault.signTx(entry.id, tx, "test-global");
            expect(raw).toBe("0xf865028477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd38210518026a0a8f7aacd400789614602925c4331cf7ccf83548401632da7ee36b634fd5e2ce1a05c554688d38bd762af2e4885b70a2b3e608dffe80a2c33c93606afe4add040c6");
        });

    });

    describe("Create new", () => {
        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("create-global")
            });
            vault.open();
        });

        test("Create global key and verify", async () => {

            let created = await vault.createGlobalKey("test-global");
            expect(created).toBeTruthy();
            let isSet = await vault.isGlobalKeySet();
            expect(isSet).toBeTruthy();

            let valid = await vault.verifyGlobalKey("test-global");
            expect(valid).toBeTruthy();

            let invalid = await vault.verifyGlobalKey("test-global-wrong");
            expect(invalid).toBeFalsy();
        });

        test("Create global key and seed", async () => {

            let created = await vault.createGlobalKey("test-global");
            expect(created).toBeTruthy();
            let isSet = await vault.isGlobalKeySet();
            expect(isSet).toBeTruthy();

            let seedId = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test-global"
            });
            expect(seedId).toBeDefined();

            let seeds = await vault.listSeeds();
            expect(seeds.length).toBe(1);

            let legacy = await vault.getOddPasswordItems();
            expect(legacy.length).toBe(0);

            let walletId = await vault.addWallet("test wallet");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: seedId, password: "test-global"},
                    hdPath: "m/44'/60'/0'/0/3",
                }
            });

            let tx = {
                from: "0xC0628478eaA61b547D5aa0105758247aA93b550c",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0",
                gas: 0x5208,
                gasPrice: "2000000000",
                nonce: 0x19,
                data: ""
            };
            let raw = await vault.signTx(entryId, tx, "test-global");

            expect(raw).toBeDefined();
        });

        test("Create global key and import raw key", async () => {

            let created = await vault.createGlobalKey("test-global");
            expect(created).toBeTruthy();
            let isSet = await vault.isGlobalKeySet();
            expect(isSet).toBeTruthy();

            let walletId = await vault.addWallet("test wallet");
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0xeab7e28c2bf7c2e3a8d6589692807750ae41a36e5fdb0feee6ade1891986e5f3",
                password: "test-global"
            });

            let legacy = await vault.getOddPasswordItems();
            expect(legacy.length).toBe(0);

            let tx = {
                from: "0x5753f65cb3db9c350CEC48F9802061BdEfDebfAb",
                to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
                value: "0",
                gas: 0x5208,
                gasPrice: "2000000000",
                nonce: 0x19,
                data: ""
            };
            let raw = await vault.signTx(entryId, tx, "test-global");

            expect(raw).toBeDefined();
        })

    });

    describe("Change password", () => {
        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("change-global")
            });
            vault.open();
        });

        test("Change password", async () => {

            let created = await vault.createGlobalKey("test-1");
            expect(created).toBeTruthy();

            expect(await vault.verifyGlobalKey("test-1")).toBeTruthy();
            expect(await vault.verifyGlobalKey("test-2")).toBeFalsy();

            let changed = await vault.changeGlobalKey("test-1", "test-2");
            expect(changed).toBeTruthy();
            expect(await vault.verifyGlobalKey("test-1")).toBeFalsy();
            expect(await vault.verifyGlobalKey("test-2")).toBeTruthy();
        });

        test("Doesn't change from wrong password", async () => {

            let created = await vault.createGlobalKey("test-1");
            expect(created).toBeTruthy();

            expect(await vault.verifyGlobalKey("test-1")).toBeTruthy();
            expect(await vault.verifyGlobalKey("test-2")).toBeFalsy();

            let changed = await vault.changeGlobalKey("test-3", "test-2");
            expect(changed).toBeFalsy();
            expect(await vault.verifyGlobalKey("test-1")).toBeTruthy();
            expect(await vault.verifyGlobalKey("test-2")).toBeFalsy();
        });
    });
})