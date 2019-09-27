import {EmeraldVaultNative} from "./EmeraldVaultNative";

describe('Test update account', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: "./testdata/tmp-remove"
        });
    });

    test("errors for invalid address", () => {
        expect(() => {
            vault.removeAccount("eth", "55ea99137b60dc0bd642d020TTTT");
        }).toThrow()
    });

    test("import and delete", () => {
        let data = {
            "address": "008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
            "crypto" : {
                "cipher" : "aes-128-ctr",
                "cipherparams" : {
                    "iv" : "6087dab2f9fdbbfaddc31a909735c1e6"
                },
                "ciphertext" : "5318b4d5bcd28de64ee5559e671353e16f075ecae9f99c7a79a38af5f869aa46",
                "kdf" : "pbkdf2",
                "kdfparams" : {
                    "c" : 262144,
                    "dklen" : 32,
                    "prf" : "hmac-sha256",
                    "salt" : "ae3cd4e7013836a3df6bd7241b12db061dbe2c6785853cce422d148a624ce0bd"
                },
                "mac" : "517ead924a9d0dc3124507e3393d175ce3ff7c1e96529c6c555ce9e51205e9b2"
            },
            "id" : "3198bc9c-6672-5ab3-d995-4942343ae5b6",
            "version" : 3
        };

        vault.importAccount("etc", data);

        let exists = vault.listAccounts("etc").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        expect(exists).toBeTruthy();

        vault.removeAccount("etc", "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        exists = vault.listAccounts("etc").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        expect(exists).toBeFalsy();
    });

    test("doesn't delete on another chain", () => {
        let data = {
            "address": "008aeeda4d805471df9b2a5b0f38a0c3bcba786b",
            "crypto" : {
                "cipher" : "aes-128-ctr",
                "cipherparams" : {
                    "iv" : "6087dab2f9fdbbfaddc31a909735c1e6"
                },
                "ciphertext" : "5318b4d5bcd28de64ee5559e671353e16f075ecae9f99c7a79a38af5f869aa46",
                "kdf" : "pbkdf2",
                "kdfparams" : {
                    "c" : 262144,
                    "dklen" : 32,
                    "prf" : "hmac-sha256",
                    "salt" : "ae3cd4e7013836a3df6bd7241b12db061dbe2c6785853cce422d148a624ce0bd"
                },
                "mac" : "517ead924a9d0dc3124507e3393d175ce3ff7c1e96529c6c555ce9e51205e9b2"
            },
            "id" : "3198bc9c-6672-5ab3-d995-4942343ae5b6",
            "version" : 3
        };

        vault.importAccount("etc", data);
        vault.importAccount("eth", data);

        let exists = vault.listAccounts("etc").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        expect(exists).toBeTruthy();
        exists = vault.listAccounts("eth").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        expect(exists).toBeTruthy();

        vault.removeAccount("etc", "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        exists = vault.listAccounts("etc").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        expect(exists).toBeFalsy();
        exists = vault.listAccounts("eth").some((it) => it.address == "0x008aeeda4d805471df9b2a5b0f38a0c3bcba786b");
        expect(exists).toBeTruthy();
    })

});