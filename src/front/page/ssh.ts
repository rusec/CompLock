import inquirer from "inquirer";
import clear from "clear";
import { isValidIPAddress } from "../../modules/util/util";
import { scanSSH } from "../../modules/util/ssh_utils";
import { log } from "../../modules/console/debug";
import fs from "fs/promises";
import util from "util";
import logger from "../../modules/console/logger";
import { Bar } from "../../modules/console/progress";
import runningDB from "../../db/db";

const exec = util.promisify(require("node:child_process").exec);

async function ShotGun() {
    const { ip_net, hosts_ids, usernames_string, passwords_string } = await inquirer.prompt([
        {
            name: "ip_net",
            value: "input",
            validate: (v: string) => {
                return isValidIPAddress(v);
            },
            message: "ip range last digit gets cut off ex: 192.168.1.0",
        },
        {
            name: "hosts_ids",
            value: "input",
            /**
             *
             * @param {string} v
             */
            validate: (v: string) => {
                var strings = v.split(" ");
                for (let i = 0; i < strings.length; i++) {
                    if (isNaN(parseInt(strings[i].trim()))) {
                        return "invalid number";
                    }
                }

                return true;
            },
            message: "host ids (the last digit of the ip)",
        },
        {
            name: "usernames_string",
            value: "input",
            message: "usernames (separated by spaces) type default for root admin Administrator",
        },
        {
            name: "passwords_string",
            value: "input",
            message: "passwords (separated by spaces)",
        },
    ]);

    //construct computers ips

    let network_ip = ip_net.split(".");
    network_ip.pop();
    network_ip = network_ip.join(".").trim();
    let hosts = hosts_ids.split(" ");
    var computers = hosts.map((value: string) => {
        value = value.trim();
        return network_ip + "." + value;
    });

    //get usernames and passwords array
    var usernames =
        usernames_string.trim() === "default" ? ["root", "Administrator", "admin"] : usernames_string.split(" ").map((v: string) => v.trim());
    var passwords = passwords_string.split(" ").map((v: string) => v.trim());

    var users_sessions = usernames.map((user: string) => {
        return passwords.map((pass: string) => {
            return {
                user: user,
                pass: pass,
            };
        });
    });

    // create username and password combos
    let sessions: any[] = [];
    for (const users of users_sessions)
        for (let session of users) {
            sessions.push(session);
        }
    logger.log(`Attempt to Shotgun ${computers.length} Computers , ${users_sessions.length} User Sessions`, "info");

    let bar = new Bar(computers.length);

    var promises = computers.map(async (computer: string) => {
        var passed = false;
        log(`Attempting to login ${computer} using ${sessions.length} sessions`, "info");

        for (const session of sessions) {
            log(`Attempting to login ${computer} using ${session.user}`, "info");

            var computer_info = await scanSSH(computer, session.user, session.pass);
            if (typeof computer_info == "object") {
                log(`Found valid session for ${computer} saving...`, "success");

                // await runningDB.addComputer(computer_info.hostname, computer, session.user, session.pass, computer_info.operatingSystem, computer_info.domain);
                passed = await runningDB.addTargetAndUser(
                    computer_info.hostname,
                    computer,
                    session.user,
                    session.pass,
                    computer_info.operatingSystem,
                    computer_info.domain
                );
            }
        }

        bar.done(computer);
        if (!passed) {
            log(`Unable to login, invalid user pass combo ${computer}`, "error");
            throw new Error(`Unable to login, invalid user pass combo ${computer}`);
        } else logger.log(`Successfully found User Session for ${computer}`, "success");

        return passed;
    });

    let results = await Promise.allSettled(promises);

    log("Finished Scanning for Sessions", "log");
    const numberOfSuccess = results
        .filter(({ status }) => status === "fulfilled")
        .map((p) => typeof (p as PromiseFulfilledResult<any>).value == "boolean" && (p as PromiseFulfilledResult<any>).value).length;

    log(`Successfully Connected to ${numberOfSuccess} of ${computers.length} Computers`, "info");

    const fails = results.filter(({ status }) => status === "rejected").map((p) => (p as PromiseRejectedResult).reason.message);
    fails.forEach((value) => log(value, "error"));

    const { logHost } = await inquirer.prompt([
        {
            name: "logHost",
            type: "confirm",
            message: "Would you like to append you computers host file.(requires admin)",
        },
    ]);
    if (logHost) {
        try {
            var string = "\n";
            for (const computer of computers) {
                string += `${computer.ip}     ${computer.name}\n`;
            }
            if (process.platform === "linux" || process.platform === "darwin" || process.platform === "freebsd" || process.platform === "openbsd") {
                await exec(`echo '${string}' | sudo tee -a /etc/hosts`);
            }
            if (process.platform === "win32") {
                // add windows host input
                await exec(
                    `Powershell.exe -Command "& {Start-Process Powershell.exe 'echo ${string} >> C:/Windows/System32/drivers/etc/hosts' -Verb RunAs}`
                );
            }
        } catch (error) {}
    }
    bar.stop();
    console.clear();
}

export { ShotGun as sshMenu };
