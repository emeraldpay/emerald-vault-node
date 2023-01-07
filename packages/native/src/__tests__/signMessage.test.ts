import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "./_commons";
import {
    UnsignedMessage,
} from "@emeraldpay/emerald-vault-core";


describe("Sign message", () => {
    describe('EIP-191', () => {

        let vault: EmeraldVaultNative;
        beforeAll(async () => {
            vault = new EmeraldVaultNative({
                dir: tempPath("sign-msg")
            });
            await vault.createGlobalKey("test-global")
        });

        test("sign basic 1", async () => {

            let walletId = await vault.addWallet();
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0x4646464646464646464646464646464646464646464646464646464646464646",
                password: "test-global"
            });

            let msg: UnsignedMessage = {
                type: "eip191",
                message: "test-test-test"
            }
            let signature = await vault.signMessage(entryId, msg, "test-global");

            expect(signature).toBeDefined();
            expect(signature.type).toBe("eip191");
            expect(signature.signature).toBe("0xc26a3a1922d97e573db507e82cbace7b57e54106cc96d598d29ac16aabe48153313302cb629b7307baae0ae5e74f68e58564615ccfde0d03603381e1a233e0ed1c");
            expect(signature.address).toBe("0x9d8A62f656a8d1615C1294fd71e9CFb3E4855A4F".toLowerCase())
        })


        test("sign basic 2", async () => {

            let walletId = await vault.addWallet();
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0xb16541fb0a35a5415c9ddc59afd410b45af88c97e7ca7b172306e9513f538422",
                password: "test-global"
            });

            let msg: UnsignedMessage = {
                type: "eip191",
                message: "test b16541fb0a35a5415c9ddc59afd410b45af88c97e7ca7b172306e9513951279a64d8fc0e4efe055417e604244d53f538422f0b7c686c10133ebad1c91df2980d1b"
            }
            let signature = await vault.signMessage(entryId, msg, "test-global");

            expect(signature).toBeDefined();
            expect(signature.type).toBe("eip191");
            expect(signature.signature).toBe("0xde8d65f0d3de2fbdac8f9348b7e215bcaa7780f772ed28e7d6cdae458938b86b51411b1d50af102484b3bbd4cc1b8ace1ecbcd0747fbbf303d10beb579d67e4b1c");
            expect(signature.address).toBe("0xF20b0DfCBBa3f62F3bCE61B2800Ff3Fb90A143b9".toLowerCase())
        })

    })

    describe('EIP-191 Verify', () => {

        let vault: EmeraldVaultNative;
        beforeAll(async () => {
            vault = new EmeraldVaultNative({
                dir: tempPath("sign-msg")
            });
            await vault.createGlobalKey("test-global")
        });

        test("verify basic 1", async () => {

            let walletId = await vault.addWallet();
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0x4646464646464646464646464646464646464646464646464646464646464646",
                password: "test-global"
            });

            let msg: UnsignedMessage = {
                type: "eip191",
                message: "test-test-test"
            }
            let address = await vault.extractMessageSigner(msg, "0xc26a3a1922d97e573db507e82cbace7b57e54106cc96d598d29ac16aabe48153313302cb629b7307baae0ae5e74f68e58564615ccfde0d03603381e1a233e0ed1c");

            expect(address).toBe("0x9d8A62f656a8d1615C1294fd71e9CFb3E4855A4F".toLowerCase())
        })


        test("verify basic 2", async () => {

            let walletId = await vault.addWallet();
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0xb16541fb0a35a5415c9ddc59afd410b45af88c97e7ca7b172306e9513f538422",
                password: "test-global"
            });

            let msg: UnsignedMessage = {
                type: "eip191",
                message: "test b16541fb0a35a5415c9ddc59afd410b45af88c97e7ca7b172306e9513951279a64d8fc0e4efe055417e604244d53f538422f0b7c686c10133ebad1c91df2980d1b"
            }
            let address = await vault.extractMessageSigner(msg, "0xde8d65f0d3de2fbdac8f9348b7e215bcaa7780f772ed28e7d6cdae458938b86b51411b1d50af102484b3bbd4cc1b8ace1ecbcd0747fbbf303d10beb579d67e4b1c");

            expect(address).toBe("0xF20b0DfCBBa3f62F3bCE61B2800Ff3Fb90A143b9".toLowerCase())
        })

    })

    describe('EIP-712', () => {

        let vault: EmeraldVaultNative;
        beforeAll(async () => {
            vault = new EmeraldVaultNative({
                dir: tempPath("sign-msg")
            });
            await vault.createGlobalKey("test-global")
        });

        test("sign spec example", async () => {

            let walletId = await vault.addWallet();
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0xc85ef7d79691fe79573b1a7064c19c1a9819ebdbd1faaab1a8ec92344438aaf4",
                password: "test-global"
            });

            let msg: UnsignedMessage = {
                type: "eip712",
                message: '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"contents","type":"string"}]},"primaryType":"Mail","domain":{"name":"Ether Mail","version":"1","chainId":1,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"message":{"from":{"name":"Cow","wallet":"0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"},"to":{"name":"Bob","wallet":"0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"},"contents":"Hello, Bob!"}}'
            }
            let signature = await vault.signMessage(entryId, msg, "test-global");

            expect(signature).toBeDefined();
            expect(signature.type).toBe("eip712");
            expect(signature.signature).toBe("0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c");
            expect(signature.address).toBe("0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826".toLowerCase())
        })
    });

    describe('EIP-712 Verify', () => {

        let vault: EmeraldVaultNative;
        beforeAll(async () => {
            vault = new EmeraldVaultNative({
                dir: tempPath("sign-msg")
            });
            await vault.createGlobalKey("test-global")
        });

        test("extract address from sign spec example", async () => {

            let walletId = await vault.addWallet();
            let entryId = await vault.addEntry(walletId, {
                blockchain: 100,
                type: "raw-pk-hex",
                key: "0xc85ef7d79691fe79573b1a7064c19c1a9819ebdbd1faaab1a8ec92344438aaf4",
                password: "test-global"
            });

            let msg: UnsignedMessage = {
                type: "eip712",
                message: '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"contents","type":"string"}]},"primaryType":"Mail","domain":{"name":"Ether Mail","version":"1","chainId":1,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"message":{"from":{"name":"Cow","wallet":"0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"},"to":{"name":"Bob","wallet":"0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"},"contents":"Hello, Bob!"}}'
            }
            let address = await vault.extractMessageSigner(msg, "0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c");
            expect(address).toBe("0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826".toLowerCase())
        })
    });

})