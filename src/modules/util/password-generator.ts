import keccak256 from "keccak256";
import RandomSeed from "random-seed";
import words from "../../words/words.json";
/**
 *
 * Generates an array of random passwords.
 *
 * @param {number} length - The number of passwords to generate.
 * @param {string} seeder - A seed string for the random number generator.
 * @returns {string[]} An array of randomly generated passwords.
 */
function generatePasses(length: number, seeder: string): string[] {
    const rng = RandomSeed.create(keccak256(seeder + "shrimp_key").toString("hex"));

    const results = [];
    for (let index = 0; index < length; index++) {
        results.push(createPassword());
    }
    function createPassword() {
        var first_word = getWord();
        first_word = first_word[0].toUpperCase() + first_word.substring(1);
        var pass = first_word + "-";
        let numbersIndex = randomBetween(0, 3);
        for (let i = 0; i < 3; i++) {
            if (numbersIndex == i) pass += randomBetween(100, 1000);
            else pass += getWord();
            if (i !== 2) {
                pass += "-";
            }
        }
        return pass;
    }

    // function capitalizeRandomWord() {
    //     var word = getWord();
    //     var index_cap = randomBetween(0, word.length);
    //     return word.substring(0, index_cap) + word[index_cap].toUpperCase() + word.substring(index_cap + 1);
    // }
    function getWord() {
        let word = words[randomBetween(0, words.length)];
        while (word.length < 3 || word.length > 13) {
            word = words[randomBetween(0, words.length)];
        }
        return word;
    }

    function randomBetween(min: number, max: number) {
        return Math.floor(rng.random() * (max - min) + min);
    }

    return results;
}

export { generatePasses };
