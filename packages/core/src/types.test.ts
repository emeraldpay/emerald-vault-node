import {getAccountId} from "./types";

describe("Types", () => {

    it("getAccountId", () => {
        expect(getAccountId({type: "seed-hd", seedId: "test", hdPath: "m/44'/0'/0'/0/0"})).toBe(0);
        expect(getAccountId({type: "seed-hd", seedId: "test", hdPath: "m/44'/60'/0'/0/0"})).toBe(0);
        expect(getAccountId({type: "seed-hd", seedId: "test", hdPath: "m/44'/60'/1'/0/0"})).toBe(1);
        expect(getAccountId({type: "seed-hd", seedId: "test", hdPath: "m/44'/60'/2'/0/0"})).toBe(2);
        expect(getAccountId({type: "seed-hd", seedId: "test", hdPath: "m/44'/60'/15'/0/0"})).toBe(15);
    });

});