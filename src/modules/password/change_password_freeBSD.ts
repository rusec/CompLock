import { runCommand, runCommandNoExpect } from "../util/run_command";
import { bcryptPassword } from "../util/util";
import { commands } from "../util/commands";
import { SSH2CONN } from "../util/ssh_utils";

async function changePasswordFreeBSD(conn: SSH2CONN, username: string, password: string) {
    await checks(conn);

    const bcrypt_password = await bcryptPassword(password);

    let changedPassword = await runCommand(conn, commands.password.freebsd.step_1(bcrypt_password, username), `user information updated`, false);
    if (typeof changedPassword != "string") {
        conn.success("Changed password");
        return true;
    }

    let error = `Unable to use chpass. Got: ${changedPassword.trim()}. Please check for alias or no implementation.`;
    conn.warn(error);

    changedPassword = await runCommandNoExpect(conn, commands.password.freebsd.step_2(bcrypt_password, username), false);
    if (typeof changedPassword != "string") {
        conn.success("Changed password");
        return true;
    }

    error = `Unable to use usermod. Got: ${changedPassword.trim()}. Please check for alias or no implementation.`;
    conn.error(error);
    conn.error("Unable to change password");

    return error;
}

export { changePasswordFreeBSD };
/**
 * Hashes a password using bcrypt with a generated salt.
 *
 * @param {string} password - The password to hash.
 * @returns {Promise<string>} A promise that resolves to the hashed password.
 * @throws {Error} Throws an error if hashing fails.
 */

async function checks(conn: SSH2CONN) {
    let passed = 1;
    // log(`running security checks on ${conn.config[0].host}`, 'log')
}
