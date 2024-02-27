import inquirer from "inquirer";
import { isValidIPAddress } from "../../modules/util/util";
import runningDB from "../../db/db";
import { scanSSH } from "../../modules/util/ssh_utils";
import { log } from "../../modules/console/debug";
import { delay } from "../../modules/util/util";
import { Home } from "../menu/home";
import { pressEnter } from "../../modules/console/enddingModules";
import options from "../../modules/util/options";
const addComputer = async function () {
    const { ip, user, pass } = await inquirer.prompt([
        {
            name: "ip",
            message: "please enter an ip:",
            type: "input",
            validate: (v) => {
                var valid = isValidIPAddress(v);
                if (valid) return true;
                return "invalid ip";
            },
        },
        {
            name: "user",
            message: "please enter a username",
            type: "input",
        },
        {
            name: "pass",
            message: "please enter a password",
            type: "input",
        },
    ]);
    await trySSH();
    async function trySSH() {
        var computer_info = await scanSSH(ip, user, pass);

        let success = false;
        if (typeof computer_info == "object") {
            await runningDB.addTargetAndUser(computer_info.hostname, ip, user, pass, computer_info.operatingSystem, computer_info.domain);
            log(`Added`, "success");
            success = true;
        } else {
            log(`Unable to reach computer, Not Added`, "error");
        }
        if (success) return;

        let { confirm } = await inquirer.prompt([
            {
                name: "confirm",
                type: "confirm",
                message: "Would you like to try again",
            },
        ]);
        if (confirm) {
            await trySSH();
        }
    }

    await pressEnter();
};

async function addComputerManual() {
    const { hostname, ip, user, pass, os_type, domain } = await inquirer.prompt([
        {
            name: "hostname",
            message: "please enter a hostname",
            type: "input",
        },
        {
            name: "ip",
            message: "please enter an ip:",
            type: "input",
            validate: (v) => {
                var valid = isValidIPAddress(v);
                if (valid) return true;
                return "invalid ip";
            },
        },
        {
            name: "user",
            message: "please enter a username",
            type: "input",
        },
        {
            name: "pass",
            message: "please enter a password",
            type: "input",
        },
        {
            name: "os_type",
            message: "please enter a password",
            type: "list",
            choices: options,
        },
        {
            name: "domain",
            message: "please enter a domain",
            type: "input",
        },
    ]);

    await runningDB.addTargetAndUser(hostname, ip, user, pass, os_type, domain);
    log(`Added`, "success");
    await pressEnter();
}

export { addComputer, addComputerManual };
