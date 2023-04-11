import {EmeraldVaultNative} from "../EmeraldVaultNative";
import {IconDetails} from "@emeraldpay/emerald-vault-core";
import {tempPath} from "./_commons";
import * as fs from "fs";
const fse = require('fs-extra');

describe("Icons", () => {

    let vault: EmeraldVaultNative;
    beforeEach(async () => {
        vault = new EmeraldVaultNative({
            dir: tempPath("entry-details")
        });
        vault.open();
        await vault.createGlobalKey("test");
    });
    afterEach(() => {
        vault.close()
    });

    test("List empty", async () => {
        let icons = await vault.iconsList();
        expect(icons.length).toBe(0);
    });

    test("Set an image", async () => {
        let image = fs.readFileSync("testdata/emerald_icon.png").buffer;

        let id = await vault.addWallet(undefined);
        let set = await vault.setIcon(id, image);

        expect(set).toBeTruthy();

        let icons = await vault.iconsList();
        expect(icons.length).toBe(1);
        expect(icons[0].id).toBe(id);
        expect(icons[0].format).toBe("png");
        expect(icons[0].entry.type).toBe("wallet");
    });

    test("Set an image as Uint8Array", async () => {
        let image = fs.readFileSync("testdata/emerald_icon.png");

        let id = await vault.addWallet(undefined);
        let set = await vault.setIcon(id, image);

        expect(set).toBeTruthy();

        let icons = await vault.iconsList();
        expect(icons.length).toBe(1);
        expect(icons[0].id).toBe(id);
        expect(icons[0].format).toBe("png");
        expect(icons[0].entry.type).toBe("wallet");
    });

    test("Remove an image", async () => {
        let image = fs.readFileSync("testdata/emerald_icon.png").buffer;

        let id = await vault.addWallet(undefined);
        let set = await vault.setIcon(id, image);

        expect(set).toBeTruthy();

        let icons = await vault.iconsList();
        expect(icons.length).toBe(1);

        let remove = await vault.setIcon(id, null);
        expect(remove).toBeTruthy();

        let icons2 = await vault.iconsList();
        expect(icons2.length).toBe(0);
    });

    test("Get image", async () => {
        let image = fs.readFileSync("testdata/emerald_icon.png").buffer;

        let id = await vault.addWallet(undefined);
        let set = await vault.setIcon(id, image);

        expect(set).toBeTruthy();

        let actImage = await vault.getIcon(id);

        expect(actImage).toEqual(image);
    });

    test("No image when not set", async () => {
        let image = fs.readFileSync("testdata/emerald_icon.png").buffer;

        let idFirst = await vault.addWallet(undefined);
        let setFirst = await vault.setIcon(idFirst, image);
        expect(setFirst).toBeTruthy();

        let idSecond = await vault.addWallet(undefined);

        let icons = await vault.iconsList();
        expect(icons.length).toBe(1);
        expect(icons[0].id).toBe(idFirst);

        let imageSecond = await vault.getIcon(idSecond);
        expect(imageSecond).toBeNull();
    });

})