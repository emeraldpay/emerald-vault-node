import {EmeraldVaultNative} from "./EmeraldVaultNative";

describe('Test vault 0.26 book', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: "./testdata/vault-0.26-book"
        });
    });

    test("list eth", () => {
        let accounts = vault.listAddressBook("eth");
        expect(accounts.length).toBe(2);

        expect(accounts[0].address).toBe("0xB3c9A2f3F96ffBC4b7DEd2D92C83175698147Ae2");
        expect(accounts[0].name).toBe("name 1");
        expect(accounts[0].description).toBe("тест");

        expect(accounts[1].address).toBe("0xc2d7cf95645d33006175b78989035c7c9061d3f9");
        expect(accounts[1].name).toBeUndefined();
        expect(accounts[1].description).toBeUndefined();
    });

    test("list etc", () => {
        let accounts = vault.listAddressBook("etc");
        expect(accounts.length).toBe(0);
    });

});

describe('Test empty book', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: "./testdata/tmp-book"
        });
    });

    test("list eth", () => {
        let accounts = vault.listAddressBook("eth");
        expect(accounts.length).toBe(0);
    });

    test("list etc", () => {
        let accounts = vault.listAddressBook("etc");
        expect(accounts.length).toBe(0);
    });

});