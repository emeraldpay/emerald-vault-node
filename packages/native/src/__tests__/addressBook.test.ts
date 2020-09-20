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

        test("list eth", async () => {
            let entries = await vault.listAddressBook(100);
            expect(entries.length).toBe(2);

            expect(entries[0].address).toEqual({
                type: 'single',
                value: "0xB3c9A2f3F96ffBC4b7DEd2D92C83175698147Ae2".toLowerCase()
            });
            expect(entries[0].name).toBe("name 1");
            expect(entries[0].description).toBe("тест");

            expect(entries[1].address).toEqual({
                type: 'single',
                value: "0xc2d7cf95645d33006175b78989035c7c9061d3f9".toLowerCase()
            });
            expect(entries[1].name).toBeNull();
            expect(entries[1].description).toBeNull();
        });

        test("list etc", async () => {
            let entries = await vault.listAddressBook(101);
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

        test("list eth", async () => {
            let entries = await vault.listAddressBook(100);
            expect(entries.length).toBe(0);
        });

        test("list etc", async () => {
            let entries = await vault.listAddressBook(101);
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

        test("create etc", async () => {
            let entries = await vault.listAddressBook(101);
            expect(entries.length).toBe(0);
            vault.addToAddressBook({
                name: "test 1",
                address: {type: 'single', value: "0xc2d7cf95645d33006175b78989035c7c9061d3f9"},
                blockchain: 101
            });
            entries = await vault.listAddressBook(101);
            expect(entries.length).toBe(1);
            expect(entries[0].address).toEqual({type: 'single', value: "0xc2d7cf95645d33006175b78989035c7c9061d3f9"});
            expect(entries[0].name).toBe("test 1");
            expect(entries[0].description).toBeNull();
        });

        test("create xpub", async () => {
            let entries = await vault.listAddressBook(1);
            expect(entries.length).toBe(0);
            vault.addToAddressBook({
                name: "test 1",
                address: {
                    type: 'xpub',
                    value: "xpub6EjJpNWcgdLA4vWebuNS8eXpDR8P5jhZCxgSLFa3hYgAWrVpsU6GqpzBke87gJRRpEY9VQv4rK1Uj5r31DqN7tVcyz87kVafsnvQTyN5htX"
                },
                blockchain: 1
            });
            entries = await vault.listAddressBook(1);
            expect(entries.length).toBe(1);
            expect(entries[0].address).toEqual({
                type: 'xpub',
                value: "xpub6EjJpNWcgdLA4vWebuNS8eXpDR8P5jhZCxgSLFa3hYgAWrVpsU6GqpzBke87gJRRpEY9VQv4rK1Uj5r31DqN7tVcyz87kVafsnvQTyN5htX"
            });
            expect(entries[0].name).toBe("test 1");
            expect(entries[0].description).toBeNull();
        });

        test("create xpub for witness address", async () => {
            let entries = await vault.listAddressBook(1);
            expect(entries.length).toBe(0);
            await vault.addToAddressBook({
                name: "test 1",
                address: {
                    type: 'xpub',
                    value: "zpub6stzBYsEyBueyoWBfN9kkuFj4uicfJLvuYKreENCyQjE7EVwjxStGDgQtuueQHH5GVpe1KejPdpqT6aryjpfpF7YDU81ZSw6bhZGKKxD2ZW"
                },
                blockchain: 1
            });
            entries = await vault.listAddressBook(1);
            expect(entries.length).toBe(1);
            expect(entries[0].address).toEqual({
                type: 'xpub',
                value: "zpub6stzBYsEyBueyoWBfN9kkuFj4uicfJLvuYKreENCyQjE7EVwjxStGDgQtuueQHH5GVpe1KejPdpqT6aryjpfpF7YDU81ZSw6bhZGKKxD2ZW"
            });
            expect(entries[0].name).toBe("test 1");
            expect(entries[0].description).toBeNull();
        });

        test("uses current date", async () => {
            const start = new Date();
            await vault.addToAddressBook({
                name: "test 1",
                address: {type: 'single', value: "0xc2d7cf95645d33006175b78989035c7c9061d3f9"},
                blockchain: 101
            });
            const entries = await vault.listAddressBook(101);
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

        test("add and delete", async () => {
            let entries = await vault.listAddressBook(101);
            expect(entries.length).toBe(0);
            await vault.addToAddressBook({
                name: "test 1",
                address: {type: 'single', value: "0xc2d7cf95645d33006175b78989035c7c9061d3f9"},
                blockchain: 101
            });
            entries = await vault.listAddressBook(101);
            expect(entries.length).toBe(1);
            expect(entries[0].address).toEqual({
                type: 'single',
                value: "0xc2d7cf95645d33006175b78989035c7c9061d3f9".toLowerCase()
            });

            await vault.removeFromAddressBook("etc", "0xc2d7cf95645d33006175b78989035c7c9061d3f9".toLowerCase());
            entries = await vault.listAddressBook(101);
            expect(entries.length).toBe(0);
        });
    });
});
