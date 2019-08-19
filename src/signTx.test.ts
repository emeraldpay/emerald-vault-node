import {EmeraldVaultNative} from "./EmeraldVaultNative";

describe('Test signining', () => {

    const vault = new EmeraldVaultNative({
        dir: "./testdata/vault-0.26-basic"
    });

    test("sign", () => {
        let tx = {
            from: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
            to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
            value: "0x1051",
            gas: "0x5208",
            gasPrice: "0x77359400",
            nonce: "0x2"
        };
        let raw = vault.signTx("eth", tx, "testtest");

        expect(raw).toBe("0xf865028477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd38210518025a09d38cc96e9856d1a82ede28bee743dcff816ea3cb2217b927d4eab11887d9b9da05a236057d16224e93f59230e1c722e4511553e7264a80e787bcd29c6ec6a90c4");
    });

    test("sign with  nonce 0x196", () => {
        let tx = {
            from: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
            to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
            value: "0x292d3069b0a00",
            gas: "0x5208",
            gasPrice: "0x77359400",
            nonce: "0x196"
        };
        let raw = vault.signTx("eth", tx, "testtest");

        expect(raw).toBe("0xf86c8201968477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3870292d3069b0a008026a0073d38c0929a96f0af687aa519e817bc5cee830cf27bbb0525fd2b102d364318a00b2ab0a20e908a0cd2f96720cae6f1dd900f3de7d40e4bb45fcb76263026c51c");
    });

    test("sign with data", () => {
        let tx = {
            from: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
            to: "0x3eaf0b987b49c4d782ee134fdc1243fd0ccdfdd3",
            value: "0x0",
            gas: "0x5208",
            gasPrice: "0x77359400",
            nonce: "0x19",
            data: "0xa9059cbb0000000000000000000000000d0707963952f2fba59dd06f2b425ace40b492fe0000000000000000000000000000000000000000000002650fe6fe599c940000"
        };
        let raw = vault.signTx("eth", tx, "testtest");

        expect(raw).toBe("0xf8a8198477359400825208943eaf0b987b49c4d782ee134fdc1243fd0ccdfdd380b844a9059cbb0000000000000000000000000d0707963952f2fba59dd06f2b425ace40b492fe0000000000000000000000000000000000000000000002650fe6fe599c94000025a0b2501b7c0ccd6cb000b6f568e504ed605f41e5fbdbdffe2a440e636aa499da1ca02e7e76de7b0167a09fda23395039443cf0bb523ceeacdf0f9fa873408753a7a3");
    });

});