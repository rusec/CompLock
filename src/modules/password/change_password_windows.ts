import { delay } from "../util/util";
import { sendCommandAndInput, sendCommand, sendCommandExpect } from "../util/socket_commands";
import { SSH2CONN, detect_hostname } from "../util/ssh_utils";
import { Server, User } from "../../db/dbtypes";
import { LDAPChangePassword } from "./active_directory";
import logger from "../console/logger";
import { getOutput, runCommand } from "../util/run_command";

async function changePasswordWin(server: Server, user: User, conn: SSH2CONN | false, username: string, password: string) {
    var then = new Date();
    if (!conn) {
        try {
            return await LDAPChangePassword(user, password);
        } catch (error: any) {
            logger.log(`[${server.ipaddress}] [${server.Name}] [${user.username}] error ${error.message}`, "error");
            return error.message ? (error as Error) : (error.message as string);
        }
    }

    try {
        let checkReport = await check(conn);
        conn.log(
            `AD: ${checkReport.domainController}  Domain_User: ${checkReport.isDomainUser}  Local_User: ${checkReport.useLocal} Force_Net: ${checkReport.forceNetUser}`
        );
        let useLocalUser = checkReport.useLocal;
        if (checkReport.forceNetUser) {
            return await changePasswordWindowsLocal(conn, username, password, false);
        }

        if (checkReport.isDomainUser && checkReport.domainController) {
            try {
                return await LDAPChangePassword(user, password);
            } catch (error: any) {
                logger.log(`[${server.ipaddress}] [${server.Name}] [${user.username}] LDAP Connection ${error.message}`, "warn");
                conn.log("Fallback ssh");
                return await changePasswordWinAD(conn, stripDomain(username), password);
            }
        }
        if (checkReport.isDomainUser) {
            return "UNABLE TO CHANGE PASSWORD OF DOMAIN ACCOUNT ON NON-DOMAIN-CONTROLLER";
        }
        return await changePasswordWindowsLocal(conn, username, password, useLocalUser);
    } catch (error: any) {
        logger.log(`${error}`, "error");
        return error.message ? (error as Error) : (error.message as string);
    } finally {
        var now = new Date();
        var lapse_time = now.getTime() - then.getTime();
        logger.log(`Time to change Password ${lapse_time} ms on windows`);
    }
}
async function changePasswordWindowsLocal(conn: SSH2CONN, username: string, password: string, useLocalUser: boolean) {
    let shellSocket;

    try {
        conn.info(`Using ${useLocalUser ? "Get-Local" : "net user"}`);

        if (useLocalUser) {
            shellSocket = await conn.shell();
            await sendCommandExpect(shellSocket, `powershell.exe`, `> `).catch((r) => "");
            // await delay(3000);
            await sendCommandAndInput(
                shellSocket,
                `${password}`,
                `$pass = Read-Host -AsSecureString;$user = Get-LocalUser "${username}";Set-LocalUser -Name $user -Password $pass;`
            );
        } else {
            await runCommand(conn, `net user ${username} ${password}`, "The command completed successfully", false);
        }
        conn.success("Changed Password");
        if (shellSocket) {
            await sendCommand(shellSocket, "exit", true);
            shellSocket.close();
        }
        return true;
    } catch (error: any) {
        shellSocket?.close();
        conn.error(`Unable to change Local password  ${error}`);
        if (error.toString().includes("An error occurred."))
            return "An error occurred while changing password, check if user exist and password meets requirements";

        return error as Error;
    }
}

async function changePasswordWinAD(conn: SSH2CONN, username: string, password: string) {
    conn.info("Changing Domain Controller Account");
    try {
        // let useLocalUser = await check(conn);
        let shellSocket = await conn.shell();

        try {
            conn.info("Resetting Active Directory User");

            // Ignore errors here incase powershell has different setup
            await sendCommandExpect(shellSocket, `powershell.exe`, `> `).catch((r) => "");
            // await delay(3000);
            await sendCommandAndInput(
                shellSocket,
                `${password}`,
                `$pass = Read-Host -AsSecureString ; Set-ADAccountPassword -Identity "${username}" -Reset -NewPassword $pass;`
            );

            conn.success("Changed password");
        } catch (error: any) {
            shellSocket.close();
            conn.error(`Unable to Change AD User password  ${error}`);
            if (error.toString().includes("An error occurred."))
                return "An error occurred while changing password, check if user exist and password meets requirements";
            return error;
        }

        await sendCommand(shellSocket, "exit", true);
        shellSocket.close();

        return true;
    } catch (error: any) {
        return error.message ? (error.toString() as string) : (error.message as string);
    }
}

export { changePasswordWin };

type check_report = {
    domainController: boolean;
    useLocal: boolean;
    isDomainUser: boolean;
    forceNetUser: boolean;
};
async function check(conn: SSH2CONN): Promise<check_report> {
    var passed = 1;
    var forceNetUser = false;
    conn.log("Running Checks");

    let get_local_check;

    try {
        var output = await getOutput(conn, `powershell.exe "Get-LocalUser"`);
        // If this times out either we do not have connect or powershell cannot be targeted. Will focus to use net user
        if (output.includes("Timed")) {
            get_local_check = false;
            forceNetUser = true;
        } else if (output.trim().includes("is not recognized")) {
            conn.warn(`Windows check error GOT ${output.substring(0, 30)} WANTED User List, Powershell version might be out of date`);
            passed--;
        } else {
            get_local_check = true;
        }
    } catch (error: any) {}

    let isDomainController = false;
    try {
        var output = await getOutput(conn, `wmic.exe ComputerSystem get DomainRole`);
        if (output.includes("Timed") || output.includes("is not recognized")) {
            isDomainController = false;
        } else if (output.includes("4") || output.includes("5")) {
            conn.log("Computer is a Domain Controller");
            isDomainController = true;
        }
    } catch (error) {}
    let isDomainUser = false;
    try {
        let whoamiString = await conn.exec("whoami");
        let hostname = await detect_hostname(conn);

        // if hostname is not included in whoami then its a domain user
        if (!whoamiString.includes(hostname?.toLowerCase())) {
            isDomainUser = true;
        }
    } catch (error) {}
    conn.info(`Passed ${passed} of 2 tests`);
    return {
        useLocal: !!get_local_check,
        domainController: isDomainController,
        isDomainUser: isDomainUser,
        forceNetUser: forceNetUser,
    };
}

// extracts the username from a domain
function stripDomain(fullUsername: string): string {
    // Use a regex pattern to match "domain\username"
    const regex = /(?:\\|@)([^\\@]+)$/;
    const match = fullUsername.match(regex);

    if (match && match[1]) {
        // If a match is found, return the captured group (username)
        return match[1];
    } else {
        // If no match is found, return the original string
        return fullUsername;
    }
}
