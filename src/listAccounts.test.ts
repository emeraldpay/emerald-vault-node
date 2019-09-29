import {EmeraldVaultNative} from "./EmeraldVaultNative";

describe('Test vault 0.26 basic', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: "./testdata/vault-0.26-basic"
        });
    });

    test("list eth", () => {
        let accounts = vault.listAccounts("eth");
        expect(accounts.length).toBe(2);
        expect(accounts[0].address).toBe("0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3");
        expect(accounts[0].name).toBe("foo bar");
        expect(accounts[0].description).toBe("teßt account #1");
        expect(accounts[1].address).toBe("0x410891c20e253a2d284f898368860ec7ffa6153c");
    });

    test("list etc", () => {
        let accounts = vault.listAccounts("etc");
        expect(accounts.length).toBe(1);
        expect(accounts[0].address).toBe("0x5b30de96fdf94ac6c5b4a8c243f991c649d66fa1");
    });

    test("list kovan", () => {
        let accounts = vault.listAccounts("kovan");
        expect(accounts.length).toBe(0);
    });

    test("list morden", () => {
        let accounts = vault.listAccounts("morden");
        expect(accounts.length).toBe(0);
    });
});

describe('Test default dir', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative();
    });

    test("list etc", () => {
        let accounts = vault.listAccounts("etc");
        console.log("accounts", accounts);
    });

    test("list eth", () => {
        let accounts = vault.listAccounts("eth");
        console.log("accounts", accounts);
    });
    test("list morden", () => {
        let accounts = vault.listAccounts("morden");
        console.log("accounts", accounts);
    });
    test("list kovan", () => {
        let accounts = vault.listAccounts("kovan");
        console.log("accounts", accounts);
    });

});