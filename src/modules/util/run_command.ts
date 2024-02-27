import { delay, replaceAll } from "./util";
import { SSH2CONN } from "./ssh_utils";

const TIMEOUT = 10 * 1000;

/** THIS FILE IS FOR COMMANDS SENT BY A REGULAR CONNECTION */

/**
 * Checks for not expected output
 * @param {ssh2} conn
 * @returns {Promise<String | Boolean>} returns true if successful or string error if not
 */
async function runCommandNotExpect(conn: SSH2CONN, command: string, not_expected: string | undefined, log_error = true): Promise<string | boolean> {
    let timeoutId: NodeJS.Timeout | undefined;

    try {
        const timeoutPromise = new Promise<string>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(log_error ? `${command} Timed Out` : "Timed Out"));
            }, TIMEOUT);
        });
        timeoutPromise.catch((error) => {
            // Handle timeout errors here if needed
        });

        const executionPromise = conn.exec(command);
        const value = await Promise.race([executionPromise, timeoutPromise]);
        if (value.toString().includes("Timed Out")) {
            conn.error(value);
        }
        clearTimeout(timeoutId);
        if (value.trim().toLowerCase().includes(not_expected)) {
            return replaceAll(value.trim(), "\n", " ");
        }
        return true;
    } catch (error: any) {
        if (error.trim().toLowerCase().includes(not_expected)) {
            return typeof error === "string" ? replaceAll(error, "\n", " ") : replaceAll(error.message, "\n", " ");
        }
        return true;
    }
}

/**
 * Checks for expected output
 * @param {ssh2} conn
 * @returns {Promise<String | Boolean>} returns true if successful or string error if not
 */
async function runCommand(conn: SSH2CONN, command: string, expect: string | undefined, log_error = true): Promise<string | boolean> {
    let timeoutId: NodeJS.Timeout | undefined;

    try {
        const timeoutPromise = new Promise<string>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(log_error ? `${command} Timed Out` : "Timed Out"));
            }, TIMEOUT);
        });
        timeoutPromise.catch((error) => {
            // Handle timeout errors here if needed
        });

        const executionPromise = conn.exec(command);

        const value = await Promise.race([executionPromise, timeoutPromise]);
        if (value.toString().includes("Timed Out")) {
            conn.error(value);
        }
        clearTimeout(timeoutId);
        if (!value.toString().toLowerCase().includes(expect)) {
            return replaceAll(value.trim(), "\n", " ");
        }
        return true;
    } catch (error: any) {
        if (error.toString().trim().toLowerCase().includes(expect)) {
            return true;
        }
        return typeof error === "string" ? replaceAll(error, "\n", " ") : replaceAll(error.message, "\n", " ");
    }
}

/**
 * checks for empty output
 * @param {ssh2} conn
 * @returns {Promise<String | Boolean>} returns true if successful or string error if not
 */
async function runCommandNoExpect(conn: SSH2CONN, command: string, log_error = true): Promise<string | boolean> {
    let timeoutId: NodeJS.Timeout | undefined;

    try {
        const timeoutPromise = new Promise<string>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(log_error ? `${command} Timed Out` : "Timed Out"));
            }, TIMEOUT);
        });
        timeoutPromise.catch((error) => {
            // Handle timeout errors here if needed
            // conn.error(error.message)
        });

        const executionPromise = conn.exec(command);
        const value = await Promise.race([executionPromise, timeoutPromise]);
        if (value.toString().includes("Timed Out")) {
            conn.error(value);
        }
        clearTimeout(timeoutId);

        if (value.trim().toLowerCase() != "") {
            return replaceAll(value.trim(), "\n", " ");
        }

        return value == "";
    } catch (error: any) {
        return typeof error === "string" ? replaceAll(error, "\n", " ") : replaceAll(error.message, "\n", " ");
    }
}
async function getOutput(conn: SSH2CONN, command: string, log_error = true): Promise<string> {
    let timeoutId: NodeJS.Timeout | undefined;

    try {
        const timeoutPromise = new Promise<string>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(log_error ? `${command} Timed Out` : "Timed Out"));
            }, TIMEOUT);
        });
        timeoutPromise.catch((error) => {
            // Handle timeout errors here if needed
            // conn.error(error.message)
        });
        const executionPromise = conn.exec(command);
        const value = await Promise.race([executionPromise, timeoutPromise]);
        if (value.toString().includes("Timed Out")) {
            conn.error(value);
        }
        clearTimeout(timeoutId);

        return value;
    } catch (error: any) {
        return typeof error === "string" ? replaceAll(error, "\n", " ") : replaceAll(error.message, "\n", " ");
    }
}

export { runCommand, runCommandNoExpect, runCommandNotExpect, getOutput };
