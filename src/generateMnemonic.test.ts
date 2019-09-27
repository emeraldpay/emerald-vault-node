import {EmeraldVaultNative} from "./EmeraldVaultNative";

describe('Test generate mnemonic', () => {

    let vault;
    beforeAll(() => {
        vault = new EmeraldVaultNative({
            dir: "./testdata/tmp-gen-mnemonic"
        });
    });

    test("errors for invalid length", () => {
        expect(() => {
            vault.generateMnemonic(19);
        }).toThrow();

        expect(() => {
            vault.generateMnemonic(11);
        }).toThrow();

        expect(() => {
            vault.generateMnemonic(25);
        }).toThrow();

        expect(() => {
            vault.generateMnemonic(0);
        }).toThrow();

        expect(() => {
            vault.generateMnemonic(-12);
        }).toThrow();
    });

    test("generates 12 words", () => {
        let m = vault.generateMnemonic(12);
        expect(m.split(" ").length).toBe(12);
    });
    test("generates 15 words", () => {
        let m = vault.generateMnemonic(15);
        expect(m.split(" ").length).toBe(15);
    });
    test("generates 18 words", () => {
        let m = vault.generateMnemonic(18);
        expect(m.split(" ").length).toBe(18);
    });
    test("generates 21 words", () => {
        let m = vault.generateMnemonic(21);
        expect(m.split(" ").length).toBe(21);
    });
    test("generates 24 words", () => {
        let m = vault.generateMnemonic(24);
        console.log(m);
        expect(m.split(" ").length).toBe(24);
        let uniq = new Set(m.split(" "));
        expect(uniq.size).toBeGreaterThan(12);
    });

});