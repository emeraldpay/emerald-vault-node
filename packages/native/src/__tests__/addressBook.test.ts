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
            let entries = vault.listAddressBook(100);
            expect(entries.length).toBe(2);

            expect(entries[0].address).toBe("0xB3c9A2f3F96ffBC4b7DEd2D92C83175698147Ae2".toLowerCase());
            expect(entries[0].name).toBe("name 1");
            expect(entries[0].description).toBe("тест");

            expect(entries[1].address).toBe("0xc2d7cf95645d33006175b78989035c7c9061d3f9".toLowerCase());
            expect(entries[1].name).toBeNull();
            expect(entries[1].description).toBeNull();
        });

        test("list etc", () => {
            let entries = vault.listAddressBook(101);
            expect(entries.length).toBe(0);
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
            let entries = vault.listAddressBook(100);
            expect(entries.length).toBe(0);
        });

        test("list etc", () => {
            let entries = vault.listAddressBook(101);
            expect(entries.length).toBe(0);
        });

    });

    describe('Add Item', () => {

        let vault: EmeraldVaultNative;
        beforeEach(() => {
            vault = new EmeraldVaultNative({
                dir: tempPath("book-add")
            });
        });

        test("create etc", () => {
            let entries = vault.listAddressBook(101);
            expect(entries.length).toBe(0);
            vault.addToAddressBook({
                name: "test 1",
                address: "0xc2d7cf95645d33006175b78989035c7c9061d3f9",
                blockchain: 101
            });
            entries = vault.listAddressBook(101);
            expect(entries.length).toBe(1);
            expect(entries[0].address).toBe("0xc2d7cf95645d33006175b78989035c7c9061d3f9".toLowerCase());
            expect(entries[0].name).toBe("test 1");
            expect(entries[0].description).toBeNull();
        });

        test("uses current date", () => {
            const start = new Date();
            vault.addToAddressBook({
                name: "test 1",
                address: "0xc2d7cf95645d33006175b78989035c7c9061d3f9",
                blockchain: 101
            });
            const entries = vault.listAddressBook(101);
            expect(entries.length).toBe(1);
            expect(entries[0].createdAt).toBeDefined();
            const createdAt = new Date(entries[0].createdAt);
            expect(createdAt.getTime()).toBeGreaterThanOrEqual(start.getTime());
            expect(createdAt.getTime()).toBeLessThanOrEqual(new Date().getTime());

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
            let entries = vault.listAddressBook(101);
            expect(entries.length).toBe(0);
            vault.addToAddressBook({
                name: "test 1",
                address: "0xc2d7cf95645d33006175b78989035c7c9061d3f9",
                blockchain: 101
            });
            entries = vault.listAddressBook(101);
            expect(entries.length).toBe(1);
            expect(entries[0].address).toBe("0xc2d7cf95645d33006175b78989035c7c9061d3f9".toLowerCase());

            vault.removeFromAddressBook("etc", "0xc2d7cf95645d33006175b78989035c7c9061d3f9".toLowerCase());
            entries = vault.listAddressBook(101);
            expect(entries.length).toBe(0);
        });
    });
});
