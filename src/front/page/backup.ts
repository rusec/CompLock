import inquirer from "inquirer";
import runningDB from "../../db/db";
import { delay, mapDateString } from "../../modules/util/util";
import { error, log } from "../../modules/console/debug";

async function restoreMenu() {
    try {
        let backups = await runningDB.getBackups();
        if (backups.length === 0) return;
        let values = backups.map((v) => mapDateString(v));
        let { backup, password } = await inquirer.prompt([
            {
                name: "password",
                type: "password",
                message: "please enter the master when backup was made password:",
            },
            {
                name: "backup",
                message: "Please select a Backup to Restore from:",
                type: "list",
                pageSize: 50,
                choices: [...values, { name: "Back", value: "Back" }],
            },
        ]);
        if (backup === "Back") return;
        let result = await runningDB.setRestore(backup, password);
        if (!result) error("Unable to restore DB from " + backup);
        else log("restored DB from " + backup, "success");
    } catch (error) {
        console.log(error);
    }

    return;
}

export { restoreMenu };
