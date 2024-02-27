import { changePasswordLinux } from "./change_password_linux";
import { changePasswordWin } from "./change_password_windows";
import { Server, ServerInfo, User } from "../../db/dbtypes";
import { changePasswordDarwin } from "./change_password_darwin";
import { changePasswordFreeBSD } from "./change_password_freeBSD";
import { log } from "../console/debug";
import options from "../util/options";
import { detect_os, makeConnection } from "../util/ssh_utils";
import { ejectSSHkey, testPassword } from "../util/ssh_utils";
import { TestLDAPPassword } from "./active_directory";
import { changePasswordSunOS } from "./change_password_sunos";

export type password_result = {
    password: string;
    ssh: boolean;
    error: false | string;
};

async function changePasswordOf(computer: Server, user:User, new_password: string): Promise<password_result | string> {
    if (!new_password || new_password.length < 8) {
        return "Password does not meet requirements";
    }

    const conn = await makeConnection(user);
    if(!conn) log(`Unable to connect to Target ${computer.Name} ${computer.ipaddress}`, 'warn')
    else conn.log("Connected to Target")
    try {
        let res;

        if (computer["OS Type"] === "windows") {
            const username = user.username;
            const newPassword = new_password;
            const oldPassword = user.password
            // Change password on Windows
            const passwordChangeResult = await changePasswordWin(computer,user, conn, username, newPassword);

            user.password =newPassword
            // Establish a permanent connection case conn was false.
            const newConn = conn? conn:await makeConnection(user);
        
            // Test LDAP password
            const ldapTestResult = await TestLDAPPassword(user, newPassword);

            if (!newConn) {
                return {
                    password: ldapTestResult ? newPassword : oldPassword,
                    ssh: user.ssh_key,
                    error: ldapTestResult ? false :`${computer.ipaddress} ${computer.Name} ${user.username} Unable to connect to host` ,
                };
            }
        
            // Eject SSH key
            const sshKey = await ejectSSHkey(newConn, computer["OS Type"]);
        
            // Test new password
            const passwordTestResult = await testPassword(newConn, newPassword);
        
            await newConn.close();
            // conn && await conn.close()
            return {
                password: passwordTestResult || ldapTestResult ? newPassword : oldPassword,
                ssh: !newConn ? user.ssh_key : sshKey,
                error: passwordTestResult ? false : passwordChangeResult,
            };
        }
        if (!conn) {
            throw new Error(`${computer.ipaddress} ${computer.Name} ${user.username} Unable to connect to host`);
        }

        if (!options.includes(computer["OS Type"])) {
            let os = await detect_os(conn);
            if (os) computer["OS Type"] = os;
        }

        switch (computer["OS Type"].toLowerCase()) {
            case "freebsd":
                res = await changePasswordFreeBSD(conn, user.username, new_password);
                break;
            case "linux":
                res = await changePasswordLinux(conn, user.username, new_password, user.password);
                break;
            case "darwin":
                res = await changePasswordDarwin(conn, user.username, user.password, new_password);
                break;
            case "sunos":
                res = await changePasswordSunOS(conn,user.username, new_password, user.password);
                break;
            default:
                res = "Unknown OS";
                break;
        }

        // ADD CHECK FOR SSH KEY
        let ssh_key = await ejectSSHkey(conn, computer["OS Type"]);

        let pass_success = await testPassword(conn, new_password);

        conn.removeAllListeners();
        await conn.close()
        
        return { password: pass_success ? new_password : user.password, ssh: ssh_key, error: pass_success ? false : res };
    } catch (error: any) {
        if (conn) {
            conn.error(`Got Error: ${error.message ? error.message : error}`);
        } else log(`[${computer.ipaddress}] [${computer.Name}] [${user.username}] Got Error: ${error.message ? error.message : error}`);
        return `Got Error: ${error.message ? error.message : error}`;
    }
}

export { changePasswordOf };
