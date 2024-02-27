import { commands } from "../util/commands";
import { SSH2CONN } from "../util/ssh_utils";

const passwd = "/etc/passwd";

// utilize passwd or a password manager like it to change password
async function changePasswordDarwin(conn: SSH2CONN, username: string, oldPassword: string, password: string) {
    try {
        const result = await conn.exec(commands.password.darwin.step_1(username, oldPassword, password));
        if (!result.trim().includes("error")) {
            conn.success("Changed password");
            return true;
        } else {
            const error = `Unable to change password. Got: ${result.trim()}. Please check for alias or no implementation.`;
            conn.error(error);
            return error;
        }
    } catch (error: any) {
        conn.error(`Error while changing password: ${error}`);
        return error.message || error.toString();
    }
}

export { changePasswordDarwin };
