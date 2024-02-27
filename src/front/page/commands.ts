import { clear } from "console";
import runningDB from "../../db/db";
import { Server } from "../../db/dbtypes";
import { Home } from "../menu/home";
import inquirer from "inquirer";
import { checkPassword } from "../../modules/util/checkPassword";
import { makeConnection } from "../../modules/util/ssh_utils";
import { log } from "../../modules/console/debug";
import { getOutput } from "../../modules/util/run_command";
import { logToFile } from "../../modules/console/enddingModules";

// Assumes the first user is the admin user
async function Commands() {
    await clear();
    await checkPassword();
    let json = await runningDB.readComputers();

    var ipAddressesChoices = json.map((v, k) => {
        return { name: v.ipaddress + "  " + v["OS Type"] + " " + v.Name + "User: " + v.users[0].username, value: v };
    });

    if (ipAddressesChoices.length === 0) {
        return Home();
    }
    const { computers, command } = await inquirer.prompt([
        {
            name: "computers",
            type: "checkbox",
            pageSize: 50,
            choices: [...ipAddressesChoices],
            message: "Please select the computers youd like to target:",
        },
        {
            name: "command",
            type: "input",
            message: "Please type the command",
        },
    ]);
    await shotgunCommands(computers, command);

    Home();
}

async function shotgunCommands(servers: Server[], command: string) {
    let fileLOG = "LOG FOR COMMANDS RUN\n";
    for (let id = 0; id < servers.length; id++) {
        try {
            let server = servers[id];
            fileLOG += `Running Command for ${server.ipaddress} ${server.Name}\n`;
            let conn = await makeConnection(server.users[0]);
            if (!conn) {
                log(`${server.ipaddress} Unable to Connect to Host`, "error");

                continue;
            }
            let output = await getOutput(conn, command);
            log(`${server.ipaddress} Successful LOG:\n${output}`, "success");
            fileLOG += `${server.ipaddress} Successful Ran Command\nLOG:\n${output}\n`;
        } catch (error) {}
        log(`${id + 1} of ${servers.length} Done`);
    }
    await logToFile(fileLOG);
}

export { Commands };
