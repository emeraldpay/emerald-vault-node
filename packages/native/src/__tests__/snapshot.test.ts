import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath, copy} from "./_commons";
import {AddEntry, AddressXPub, isAddressXPub} from "@emeraldpay/emerald-vault-core";

const fs = require('fs');

describe("Snapshots", () => {

    describe("Create", () => {

        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("snapshot-create")
            });
            vault.open();
        });
        afterEach(() => {
            vault.close()
        });

        test('Create', async () => {
            await vault.createGlobalKey("test-global");

            let walletId = await vault.addWallet("test");
            let seedId = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test-global"
            });

            let otherDir = tempPath("snapshot-create");
            await fs.promises.mkdir(otherDir)

            let snapshot = `${otherDir}/snap-1.emrldvault`;

            let ok = await vault.snapshotCreate(snapshot);
            expect(ok).toBeTruthy();
        });

        test('Create replaces an existing file', async () => {
            await vault.createGlobalKey("test-global");

            let walletId = await vault.addWallet("test");
            let seedId = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test-global"
            });

            let otherDir = tempPath("snapshot-create");
            await fs.promises.mkdir(otherDir)

            let snapshot = `${otherDir}/snap-1.emrldvault`;
            await fs.promises.writeFile(snapshot, "test");
            let stats = await fs.promises.lstat(snapshot);
            expect(stats.size).toBe(4);

            let ok = await vault.snapshotCreate(snapshot);
            expect(ok).toBeTruthy();

            stats = await fs.promises.lstat(snapshot);
            expect(stats.size).toBeGreaterThan(100);
        });

        test('Create and restore', async () => {
            await vault.createGlobalKey("test-global");

            let walletId = await vault.addWallet("test");
            let seedId = await vault.importSeed({
                type: "mnemonic",
                value: {
                    value: "ordinary tuition injury hockey setup magnet vibrant exit win turkey success caught direct rich field evil ranch crystal step album charge daughter setup sea"
                },
                password: "test-global"
            });
            let addEntry: AddEntry = {
                blockchain: 1,
                type: "hd-path",
                key: {
                    seed: {type: "id", value: seedId, password: "test-global"},
                    hdPath: "m/84'/0'/0'/0/1",
                }
            };
            let accountId = await vault.addEntry(walletId, addEntry);

            let otherDir = tempPath("snapshot-create-restore");
            await fs.promises.mkdir(otherDir)

            let snapshot = `${otherDir}/snap-1.emrldvault`;

            let created = await vault.snapshotCreate(snapshot);
            expect(created).toBeTruthy();

            let vault2 = new EmeraldVaultNative({
                dir: tempPath("snapshot-create")
            });
            vault2.open();

            let restored = await vault2.snapshotRestore(snapshot, "test-global");
            expect(restored).toBeTruthy();

            let wallet = await vault2.getWallet(walletId);
            expect(wallet.entries.length).toBe(1);
            expect(wallet.entries[0].id).toBe(accountId);

        });

    });

    describe("Restore existing", () => {

        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("snapshot-create")
            });
            vault.open();
        });
        afterEach(() => {
            vault.close()
        });

        test('Restore basic', async () => {
            let restored = await vault.snapshotRestore("./testdata/snap-1.emrldvault", "test-global");
            expect(restored).toBeTruthy();

            let wallet = await vault.getWallet("d80c6afb-9629-45ba-98cc-129a1d2c191e");
            expect(wallet.entries.length).toBe(1);
            expect(isAddressXPub(wallet.entries[0].address)).toBeTruthy();
            expect((wallet.entries[0].address as AddressXPub).value).toBe("zpub6rgquuQgjiNdUjkU7qZck9t3JU5K9U9EG2aVAwzDy2BJKHKMekVNsyZF2e4dw9L9AoT9WHy5iDVdUHz2XkrANy5LRVGLt3XMkar752N2hvq");
        });

    });

})