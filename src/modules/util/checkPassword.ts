import runningDB from "../../db/db";
import inquirer from "inquirer";
import clear from "clear";
import logger from "../console/logger";
let valid_session = false;

/**
 * Checks and validates a master password stored in the running database or prompts the user to set it if not found.
 * After validating the master password, it allows access to protected functionality.
 *
 * @returns {Promise<void>} A promise that resolves when the password check and validation process is completed.
 */
async function checkPassword(force = false): Promise<void> {
    const hash = await runningDB.readPassword();
    if (hash == "") {
        const { master_password } = await inquirer.prompt([
            {
                name: "master_password",
                type: "input",
                validate: function (value: string) {
                    if (value.length > 8) {
                        return true;
                    }
                    return "Password must be longer then 8 characters";
                },
                message: "please enter a master password",
            },
        ]);
        await runningDB.writePassword(master_password);
        return await checkPassword();
    }
    if (valid_session && process.env.DEV && !process.pkg) {
        return;
    }
    await clear();
    let trials = 3;
    function validateFunc(value: string) {
        const v = runningDB.validateMasterPassword(hash, value);
        if (trials <= 0) {
            logger.log(`Log in Attempt Failed`, "info");
            process.exit(0);
        }
        if (!v) {
            trials--;
            logger.log(`Log in Attempt Failed Attempts Left ${trials + 1}`, "info");
            return "Incorrect Password";
        }
        logger.log(`Log in Attempt Success`, "info");
        return true;
    }
    await inquirer.prompt([
        {
            name: "master_password",
            type: "password",
            validate: validateFunc,
        },
    ]);
    valid_session = true;
}

function isValidSession() {
    return valid_session;
}

export { checkPassword, isValidSession };
