import inquirer from "inquirer";
import clear from "clear";
import { generatePasses } from "../../modules/util/password-generator";
import fs from "fs";
import { log } from "../../modules/console/debug";
import { delay } from "../../modules/util/util";
import { Home } from "../menu/home";
async function generatePasswords() {
    await clear();
    const { seed, amount } = await inquirer.prompt([
        {
            name: "seed",
            type: "input",
            message: "Please enter a seed:",
        },
        {
            name: "amount",
            type: "number",
            filter: function (value) {
                if (isNaN(value)) {
                    return "";
                }
                return value;
            },
            validate: function (value) {
                if (value > 0) {
                    return true;
                }
                return "Please enter a value greater then 0";
            },
        },
    ]);

    let passwords = generatePasses(amount, seed);
    for (const password of passwords) {
        console.log(password);
    }

    const { file } = await inquirer.prompt([
        {
            name: "file",
            type: "confirm",
            message: "would you like to output to a file?",
        },
    ]);
    if (file) {
        var string = "";
        for (const password of passwords) {
            string += password + "\n";
        }
        fs.writeFileSync("phone.txt", string, "utf8");
        log("Updated Text File");
        await delay(300);
    }
}

async function printPasswords(){
    await clear();
    console.log("Printing Passwords, Warning Seed will be printed too".bgRed)
    const { seed, amount,fileName } = await inquirer.prompt([
        {
            name: "seed",
            type: "input",
            message: "Please enter a seed:",
        },
        {
            name: "amount",
            type: "number",
            filter: function (value) {
                if (isNaN(value)) {
                    return "";
                }
                return value;
            },
            validate: function (value) {
                if (value > 0) {
                    return true;
                }
                return "Please enter a value greater then 0";
            },
        },
        {
            name:"fileName",
            type: 'input',
            message:"Please enter a file name:"
        }
    ]);

    let passwords = generatePasses(amount, seed);


    var string = `Seed: ${seed}\n\n`;
    for (const password of passwords) {
        string += password + "\n";
    }
    fs.writeFileSync(`${fileName}.txt`, string, "utf8");
    log(`Wrote Passwords To ${fileName}.txt`);
    await delay(500);

}

export { generatePasswords,printPasswords };
