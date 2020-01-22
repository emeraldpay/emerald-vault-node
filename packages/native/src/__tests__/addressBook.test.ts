import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "./_commons";

describe("Address Book", () => {
    describe('Test vault 0.26 book', () => {

        let vault;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/vault-0.26-book"
            });
            vault.open();
        });

        test("list eth", () => {
            let accounts = vault.listAddressBook(100);
            expect(accounts.length).toBe(2);

            expect(accounts[0].address).toBe("0xB3c9A2f3F96ffBC4b7DEd2D92C83175698147Ae2".toLowerCase());
            expect(accounts[0].name).toBe("name 1");
            expect(accounts[0].description).toBe("тест");

            expect(accounts[1].address).toBe("0xc2d7cf95645d33006175b78989035c7c9061d3f9".toLowerCase());
            expect(accounts[1].name).toBeNull();
            expect(accounts[1].description).toBeNull();
        });

        test("list etc", () => {
            let accounts = vault.listAddressBook(101);
            expect(accounts.length).toBe(0);
        });

    });

    describe('Test empty book', () => {

        let vault;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: "./testdata/tmp-book-empty"
            });
        });

        test("list eth", () => {
            let accounts = vault.listAddressBook(100);
            expect(accounts.length).toBe(0);
        });

        test("list etc", () => {
            let accounts = vault.listAddressBook(101);
            expect(accounts.length).toBe(0);
        });

    });

    describe('Add Item', () => {

        let vault;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("book-add")
            });
        });

        test("list etc", () => {
            let accounts = vault.listAddressBook(101);
            expect(accounts.length).toBe(0);
            vault.addToAddressBook({name: "test 1", address: "0xc2d7cf95645d33006175b78989035c7c9061d3f9", blockchain: 101});
            accounts = vault.listAddressBook(101);
            expect(accounts.length).toBe(1);
            expect(accounts[0].address).toBe("0xc2d7cf95645d33006175b78989035c7c9061d3f9".toLowerCase());
            expect(accounts[0].name).toBe("test 1");
            expect(accounts[0].description).toBeNull();
        });
    });

    describe('Delete Item', () => {

        let vault;
        beforeAll(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("book-delete")
            });
        });

        test("add and delete", () => {
            let accounts = vault.listAddressBook(101);
            expect(accounts.length).toBe(0);
            vault.addToAddressBook({name: "test 1", address: "0xc2d7cf95645d33006175b78989035c7c9061d3f9", blockchain: 101});
            accounts = vault.listAddressBook(101);
            expect(accounts.length).toBe(1);
            expect(accounts[0].address).toBe("0xc2d7cf95645d33006175b78989035c7c9061d3f9".toLowerCase());

            vault.removeFromAddressBook("etc", "0xc2d7cf95645d33006175b78989035c7c9061d3f9".toLowerCase());
            accounts = vault.listAddressBook(101);
            expect(accounts.length).toBe(0);
        });
    });
});
