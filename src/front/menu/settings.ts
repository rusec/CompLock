import clear from "clear";
import inquirer from "inquirer";
import { sshMenu } from "../page/ssh";
import { addComputer, addComputerManual } from "../page/addComputer";
import runningDB from "../../db/db";
import { Home } from "./home";
import { json2csv } from "json-2-csv";
import fs from "fs";
import { checkPassword } from "../../modules/util/checkPassword";
import { mapDateString } from "../../modules/util/util";
import { pressEnter } from "../../modules/console/enddingModules";
import { restoreMenu } from "../page/backup";
async function Settings() {
    const { program } = await inquirer.prompt([
        {
            name: "program",
            type: "list",
            pageSize: 60,
            choices: [
                new inquirer.Separator(),
                new inquirer.Separator("Computer Setup"),
                "Shotgun Setup",
                "Add Computer",
                "Add Computer Manually",
                new inquirer.Separator("Data Setup"),
                "Load CSV",
                "Export DB",
                "Restore DB",
                new inquirer.Separator("SSH"),
                { name: "Display Public Key", value: "display_key" },
                new inquirer.Separator(),
                new inquirer.Separator("Passwords"),
                "Reset Master Password",
                new inquirer.Separator(),
                new inquirer.Separator("Navigation"),
                "Back",
            ],
            message: "Please select a setting",
        },
    ]);

    switch (program) {
        case "Shotgun Setup":
            await clear();
            await sshMenu();
            break;
        case "Add Computer":
            await addComputer();
            break;
        case "Add Computer Manually":
            await addComputerManual();
            break;
        case "Reset Master Password":
            await runningDB.resetMasterPassword();
            break;
        case "Load CSV":
            await checkPassword();
            await runningDB.readCSV();
            break;
        case "Restore DB":
            await checkPassword();
            await restoreMenu();
            await pressEnter();
            break;
        case "display_key":
            var ssh_key = await runningDB.getPublicSSHKey();
            console.log(ssh_key);
            await pressEnter();
            break;
        case "Export DB":
            await checkPassword();
            await runningDB.exportDB();
            break;
        case "Back":
            break;
    }
    Home();
}
export { Settings };
