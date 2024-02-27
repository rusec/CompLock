import assert from "assert";
import { generatePasses } from "../src/modules/util/password-generator";

describe("Password Generation", () => {
    describe("generatePasses", () => {
        it("should generate an array of passwords with the specified length", () => {
            const length = 5; // Change this to the desired length
            const seeder = "my-secret-seed"; // Change this to your actual seed

            const passwords = generatePasses(length, seeder);

            // Assert that the generated passwords array has the correct length
            assert.strictEqual(passwords.length, length);

            // Additional assertions (customize as needed):
            passwords.forEach((password) => {
                // Example: Assert that each password contains a hyphen
                assert.ok(password.includes("-"));

                // Example: Assert that each password starts with an uppercase letter
                assert.strictEqual(password[0], password[0].toUpperCase());

                // Example: Assert that each password follows the pattern "word-word-number"
                const [firstWord, secondWord, numberPart] = password.split("-");
                assert.ok(firstWord.length >= 3 && firstWord.length <= 13);
                assert.ok(secondWord.length >= 3 && secondWord.length <= 13);
            });
        });
    });
});
