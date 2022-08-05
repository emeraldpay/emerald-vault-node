import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {tempPath} from "./_commons";

describe("Address Book", () => {
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

});
