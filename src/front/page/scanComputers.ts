import { scanComputer } from "../../modules/computer/scan";
import { pressEnter } from "../../modules/console/enddingModules";
import { checkPassword } from "../../modules/util/checkPassword";
import runningDB from "../../db/db";
import { log } from "../../modules/console/debug";
import { findAnyConnection, makeConnection } from "../../modules/util/ssh_utils";
import { Home } from "../menu/home";

async function scanComputers() {
    await checkPassword();
    const servers = await runningDB.readComputers();

    log("Scanning Systems");
    let success = 0;
    let done = 1;
    let numberOfComputers = servers.length;
    for (let server of servers) {
        try {
            log(`${done} of ${numberOfComputers} computers`, "info");
            let conn = await findAnyConnection(server.users);
            if (!conn) {
                done++;
                log(`[${server.ipaddress}] [${server.Name}] Unable to connect to server`, "error");
                continue;
            }
            await scanComputer(conn, server["OS Type"], false);
            success++;
            done++;
        } catch (error) {}
    }
    await pressEnter();
    Home();
}

export { scanComputers };
