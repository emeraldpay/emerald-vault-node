import {EmeraldVaultNative} from "../EmeraldVaultNative";

describe('Multiple clients', () => {

    let data = {
        "version": 3,
        "id": "038a3f29-58c2-4b04-af6f-82d419a5b99a",
        "address": "f079f4dc353c8c60d21507bab994c9bb8b422559",
        "crypto": {
            "ciphertext": "73188dc1ead6f9b1d938c932a8ac32e2f79b255ee61c8ccf7ceca56c7942f72a",
            "cipherparams": {"iv": "875e43cf3bc53752ed4f3b8493668cce"},
            "cipher": "aes-128-ctr",
            "kdf": "scrypt",
            "kdfparams": {
                "dklen": 32,
                "salt": "ac1f1c9461c79310966af141009f0e97c13bf2d076810c46dcd209a31811f503",
                "n": 8192,
                "r": 8,
                "p": 1
            },
            "mac": "0fa24647af1a077aecfa3ca3fc22bdb24de9b527ec4b581e8ab848dbf9086e92"
        }
    };

    test("import and update multiple times", async () => {
        let vaults = [];
        for (let i = 0; i < 10; i++) {
            const vault = new EmeraldVaultNative({
                dir: i % 3 == 0 ? "./testdata/tmp-multi-0" : "./testdata/tmp-multi-1"
            });
            if (!await vault.isGlobalKeySet()) {
                await vault.createGlobalKey("test-global");
            }
            vaults.push(vault);
        }
        let runs = vaults.map( (vault: EmeraldVaultNative) => {
            return new Promise((resolve, reject) => {
                let run = () => {
                    vault.addWallet("test").then((walletId) =>
                        vault.addEntry(walletId, {
                            blockchain: 100,
                            type: "ethereum-json",
                            key: JSON.stringify(data),
                            jsonPassword: "just-a-test-wallet-100",
                            password: "test-global"
                        })
                    ).then((entryId) =>
                        vault.exportJsonPk(entryId, "test-global")
                    ).then((entry) => {
                        let current = JSON.parse(entry.json);
                        expect(current.address).toBe(data.address);
                        resolve(current.address);
                    }).catch(reject);
                };
               setTimeout(run, 100)
            });
        });
        await Promise.all(runs);
    });
});