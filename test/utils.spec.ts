import {
    bcryptPassword,
    encryptPassword,
    findAndRemove,
    isValidIPAddress,
    makeId,
    mapDateString,
    removeANSIColorCodes,
    replaceAll,
} from "../src/modules/util/util";
import assert from "assert";
describe("App Utils", function () {
    describe("removeANSIColorCodes", () => {
        it("should remove ANSI Color Code from string", () => {
            let value = removeANSIColorCodes("\x1B[32mA\x1B[0m");
            assert.equal(value, "A");
        });
        it("should return string if no match", () => {
            let value = removeANSIColorCodes("A");
            assert.equal(value, "A");
        });
    });
    describe("isValidIPAddress", () => {
        it("should return true valid IP", () => {
            let value = isValidIPAddress("192.168.111.111");
            assert.ok(value);
        });
        it("should return false invalid IP ", () => {
            let value = isValidIPAddress("A");
            assert.ok(!value);
        });
    });
    describe("bcryptPassword", () => {
        it("should create bCrypt Password ", async () => {
            let value = await bcryptPassword("I like Pineapples");
            assert.ok(value);
        });
    });
    describe("encryptPassword", () => {
        it("should create sha512crypt Password ", () => {
            let value = encryptPassword("I like Pineapples");
            assert.ok(value);
        });
    });
    describe("replaceAll", () => {
        it("should replace all the instances of the search string with the replace string", () => {
            let value = replaceAll("I want more string to be stringing", "string", "Pineapples");
            assert.ok(!value.includes("string"), "Value has search string");
        });
    });
    describe("mapDateString", () => {
        it("should correctly format the input date string", () => {
            const input1 = "2024-02-27T20:15:14";
            const expectedOutput1 = {
                name: "2024/02/27  Time: 08:15:14 PM",
                value: "2024-02-27T20:15:14",
            };

            const input2 = "2023-12-15T10:30:00";
            const expectedOutput2 = {
                name: "2023/12/15  Time: 10:30:00 AM",
                value: "2023-12-15T10:30:00",
            };

            assert.deepStrictEqual(mapDateString(input1), expectedOutput1);
            assert.deepStrictEqual(mapDateString(input2), expectedOutput2);
        });
    });
    describe("makeId", () => {
        it("should generate a random UUID", () => {
            const id = makeId();
            assert.strictEqual(typeof id, "string");
            assert.ok(id.match(/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/i));
        });
    });
    describe("findAndRemove", () => {
        it("should remove the target value from the array", () => {
            const inputArray = [1, 2, 3, 4, 5];
            const targetValue = 3;
            const expectedOutput = [1, 2, 4, 5];

            const result = findAndRemove(inputArray, targetValue);
            assert.deepStrictEqual(result, expectedOutput);
        });

        it("should not modify the original array", () => {
            const inputArray = [1, 2, 3, 4, 5];
            const targetValue = 3;

            findAndRemove(inputArray, targetValue);
            assert.deepStrictEqual(inputArray, [1, 2, 3, 4, 5]);
        });
    });
});
