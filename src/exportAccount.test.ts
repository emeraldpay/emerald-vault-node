import {EmeraldVaultNative} from "./EmeraldVaultNative";

describe('Test export JSON', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: "./testdata/tmp-export-json"
        });
    });

    test("errors for unknown account", () => {
        expect(() => {
            vault.exportAccount("eth", "55ea99137b60dc0bd642d020f6cd112c428fc029");
        }).toThrow()
    });

    test("errors for invalid address", () => {
        expect(() => {
            vault.exportAccount("eth", "55ea99137b60dc0bd642d020TTTT");
        }).toThrow()
    });

    test("import & export 6412c428", () => {
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
        vault.importAccount("eth", data);

        let current = vault.exportAccount("eth", "6412c428fc02902d137b60dc0bd0f6cd1255ea99");
        expect(current.name).toBe("hello");
    });

});

describe('Test export from vault-0.26', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: "./testdata/vault-0.26-basic"
        });
    });

    test("export 6412c428", () => {
        let current = vault.exportAccount("eth", "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
        expect(current.address).toBe("3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
        expect(current.name).toBe("foo bar");
        expect(current.description).toBe("teßt account #1");
    });

});