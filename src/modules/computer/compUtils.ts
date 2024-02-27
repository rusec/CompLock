import { options } from "../util/options";
import { commands } from "../util/commands";
import inquirer from "inquirer";
import fs from "fs";
import { getOutput } from "../util/run_command";
import { parseUsersLinux } from "./scan";
import asTable from "as-table";
import { SSH2CONN } from "../util/ssh_utils";
async function getUsers(conn: SSH2CONN, os_type: options) {
    let users = "";
    let users_array = [];
    switch (os_type.toLowerCase()) {
        case "freebsd":
            users = await getOutput(conn, commands.users.parsing.linux);
            users_array = parseUsersLinux(users);
            users = asTable(users_array);
            break;
        case "windows":
            users = await getOutput(conn, commands.users.windows);
            break;
        case "darwin":
            users = await getOutput(conn, commands.users.darwin);
            break;
        case "linux":
        case "sunos":
            users = await getOutput(conn, commands.users.parsing.linux);
            users_array = parseUsersLinux(users);
            users = asTable(users_array);
            break;
        default:
            users = "Unable to get Unknown OS";
            break;
    }
    console.log(users);
    const { logToFile } = await inquirer.prompt([
        {
            name: "logToFile",
            type: "confirm",
            message: "Would you like to log users to file?",
        },
    ]);
    if (logToFile) {
        users = `Users for ${conn.config[0].host}\n` + users;
        fs.writeFileSync("log.log", users, "utf8");
    }
}
async function getNetwork(conn: SSH2CONN, os_type: options) {
    let network = "";
    switch (os_type.toLowerCase()) {
        case "freebsd":
            network = await getOutput(conn, commands.network.linux.step_1);
            break;
        case "windows":
            network = await getOutput(conn, commands.network.windows);
            break;
        case "darwin":
            network = await getOutput(conn, commands.network.linux.step_1);
            break;
        case "linux":
        case "sunos":
            network = await getOutput(conn, commands.network.linux.step_1);
            if (network.includes("netstat")) {
                network = await getOutput(conn, commands.network.linux.step_2);
            }
            break;
        default:
            network = "Unable to get Unknown OS";
            break;
    }
    console.log(network);
    const { logToFile } = await inquirer.prompt([
        {
            name: "logToFile",
            type: "confirm",
            message: "Would you like to log Current Connections to file?",
        },
    ]);
    if (logToFile) {
        network = `Current Connections for ${conn.config[0].host}\n` + network;
        fs.writeFileSync("log.log", network, "utf8");
    }
}
async function getEVariables(conn: SSH2CONN, os_type: options) {
    let variables = "";
    switch (os_type.toLowerCase()) {
        case "freebsd":
            variables = await getOutput(conn, commands.variables.freebsd);
            break;
        case "windows":
            variables = await getOutput(conn, commands.variables.windows);
            break;
        case "darwin":
            variables = await getOutput(conn, commands.variables.linux);
            break;
        case "linux":
            variables = await getOutput(conn, commands.variables.linux);
            break;
        case "sunos":
            variables = await getOutput(conn, commands.variables.sunos);
            break;
        default:
            variables = "Unable to get Unknown OS";
            break;
    }
    console.log(variables);
    const { logToFile } = await inquirer.prompt([
        {
            name: "logToFile",
            type: "confirm",
            message: "Would you like to log Current variables to file?",
        },
    ]);
    if (logToFile) {
        variables = `Current variables for ${conn.config[0].host}\n` + variables;
        fs.writeFileSync("log.log", variables, "utf8");
    }
}
async function getProcess(conn: SSH2CONN, os_type: options) {
    let processes = "";
    switch (os_type.toLowerCase()) {
        case "freebsd":
            processes = await getOutput(conn, commands.processes.freebsd);
            break;
        case "windows":
            processes = await getOutput(conn, commands.processes.windows);
            break;
        case "darwin":
            processes = await getOutput(conn, commands.processes.linux);
            break;
        case "linux":
            processes = await getOutput(conn, commands.processes.linux);
            break;
        case "sunos":
            processes = await getOutput(conn, commands.processes.sunos);
            break;
        default:
            processes = "Unable to get Unknown OS";
            break;
    }
    console.log(processes);
    const { logToFile } = await inquirer.prompt([
        {
            name: "logToFile",
            type: "confirm",
            message: "Would you like to log Current processes to file?",
        },
    ]);
    if (logToFile) {
        processes = `Current processes for ${conn.config[0].host}\n` + processes;
        fs.writeFileSync("log.log", processes, "utf8");
    }
}
async function getFailedLogins(conn: SSH2CONN, os_type: options) {
    let failedLogins = "";
    switch (os_type.toLowerCase()) {
        case "freebsd":
            failedLogins = await getOutput(conn, commands.failedLogins.linux);
            break;
        case "windows":
            failedLogins = await getOutput(conn, commands.failedLogins.windows);
            break;
        case "darwin":
            failedLogins = await getOutput(conn, commands.failedLogins.darwin);
            break;
        case "linux":
            failedLogins = await getOutput(conn, commands.failedLogins.linux);
            break;
        case "sunos":
            failedLogins = await getOutput(conn, commands.failedLogins.sunos);
            break;
        default:
            failedLogins = "Unable to get Unknown OS";
            break;
    }
    console.log(failedLogins);
    const { logToFile } = await inquirer.prompt([
        {
            name: "logToFile",
            type: "confirm",
            message: "Would you like to log users to file?",
        },
    ]);
    if (logToFile) {
        failedLogins = `Current Failed Login Events for ${conn.config[0].host}\n` + failedLogins;
        fs.writeFileSync("log.log", failedLogins, "utf8");
    }
}
async function getCurrentLoggedIn(conn: SSH2CONN, os_type: options) {
    let currentLogOns = "";
    switch (os_type.toLowerCase()) {
        case "freebsd":
            currentLogOns = await getOutput(conn, commands.users.current.freebsd);
            break;
        case "windows":
            currentLogOns = await getOutput(conn, commands.users.current.windows);
            break;
        case "darwin":
            currentLogOns = await getOutput(conn, commands.users.current.linux);
            break;
        case "linux":
            currentLogOns = await getOutput(conn, commands.users.current.linux);
            break;
        case "sunos":
            currentLogOns = await getOutput(conn, commands.users.current.sunos);
            break;
        default:
            currentLogOns = "Unable to get Unknown OS";
            break;
    }
    console.log(currentLogOns);
    const { logToFile } = await inquirer.prompt([
        {
            name: "logToFile",
            type: "confirm",
            message: "Would you like to log users to file?",
        },
    ]);
    if (logToFile) {
        currentLogOns = `Current Logins for ${conn.config[0].host}\n` + currentLogOns;
        fs.writeFileSync("log.log", currentLogOns, "utf8");
    }
}

export { getUsers, getNetwork, getFailedLogins, getProcess, getEVariables, getCurrentLoggedIn };
