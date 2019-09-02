import {EmeraldVaultNative} from "./EmeraldVaultNative";

describe('Test update account', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: "./testdata/tmp-update"
        });
    });

    test("errors for unknown account", () => {
        expect(() => {
            vault.updateAccount("eth", "55ea99137b60dc0bd642d020f6cd112c428fc029", {name: "hello"});
        }).toThrow()
    });

    test("errors for invalid address", () => {
        expect(() => {
            vault.updateAccount("eth", "55ea99137b60dc0bd642d020TTTT", {name: "hello"});
        }).toThrow()
    });

    test("update name and description", () => {
        let data = {
            "version": 3,
            "id": "305f4853-80af-4fa6-8619-6f285e83cf28",
            "address": "6412c428fc02902d137b60dc0bd0f6cd1255ea99",
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
        vault.importAccount("eth", data);

        let created = vault.exportAccount("eth", "6412c428fc02902d137b60dc0bd0f6cd1255ea99");
        expect(created.name).toBeNull();
        expect(created.description).toBeNull();

        vault.updateAccount("eth","6412c428fc02902d137b60dc0bd0f6cd1255ea99", {name: "Hello", description: "World!"} );

        let updated = vault.exportAccount("eth", "6412c428fc02902d137b60dc0bd0f6cd1255ea99");
        expect(updated.name).toBe("hello");
        expect(updated.description).toBe("world!");
    });

    test("update name only", () => {
        let data = {
            "version": 3,
            "id": "305f4853-80af-4fa6-8619-6f285e83cf28",
            "address": "902d137b60dc0bd0f6cd1255ea996412c428fc02",
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
        vault.importAccount("eth", data);

        let created = vault.exportAccount("eth", "902d137b60dc0bd0f6cd1255ea996412c428fc02");
        expect(created.name).toBeNull();
        expect(created.description).toBeNull();

        vault.updateAccount("eth","902d137b60dc0bd0f6cd1255ea996412c428fc02", {name: "Hello"} );

        let updated = vault.exportAccount("eth", "902d137b60dc0bd0f6cd1255ea996412c428fc02");
        expect(updated.name).toBe("hello");
        expect(updated.description).toBeNull();
    });

    test("update description only", () => {
        let data = {
            "version": 3,
            "id": "305f4853-80af-4fa6-8619-6f285e83cf28",
            "address": "0f6cd1255ea996412c428fc02902d137b60dc0bd",
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
        vault.importAccount("eth", data);

        let created = vault.exportAccount("eth", "0f6cd1255ea996412c428fc02902d137b60dc0bd");
        expect(created.name).toBeNull();
        expect(created.description).toBeNull();

        vault.updateAccount("eth","0f6cd1255ea996412c428fc02902d137b60dc0bd", {description: "Worldddd"} );

        let updated = vault.exportAccount("eth", "0f6cd1255ea996412c428fc02902d137b60dc0bd");
        expect(updated.name).toBeNull();
        expect(updated.description).toBe("worldddd");
    });

    test("update twice", () => {
        let data = {
            "version": 3,
            "id": "305f4853-80af-4fa6-8619-6f285e83cf28",
            "address": "12c428fc02902d137b60dc0bd0f6cd1255ea9964",
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
        vault.importAccount("eth", data);

        let created = vault.exportAccount("eth", "12c428fc02902d137b60dc0bd0f6cd1255ea9964");
        expect(created.name).toBeNull();
        expect(created.description).toBeNull();

        vault.updateAccount("eth","12c428fc02902d137b60dc0bd0f6cd1255ea9964", {description: "Worldddd"} );
        vault.updateAccount("eth","12c428fc02902d137b60dc0bd0f6cd1255ea9964", {description: "Worldddd 2", name: "hello"} );

        let updated = vault.exportAccount("eth", "12c428fc02902d137b60dc0bd0f6cd1255ea9964");
        expect(updated.name).toBe("hello");
        expect(updated.description).toBe("worldddd 2");
    });
});