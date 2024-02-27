import { removeANSIColorCodes, delay } from "./util";
import { Channel } from "ssh2";
const TIMEOUT = 5000;

/** THIS FILE IS FOR COMMANDS SENT BY A SOCKET CONNECTION */
function sendCommandExpect(socket: Channel, command: string, expected: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let log = "";

        const onData = (data: string) => {
            let parsedData = removeANSIColorCodes(data.toString());
            log += parsedData;
            if (log.includes(expected)) {
                cleanUp();
                resolve(log);
            }
        };
        const cleanUp = () => {
            clearTimeout(timeoutId);
            socket.stdout.removeListener("data", onData);
        };

        socket.stdout.on("data", onData);
        socket.write(`${command}\r`);

        const timeoutId = setTimeout(() => {
            cleanUp();
            reject(filterLog(log));
        }, TIMEOUT);
    });
}
/** THIS FILE IS FOR COMMANDS SENT BY A SOCKET CONNECTION */
function socketGetOutput(socket: Channel, command: string) {
    return new Promise((resolve, reject) => {
        let log = "";

        const onData = (data: string) => {
            let parsedData = removeANSIColorCodes(data.toString());
            log += parsedData;
        };
        const cleanUp = () => {
            clearTimeout(timeoutId);
            socket.stdout.removeListener("data", onData);
        };

        socket.stdout.on("data", onData);
        socket.write(`${command}\r`);

        const timeoutId = setTimeout(() => {
            cleanUp();
            resolve(filterLog(log));
        }, TIMEOUT);
    });
}
function sendCommandNoExpect(socket: Channel, command: string, not_expected: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let log = "";

        const onData = (data: string) => {
            let parsedData = removeANSIColorCodes(data.toString());
            log += parsedData;
            if (log.includes(not_expected)) {
                cleanUp();
                reject(filterLog(log));
            }
        };

        const cleanUp = () => {
            clearTimeout(timeout);
            socket.stdout.removeListener("data", onData);
        };

        socket.stdout.on("data", onData);
        socket.write(`${command}\r\r`);

        const timeout = setTimeout(() => {
            cleanUp();
            resolve(filterLog(log));
        }, 6000);
    });
}
/**
 * Sends a command to the client.
 *  The reason for the exit boolean is because the socket will close after exit is sent meaning the client will not receive validation of exit
 */
function sendCommand(socket: Channel, command: string, exit?: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
        let log = "";

        const onData = (data: string) => {
            let parsedData = removeANSIColorCodes(data.toString());
            log += parsedData;
            if (log.includes(command)) {
                cleanUp();
                resolve(log);
            }
        };

        const cleanUp = () => {
            clearTimeout(timerId);
            socket.stdout.removeListener("data", onData);
        };

        socket.stdout.on("data", onData);
        socket.write(`${command}\r`, "utf8");
        if (exit) {
            resolve(log);
            return;
        }

        const timerId = setTimeout(() => {
            reject(filterLog(log));
            cleanUp();
        }, TIMEOUT);
    });
}

function sendInput(socket: Channel, input: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        socket.stdin.write(`${input}\r`, (err) => {
            clearTimeout(timerId);
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });

        const timerId = setTimeout(() => {
            reject();
        }, TIMEOUT);
    });
}

/**
 *  Allows you to send a command and input after for Read-Host, has automatic delay
 *
 */
function sendCommandAndInput(socket: Channel, input: string, command: string): Promise<string | true> {
    return new Promise((resolve, reject) => {
        let log = "";
        let commandSent = false;
        let sentInput = false;
        let errored = false;
        async function sendInputToSocket() {
            sentInput = true;
            await delay(100);
            if (errored) {
                return;
            }
            socket.stdin.write(`${input}\r`, async (err: any) => {
                if (err) {
                    cleanUp();
                    reject(filterLog(log));
                } else {
                    await delay(3000);
                    !errored && resolve(true);
                    cleanUp();
                }
            });
        }
        const onData = (chuck: Buffer) => {
            let parsedData = filterLog(chuck.toString());
            log += parsedData;
            if (errored) {
                return;
            }
            if (/(?<!["'])An error occurred.(?!["'])/.test(log.replace(/\r|\n|\r\n/g, ""))) {
                errored = true;
                reject(filterLog(log));
                cleanUp();
                return;
            }

            if (log.replace(/\r|\n|\r\n/g, "").includes(command.trim()) && !commandSent) {
                commandSent = true;
                if (!sentInput) sendInputToSocket();
            }
        };

        socket.on("data", onData);
        socket.write(`${wrapTryCatch(command)}\r`);

        const cleanUp = () => {
            clearTimeout(timerId);
            socket.stdout.removeListener("data", onData);
        };
        const timerId = setTimeout(() => {
            reject(log.replace(/\r|\n|\r\n/g, "") + " TIMEOUT");
        }, 15000);
    });
}

function wrapTryCatch(command: string) {
    return `try{ ${command} }catch{"An error occurred."}`;
}

function sendInputExpect(socket: Channel, input: string, expect: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let log: Buffer[] = [];

        const onData = (chuck: string) => {
            let parsedData = removeANSIColorCodes(chuck.toString());
            log.push(Buffer.from(chuck));
            if (removeANSIColorCodes(Buffer.concat(log).toString("utf8")).includes(expect)) {
                cleanUp();
                resolve(removeANSIColorCodes(Buffer.concat(log).toString("utf8")));
            }
        };

        const cleanUp = () => {
            clearTimeout(timeoutId);
            socket.stdout.removeListener("data", onData);
        };

        socket.stdout.on("data", onData);
        socket.stdin.write(`${input}\r`, "utf8");

        const timeoutId = setTimeout(() => {
            cleanUp();
            reject(filterLog(Buffer.concat(log).toString("utf8")));
        }, TIMEOUT);
    });
}
function filterLog(strLog: string): string {
    let stringWithoutColor = removeANSIColorCodes(strLog);

    const consoleCharPattern = /\x1B\[.*?[@-~]/g;
    const stringWithoutConsoleChars = stringWithoutColor.replace(consoleCharPattern, "");

    return stringWithoutConsoleChars;
}

function removeWindowsLoading(strLog: string): string {
    const loadingMessagePattern = /\[.*?\]/g;
    const stringWithoutLoadingLines = strLog.replace(loadingMessagePattern, (match) => {
        // Replace the loading lines with an empty string
        return match.includes("Loading") ? "" : match;
    });

    return stringWithoutLoadingLines.trim(); // Trim leading and trailing whitespace
}

export default { sendCommand, sendCommandAndInput, sendCommandExpect, sendCommandNoExpect, sendInput, sendInputExpect, socketGetOutput };
