import inquirer from "inquirer";
import clear from "clear";
import "colors";
import runningDB from "../../db/db";
import { edit } from "../page/editor";
import { runScript } from "../page/passwordScript";
import { checkPassword } from "../../modules/util/checkPassword";
import { Settings } from "./settings";
import { utilsPage } from "./utilsPage";
import { Commands } from "../page/commands";
import { scanComputers } from "../page/scanComputers";
import { getConnectedIps } from "../../modules/util/ssh_utils";

async function setTitleOfApplication() {
    setTerminalTitle(
        `${(process.env.DEV && "DEV MODE") || ""} Current Computers: ${
            (await runningDB.readComputers()).length
        }  Passwords Changed: ${await runningDB.getPasswordChanges()} Connections: ${(await getConnectedIps()).length}`
    );
}
function setTerminalTitle(title: string) {
    if (process.platform == "win32") {
        process.title = title;
    } else process.stdout.write(String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7));
}

setInterval(() => {
    setTitleOfApplication();
}, 15 * 1000);

async function Home() {
    process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");
    console.clear();
    console.log(
        `${(process.env.DEV && "DEV MODE") || ""} Current Computers: ${
            (await runningDB.readComputers()).length
        }  Passwords Changed: ${await runningDB.getPasswordChanges()} Connections: ${(await getConnectedIps()).length}`.bgGreen
    );
    const { program } = await inquirer.prompt([
        {
            name: "program",
            type: "list",
            pageSize: 60,

            choices: getHomeChoices(),
            message: "Please select the program you want to run:",
        },
    ]);

    switch (program) {
        case "Home":
            Home();
            break;
        case "Run Password Changer":
            await clear();
            await checkPassword();
            runScript();
            break;
        case "Run Password TEST":
            await clear();
            await checkPassword();
            runScript(true);
            break;
        case "Generate Passwords":
            break;
        case "Computers":
            edit();
            break;
        case "Commands":
            Commands();
            break;
        case "Utils":
            utilsPage();
            break;
        case "Settings":
            Settings();
            break;
        case "Scan":
            scanComputers();
            break;
        case "Exit":
            process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");
            console.clear();
            process.exit(0);
            break;
    }
    function getHomeChoices() {
        if (process.env.DEV && process.pkg == undefined) {
            return [
                new inquirer.Separator(),
                new inquirer.Separator("Passwords"),
                "Run Password Changer",
                "Run Password TEST",
                "Utils",
                new inquirer.Separator(),
                new inquirer.Separator("Computers"),
                "Computers",
                { name: "Scan All Computers", value: "Scan" },
                { name: "Run Commands", value: "Commands" },
                new inquirer.Separator(),
                new inquirer.Separator("Navigation"),
                "Settings",
                new inquirer.Separator(),
                "Home",
                "Exit",
            ];
        } else {
            return [
                new inquirer.Separator(),
                new inquirer.Separator("Passwords"),
                "Run Password Changer",
                "Utils",
                new inquirer.Separator(),
                new inquirer.Separator("Computers"),
                "Computers",
                { name: "Scan All Computers", value: "Scan" },
                { name: "Run Commands", value: "Commands" },
                new inquirer.Separator(),
                new inquirer.Separator("Navigation"),
                "Settings",
                new inquirer.Separator(),
                "Home",
                "Exit",
            ];
        }
    }
}

export { Home };
