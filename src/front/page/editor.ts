import inquirer from "inquirer";
import runningDB from "../../db/db";
import { Server, ServerInfo, User } from "../../db/dbtypes";
import clear from "clear";
import { delay } from "../../modules/util/util";
import { checkPassword } from "../../modules/util/checkPassword";
import { runSingleScript } from "./passwordScript";
import { Home } from "../menu/home";
import {
    addCustomSSH,
    addSSH,
    detect_hostname,
    findAnyConnection,
    getConnectedIps,
    getStatus,
    makeConnection,
    makeInteractiveShell,
    removeSSH,
    testPassword,
} from "../../modules/util/ssh_utils";
import { log } from "../../modules/console/debug";
import logger from "../../modules/console/logger";
import { getCurrentLoggedIn, getEVariables, getFailedLogins, getNetwork, getProcess, getUsers } from "../../modules/computer/compUtils";
import { pressEnter, skip } from "../../modules/console/enddingModules";
import { scanComputer } from "../../modules/computer/scan";
async function edit(id = -1): Promise<void> {
    await clear();
    let servers = await runningDB.readComputers();
    let connections = getConnectedIps();

    var ipAddressesChoices = servers.map((v, k) => {
        return {
            name: `Conn: ${connections.includes(v.ipaddress) ? "T" : "F"} ${v.ipaddress} ${v.Name} Users: ${v.users.length}`,
            value: k,
        };
    });

    if (ipAddressesChoices.length === 0) {
        return Home();
    }

    let selected_id = id;

    if (selected_id == -1 || selected_id >= ipAddressesChoices.length) {
        const { json_id } = await inquirer.prompt([
            {
                name: "json_id",
                type: "list",
                pageSize: 50,
                choices: [...ipAddressesChoices, { name: "Home", value: "home" }],
                message: "Please select a computer:",
            },
        ]);
        if (json_id === "home") {
            return Home();
        }
        selected_id = json_id;
    }

    await clear();
    log("Checking Connection");


    const computer = await runningDB.getComputer(servers[selected_id].ipaddress);
    if (!computer) return edit();

    let statusPromise = getStatus(computer)
    let skipPromise = skip();
    let result = await Promise.race([statusPromise,skipPromise]);

    const header = `> ${computer.Name} ${computer.ipaddress} ${computer["OS Type"]} ${computer.domain}| Users: ${
        computer.users.length
    } | password changes: ${computer.password_changes} | Online: ${(result) ? "Live" : "unable to connect"}`.bgBlue;

    await clear();

    console.log(header);

    const { section } = await inquirer.prompt([
        {
            name: "section",
            type: "list",
            pageSize: 50,
            choices: [
                new inquirer.Separator("Connect"),
                { name: "Utils", value: "utils" },
                { name: "Change Passwords", value: "change_passwords" },
                { name: "Start Shell", value: "shell" },
                new inquirer.Separator("Users Management"),
                { name: "Users", value: "users" },
                { name: "Choice Admin", value: "user_admin" },
                { name: "Add User", value: "users_add" },
                { name: "Remove User", value: "users_remove" },
                new inquirer.Separator("Data"),
                { name: "Change Domain", value: "change_domain" },
                { name: "Change Hostname", value: "change_hostname" },
                { name: "Change OS", value: "change_os" },
                { name: "Remove Computer", value: "remove" },
                new inquirer.Separator(),
                new inquirer.Separator("Navigation"),
                "Back",
                new inquirer.Separator(),
            ],
            message: "Please select one of the following options:",
        },
        
    ]);

    async function editUsers(user_id: number = -1): Promise<void> {
        await clear();
        if (!computer) return;
        console.log(header);
        const user_choices = computer.users.map((user, k) => {
            return {
                name: `${user.username} | computer: ${user.hostname} | domain: ${user.domain} | password changes:${user.password_changes} | SshKey: ${
                    user.ssh_key
                } | ${k === 0 ? "Admin" : ""}`,
                value: k,
            };
        });
        let printHeader = false;
        if (user_id == -1) {
            const { user_index } = await inquirer.prompt([
                {
                    name: "user_index",
                    type: "list",
                    pageSize: 50,
                    choices: [...user_choices, { name: "Back", value: "Back" }],
                    message: "Please select a user",
                },
            ]);

            if (user_index == "Back") return;
            user_id = user_index;
        } else {
            printHeader = true;
        }
        const user = await runningDB.getUserByID(computer.users[user_id].user_id);
        if (!user) {
            log("unable to find user", "error");
            await delay(1000);
            return editUsers();
        }
        printHeader &&
            console.log(
                `>> ${user.username} | computer: ${user.hostname} | domain: ${user.domain} | password changes:${user.password_changes} | SshKey: ${user.ssh_key}`
                    .cyan
            );

        const { menu } = await inquirer.prompt([
            {
                name: "menu",
                type: "list",
                pageSize: 50,
                choices: [
                    new inquirer.Separator("Connect"),
                    { name: "Start Shell", value: "shell" },
                    { name: "Change Password", value: "change_pass" },
                    { name: "Test Password", value: "test_pass" },
                    { name: "Show Passwords", value: "show_pass" },
                    new inquirer.Separator("Edit"),
                    { name: "Change User Name", value: "username_edit" },
                    { name: "Change Password", value: "password_edit" },
                    { name: "Change Domain", value: "domain_edit" },
                    { name: "Remove User", value: "remove_user" },
                    new inquirer.Separator("SSH"),
                    "Inject SSH",
                    "Remove SSH",
                    "Inject Custom SSH",
                    new inquirer.Separator(),
                    new inquirer.Separator("Navigation"),
                    "Back",
                    new inquirer.Separator(),
                ],
                message: "Please select one of the following options:",
            },
        ]);
        if (menu == "Back") return editUsers();

        switch (menu) {
            case "shell":
                await makeInteractiveShell(user);
                break;
            case "change_pass":
                await runSingleScript(computer.ipaddress, user.user_id);
                break;
            case "test_pass":
                await passwordTest();
                break;
            case "show_pass":
                await showPasswords();
                break;
            case "username_edit":
                await changeUsername();
                break;
            case "password_edit":
                await changePassword();
                break;
            case "domain_edit":
                await changeDomain();
                break;
            case "remove_user":
                await removeUser();
                break;
            case "Inject SSH":
                let r = await addSSH(user, computer["OS Type"]);
                if (r) {
                    await runningDB.writeUserSSH(user.user_id, r);
                }
                break;

            case "Inject Custom SSH":
                await sshCustom();
                break;
            case "Remove SSH":
                let result = await removeSSH(user, computer["OS Type"]);
                if (result) {
                    await runningDB.writeUserSSH(user.user_id, !result);
                }
                break;
            default:
                log("Unknown selection", "error");
                await delay(1000);
                break;
        }

        return editUsers(user_id);

        async function showPasswords() {
            if (!user) return;
            console.log(`Current: ${user.password}`.green);
            console.log(`Failed Passwords: ${user.failedPasswords.map((v, index) => index === 0 ? ("Latest Failed: " + v).red: (v)).join(" | ").red}`);
            console.log(`Old Passwords: ${user.oldPasswords.map((v, index) => index === 0 ? ("Latest Old: " + v).yellow : (v)).join(" | ").yellow}`);
            await pressEnter();     
        }
        async function changeUsername() {
            if (!user) return;
            let { newUsername, confirm } = await inquirer.prompt([
                {
                    name: "newUsername",
                    type: "input",
                },
                {
                    name: "confirm",
                    type: "confirm",
                },
            ]);
            if (!confirm) {
                return;
            }
            await runningDB.editUser(user.user_id, newUsername, undefined);

            console.log("username updated!");
            await delay(300);
        }
        async function changeDomain() {
            if (!user) return;

            let { newDomain, confirm } = await inquirer.prompt([
                {
                    name: "newDomain",
                    type: "input",
                    message: `please enter a domain (${user.domain})`,
                },
                {
                    name: "confirm",
                    type: "confirm",
                },
            ]);
            if (!confirm) {
                return;
            }

            // json[selected_id].domain = newDomain;
            // await runningDB.writeComputers(json);
            await runningDB.editUser(user.user_id, undefined, newDomain);

            console.log("domain updated!");
            await delay(300);
        }
        async function changePassword() {
            if (!user) return;

            let { newPassword, confirm } = await inquirer.prompt([
                {
                    name: "newPassword",
                    message: "new password if manually changed",
                    type: "input",
                },
                {
                    name: "confirm",
                    type: "confirm",
                },
            ]);
            if (!confirm) {
                return;
            }

            await runningDB.writeUserPassword(user.user_id, newPassword);

            console.log("password updated!");
            await delay(300);
        }
        async function removeUser() {
            if (!user) return;
            let { confirm } = await inquirer.prompt([
                {
                    name: "confirm",
                    type: "confirm",
                    message: `Would you like to remove ${user.username}`,
                },
            ]);
            if (!confirm) {
                return;
            }

            await runningDB.removeUser(user.ipaddress, user.user_id);

            console.log("user removed!");
            await delay(300);
        }
        async function passwordTest() {
            if (!user) return;
            // await clear();
            // // const header = `> ${server.Name} ${server["IP Address"]} ${server.Username} ${blankPassword(server.Password)} ${server["OS Type"]} | pub_key: ${
            // //     server.ssh_key ? "true" : "false"
            // // } password changes: ${server.password_changes}`.bgBlue;
            // // console.log(header);
            let conn = await makeConnection(user);
            if (!conn) {
                console.log("Unable to connect to server");
                await delay(1000);
                return;
            }
            let pass_success = await testPassword(conn, user.password);
            pass_success ? log("Password Active", "success") : log("Unable to use Password", "error");

            await pressEnter();
        }
        async function sshCustom() {
            if (!computer) return;

            if (!user) return;
            const { ssh_key } = await inquirer.prompt([
                {
                    name: "ssh_key",
                    message: "please enter an ssh key",
                    validate: function isValidSSHPublicKey(publicKey) {
                        const sshPublicKeyRegex = /^(ssh-rsa|ssh-dss|ecdsa-[a-zA-Z0-9]+)\s+[A-Za-z0-9+/]+[=]{0,3}(\s+.+)?$/;

                        return sshPublicKeyRegex.test(publicKey.trim()) ? true : "Invalid SSH KEY";
                    },
                    filter: (input) => {
                        return input.trim();
                    },
                },
            ]);
            let res = await addCustomSSH(user, ssh_key, computer["OS Type"]);
            if (res) {
                log(`INJECTED SSH KEY SUCCESS on ${user.ipaddress} ${user.username}`, "success");
                logger.log(`injected ssh key to ${user.ipaddress} ${user.username}`);
            } else {
                log(`Unable to inject SSH KEY SUCCESS on ${user.ipaddress} ${user.username}`, "error");
                logger.log(`Unable to inject ssh key to ${user.ipaddress} ${user.username}`);
            }
            await delay(1000);
        }
    }

    async function removeUsers() {
        if (!computer) return;

        const user_choices = computer.users.map((user, k) => {
            return {
                name: `${user.username} | computer: ${user.hostname} | domain: ${user.domain} | password changes:${user.password_changes} | SshKey: ${
                    user.ssh_key
                } | ${k === 0 ? "Admin" : ""}`,
                value: k,
            };
        });

        const { user_index, confirm } = await inquirer.prompt([
            {
                name: "user_index",
                type: "list",
                pageSize: 50,
                choices: [...user_choices, { name: "Back", value: "Back" }],
                message: "Please select a user",
            },
            {
                name: `confirm`,
                message: `confirm`,
                type: "confirm",
            },
        ]);
        if (!confirm) return;
        if (user_index == "Back") return;
        const user = await runningDB.getUserByID(computer.users[user_index].user_id);

        if (!user) {
            log("unable to find user", "error");
            await delay(1000);
            return;
        }

        await runningDB.removeUser(computer.ipaddress, user.user_id);
        log("Removed User", "success");
        await delay(500);
        return;
    }
    async function choiceAdmin() {
        if (!computer) return;

        const user_choices = computer.users.map((user, k) => {
            return {
                name: `${user.username} | computer: ${user.hostname} | domain: ${user.domain} | password changes:${user.password_changes} | SshKey: ${user.ssh_key}`,
                value: k,
            };
        });

        const { user_index, confirm } = await inquirer.prompt([
            {
                name: "user_index",
                type: "list",
                pageSize: 50,
                choices: [...user_choices, { name: "Back", value: "Back" }],
                message: "Please select a user",
            },
            {
                name: `confirm`,
                message: `confirm`,
                type: "confirm",
            },
        ]);
        if (!confirm) return;
        if (user_index == "Back") return;
        console.log(user_index);
        let result = await runningDB.setAdmin(computer.ipaddress, user_index);

        result && log(`Set User ${computer.users[user_index].username} to Admin`, "success");
        await delay(500);
    }

    async function addUser() {
        if (!computer) return;

        const { username, password, domain } = await inquirer.prompt([
            {
                name: "username",
                type: "input",
                message: "Please enter a username",
            },
            {
                name: "password",
                type: "password",
                message: "Please enter a password",
            },
            {
                name: "domain",
                type: "input",
                message: "Please enter a domain",
            },
        ]);

        await runningDB.addUser(computer.ipaddress, username, password, computer.Name, domain);
        log("Added User", "success");
        await delay(500);
        return;
    }

    switch (section) {
        case "Back":
            return edit();
        case "shell":
            await checkPassword();
            await makeInteractiveShell(computer.users[0]);
            break;
        case "change_passwords":
            await checkPassword();
            await changePasswordAllUsers();
            break;
        case "users":
            await checkPassword();
            await editUsers();
            break;
        case "user_admin":
            await checkPassword();
            await choiceAdmin();
            break;
        case "users_add":
            await checkPassword();
            await addUser();
            break;
        case "users_remove":
            await checkPassword();
            await removeUsers();
            break;
        case "change_domain":
            await checkPassword();
            await changeDomain();
            break;
        case "change_hostname":
            await checkPassword();
            await changeHostname();
            break;
        case "change_os":
            await changeOS();
            break;
        case "remove":
            await checkPassword();
            await Remove();
            return edit();
        case "utils":
            await computerUtils(computer);
            break;
        case "Home":
            return Home();
    }
    return edit(selected_id);

    async function changeHostname() {
        if (!computer) return false;
        let conn = await findAnyConnection(computer.users);
        if (!conn) {
            console.log("Unable to connect to server");
            await delay(1000);
            return;
        }
        let hostname = await detect_hostname(conn);
        const { inputForHostname } = await inquirer.prompt([
            {
                name: "inputForHostname",
                type: "input",
                pageSize: 50,
                message: `Please enter a hostname, enter for (${hostname}) `,
            },
        ]);
        if (inputForHostname != "") {
            hostname = inputForHostname;
        }

        log("Updated Hostname", (await runningDB.updateComputerHostname(computer.ipaddress, hostname)) ? "success" : "error");
        await delay(500);
    }

    async function changePasswordAllUsers() {
        if (!computer) return;
        for (let user of computer.users) {
            await clear();
            await runSingleScript(computer.ipaddress, user.user_id);
        }
    }

    async function Remove() {
        if (!computer) return;
        console.log(header);

        let { confirm } = await inquirer.prompt([
            {
                name: `confirm`,
                message: `confirm removing ${computer.Name} ${computer.ipaddress}`,
                type: "confirm",
            },
        ]);
        if (!confirm) {
            return;
        }
        //CHANGE ALL TO THIS FORMAT
        log("Removed computer!", (await runningDB.removeComputer(computer.ipaddress)) ? "success" : "error");
        await delay(300);
    }

    async function changeDomain() {
        if (!computer) return;

        let { newDomain, confirm } = await inquirer.prompt([
            {
                name: "newDomain",
                type: "input",
                message: `please enter a domain (${computer.domain})`,
            },
            {
                name: "confirm",
                type: "confirm",
            },
        ]);
        if (!confirm) {
            return;
        }

        await runningDB.editComputer(computer.ipaddress, newDomain);

        console.log("domain updated!");
        await delay(300);
    }

    async function changeOS() {
        if (!computer) return;

        let { newOSType, confirm } = await inquirer.prompt([
            {
                name: "newOSType",
                type: "list",
                choices: [
                    { name: "General Linux (ubuntu like) uses ch", value: "linux" },
                    { name: "Windows or Windows Server", value: "windows" },
                    { name: "FreeBSD or OpenBSD", value: "freebsd" },
                    { name: "Solaris or SunOs", value: "sunos" },
                    { name: "darwin or macos", value: "darwin" },
                ],
            },
            {
                name: "confirm",
                type: "confirm",
            },
        ]);
        if (!confirm) {
            return;
        }
        await runningDB.editComputer(computer.ipaddress, undefined, newOSType);

        console.log("OS updated!");
        await delay(300);
    }
}

