import "colors";

import color from "colors";

const bold = color.bold;

export type options = "log" | "debug" | "warn" | "error" | "info" | "success" | undefined;
/**
 * Logs a message with an optional message type and override flag to the console.
 *
 * @param {string} message - The message to be logged.
 * @param {string} [type="debug"] - The type of message (e.g., "log", "debug", "warn", "error", "info", "success").
 * @param {boolean} [override=false] - If true, the message type is overridden by the provided type.
 * @returns {void} This function does not return a value.
 */
var log = (message: string, type: options = "debug", override: boolean = false): void => {
    let t;
    switch (type.toLowerCase()) {
        default:
        case "log":
            t = "[LOG] ".blue;
            break;
        case "debug":
            t = "[DEBUG] ".green;
            break;
        case "warn":
            t = "[WARNING] ".yellow;
            break;
        case "error":
            t = "[ERROR] ".red;
            break;
        case "info":
            t = "[MESSAGE] ".magenta;
            break;
        case "success":
            t = bold("[SUCCESS]".green);
            break;
    }

    console.log(t, message);
};
var error = (message: any) => {
    console.log("[ERROR] ".red, message);
};
var success = (message: any) => {
    console.log(bold("[SUCCESS]".green), message);
};
var info = (message: any) => {
    console.log("[MESSAGE] ".magenta, message);
};

export { log, error, success, info };
