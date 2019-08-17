import {EmeraldVaultNative} from "./EmeraldVaultNative";

describe('Test import JSON', () => {

    //../emerald-rs/target/release/emerald-vault --chain eth -p ./testdata/tmp-import-json account list

    const vault = new EmeraldVaultNative({
        dir: "./testdata/tmp-import-json"
    });

    test("import 6412c428", () => {
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
        let id = vault.importAccount("eth", data);
        expect(id).toBe("305f4853-80af-4fa6-8619-6f285e83cf28");
    });

    test("import c2d7cf95", () => {
        // https://theethereum.wiki/w/index.php/Accounts,_Addresses,_Public_And_Private_Keys,_And_Tokens
        let data = {
            "address":"c2d7cf95645d33006175b78989035c7c9061d3f9",
            "crypto":{
                "cipher":"aes-128-ctr",
                "ciphertext":"0f6d343b2a34fe571639235fc16250823c6fe3bc30525d98c41dfdf21a97aedb",
                "cipherparams":{
                    "iv":"cabce7fb34e4881870a2419b93f6c796"
                },
                "kdf":"scrypt",
                "kdfparams": {
                    "dklen":32,
                    "n":262144,
                    "p":1,
                    "r":8,
                    "salt":"1af9c4a44cf45fe6fb03dcc126fa56cb0f9e81463683dd6493fb4dc76edddd51"
                },
                "mac":"5cf4012fffd1fbe41b122386122350c3825a709619224961a16e908c2a366aa6"
            },
            "id":"eddd71dd-7ad6-4cd3-bc1a-11022f7db76c",
            "version":3
        };

        let id = vault.importAccount("morden", data);
        expect(id).toBe("eddd71dd-7ad6-4cd3-bc1a-11022f7db76c");
    });

    test("import c2d7cf95", () => {
        //https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
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

        let id = vault.importAccount("etc", data);
        expect(id).toBe("3198bc9c-6672-5ab3-d995-4942343ae5b6");
    })

});