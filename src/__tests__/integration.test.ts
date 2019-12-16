import {EmeraldVaultNative} from "../EmeraldVaultNative";

describe('Multiple clients', () => {

    let data = {
        "version": 3,
        "id": "305f4853-80af-4fa6-8619-6f285e83cf28",
        "address": "6412c428fc02902d137b60dc0bd0f6cd1255ea99",
        "name": "Hello",
        "description": "World!!!!",
        "visible": true,
        "crypto": {
            "cipher": "aes-128-ctr",
            "cipherparams": {"iv": "e4610fb26bd43fa17d1f5df7a415f084"},
            "ciphertext": "dc50ab7bf07c2a793206683397fb15e5da0295cf89396169273c3f49093e8863",
            "kdf": "scrypt",
            "kdfparams": {
                "dklen": 32,
                "salt": "86c6a8857563b57be9e16ad7a3f3714f80b714bcf9da32a2788d695a194f3275",
                "n": 1024,
                "r": 8,
                "p": 1
            },
            "mac": "8dfedc1a92e2f2ca1c0c60cd40fabb8fb6ce7c05faf056281eb03e0a9996ecb0"
        }
    };

    test("import and update multiple times", async () => {
        let vaults = [];
        for (let i = 0; i < 10; i++) {
            const vault = new EmeraldVaultNative({
                dir: i % 3 == 0 ? "./testdata/tmp-multi-0" : "./testdata/tmp-multi-1"
            });
            vaults.push(vault);
        }
        let runs = vaults.map( (vault: EmeraldVaultNative) => {
            return new Promise((resolve, reject) => {
                let run = () => {
                    try {
                        let walletId = vault.addWallet("test");
                        let accountId = vault.addAccount(walletId, {
                            blockchain: 100,
                            type: "ethereum-json",
                            key: JSON.stringify(data)
                        });
                        // vault.updateAccount("eth",data.address, {name: "foo bar"} );
                        let current = vault.exportAccount(walletId, accountId);
                        expect(current.address).toBe(data.address);
                        resolve(current.address);
                    } catch (e) {
                        console.error(e);
                        reject(e);
                    }
                };
               setTimeout(run, 100)
            });
        });
        await Promise.all(runs);
    });
});