async function computerUtils(server: Server) {
    await clear();
    // const header = `> ${server.Name} ${server.ipaddress} ${server["OS Type"]} | pub_key: ${
    //     server.ssh_key ? "true" : "false"
    // } password changes: ${server.password_changes}`.bgBlue;
    // console.log(header);
    const { program } = await inquirer.prompt([
        {
            name: "program",
            type: "list",
            pageSize: 50,
            message: "Please select a command to run",
            choices: [
                { name: "Get Computers Users", value: "users" },
                { name: "Get Current Logged in Users", value: "curr_users" },
                { name: "Get Failed Logins Event", value: "failedLogins" },
                { name: "Get Current Network Connections", value: "network" },
                { name: "Get Current Process", value: "processes" },
                { name: "Get Current Environment Variables", value: "variables" },

                { name: "Scan Computer", value: "scan" },

                "Back",
            ],
        },
    ]);
    if (program == "Back") {
        return;
    }
    let conn = await findAnyConnection(server.users);
    if (!conn) {
        console.log("Unable to connect to server");
        await delay(1000);
        return;
    }
    switch (program) {
        case "scan":
            await scanComputer(conn, server["OS Type"]);
            break;
        case "curr_users":
            await getCurrentLoggedIn(conn, server["OS Type"]);
            break;
        case "users":
            await getUsers(conn, server["OS Type"]);
            break;
        case "failedLogins":
            await getFailedLogins(conn, server["OS Type"]);
            break;
        case "network":
            await getNetwork(conn, server["OS Type"]);
            break;
        case "processes":
            await getProcess(conn, server["OS Type"]);
            break;
        case "variables":
            await getEVariables(conn, server["OS Type"]);
            break;
        default:
            break;
    }
    await conn.close();
}

function blankPassword(password: string) {
    return password && password[0] + "*****" + password[password.length - 1];
}



export { edit };
