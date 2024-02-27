import clear from "clear";
import inquirer from "inquirer";
import { generatePasswords, printPasswords } from "../page/generate";
import { Home } from "./home";
import { bcryptPassword, encryptPassword } from "../../modules/util/util";

async function utilsPage() {
    await clear();

    const { program } = await inquirer.prompt([
        {
            name: "program",
            type: "list",
            pageSize: 60,
            choices: [new inquirer.Separator(), "Generate Passwords","Print Passwords", "Encrypt", "Bcrypt", new inquirer.Separator(), "Back"],
            message: "Please select a Program",
        },
    ]);

    switch (program) {
        case "Generate Passwords":
            await generatePasswords();
            break;
        case "Print Passwords":
            await printPasswords();
            break;
        case "Encrypt":
            await Encrypt(0);
            break;
        case "Bcrypt":
            await Encrypt(1);
            break;
        case "Back":
            break;
    }
    // RETURN HOME ONCE DONE
    Home();

    async function Encrypt(algorithm: 0 | 1) {
        const { password } = await inquirer.prompt([
            {
                name: "password",
                message: "Please enter a password",
                type: "input",
            },
        ]);

        if (algorithm === 1) [console.log(await bcryptPassword(password))];
        if (algorithm === 0) [console.log(encryptPassword(password))];

        await inquirer.prompt([
            {
                name: "confirm",
                message: "please press enter to continue",
                type: "input",
            },
        ]);
    }
}

export { utilsPage };
