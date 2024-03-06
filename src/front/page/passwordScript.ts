import inquirer from "inquirer";
import runningDB from "../../db/db";
import { Server, ServerInfo, User } from "../../db/dbtypes";
import clear from "clear";
import { delay } from "../../modules/util/util";
import { changePasswordOf, password_result } from "../../modules/password/change_passwords";
import { log } from "../../modules/console/debug";
import { generatePasses } from "../../modules/util/password-generator";
import fs from "fs";
import { removeANSIColorCodes } from "../../modules/util/util";
import { Home } from "../menu/home";
import logger from "../../modules/console/logger";
import { logToFile, pressEnter } from "../../modules/console/enddingModules";
import { Bar } from "../../modules/console/progress";

let swit = false;
const TEST_PASSWORD = () => {
    swit = !swit;
    if (swit) {
        return "Password123";
    } else return "Password123?";
};

async function runScriptOn(computers: Server[], seed: string, debug?: boolean) {
    const amountOfPasswords = computers.reduce((value, computer) => value + computer.users.length, 0);

    const passwordsArray = debug ? Array.from({ length: amountOfPasswords }, () => TEST_PASSWORD()) : generatePasses(amountOfPasswords, seed);
    const passwords = computers.map((computer) => {
        let target_passwords = [];
        for (let i = 0; i < computer.users.length; i++) {
            let password = passwordsArray.pop();
            if (!password) throw new Error("Not enough passwords");
            target_passwords.push(password);
        }
        return target_passwords;
    });

    log(
        debug
            ? `Running DEBUG script on ${computers.length} targets ${amountOfPasswords} users`
            : `Running script on ${computers.length} targets ${amountOfPasswords} ${amountOfPasswords} users`
    );
    logger.log(
        debug
            ? `Running DEBUG script on ${computers.length} targets ${amountOfPasswords} users`
            : `Running script on ${computers.length} targets ${amountOfPasswords} users`
    );
    let bar = new Bar(amountOfPasswords);
    var then = new Date();

    let success = 0;
    let fails = 0;
    const promises = computers.map(async (target, i) => {
        const target_passwords = passwords[i];
        let results: (string | boolean)[] = [];
        for await (const [index, user] of target.users.entries()) {
            let result: string | boolean = false;
            try {
                let password = target_passwords[index];
                if (!password) throw new Error("Unable to find password to change to");
                const passwordResult = await changePasswordOf(target, user, password);
                if (typeof passwordResult == "string" || passwordResult.error) {
                    throw new Error(typeof passwordResult == "string" ? passwordResult : passwordResult.error ? passwordResult.error : "");
                }
                let wrote = await runningDB.writeUserResult(user.user_id, passwordResult);

                bar.done(`${user.username} ${user.ipaddress} ${user.hostname}`);
                success++;
                if (!wrote) throw new Error("Unable to write user password");
                result = `Success ${user.username} ${user.ipaddress} ${user.hostname}`;
            } catch (error) {
                let passwordTried = target_passwords[index];
                if (passwordTried) await runningDB.writeUserFailedPassword(user.user_id, passwordTried);
                bar.done(`Errored: ${user.username} ${user.ipaddress} ${user.hostname}`);
                result = `Errored: ${user.username} ${user.ipaddress} ${user.hostname} ` + (error as Error).message;
                fails++;
            }
            results.push(result);
        }

        return results;
    });

    var results = await Promise.allSettled(promises);
    var now = new Date();

    var lapse_time = now.getTime() - then.getTime();
    logger.log(`Successfully changed passwords on ${success} of ${amountOfPasswords} in ${lapse_time} ms`, "info");

    console.log(`Successfully changed passwords on ${success} of ${amountOfPasswords} in ${lapse_time} ms`.green);
    bar.stop();

    return results;
}

async function runScript(debug?: boolean) {
    const originalConsoleLog = console.log;
    let capturedOutput = "";
    try {
        const computers = await runningDB.readComputers();

        const { seed } = debug
            ? { seed: "" }
            : await inquirer.prompt([
                  {
                      name: "seed",
                      type: "input",
                      message: "Please enter a seed",
                  },
              ]);

        //Hold Original Log for later
        console.log = function (...args) {
            const string = args.map((arg) => String(arg)).join(" ");
            capturedOutput += string + "\n";
            originalConsoleLog(string);
        };

        //Clear and print status
        await clear();

        let results = await runScriptOn(computers, seed, debug);

        // //Generate values
        // const amountOfPasswords = computers.reduce((value, computer) => value + computer.users.length, 0);

        // const passwordsArray = debug ? Array.from({ length: amountOfPasswords }, () => TEST_PASSWORD()) : generatePasses(amountOfPasswords, seed);

        // const passwords = computers.map((computer) => {
        //     let target_passwords = [];
        //     for (let i = 0; i < computer.users.length; i++) {
        //         let password = passwordsArray.pop();
        //         if (!password) throw new Error("Not enough passwords");
        //         target_passwords.push(password);
        //     }
        //     return target_passwords;
        // });

        // log(
        //     debug
        //         ? `Running DEBUG script on ${computers.length} computers ${amountOfPasswords} users`
        //         : `Running script on ${computers.length} computers ${amountOfPasswords} ${amountOfPasswords} users`
        // );
        // logger.log(
        //     debug
        //         ? `Running DEBUG script on ${computers.length} computers ${amountOfPasswords} users`
        //         : `Running script on ${computers.length} computers ${amountOfPasswords} users`
        // );

        // let bar = new Bar(amountOfPasswords);
        // var then = new Date();

        // let success = 0;
        // let fails = 0;
        // const promises = computers.map(async (target, i) => {
        //     const target_passwords = passwords[i];
        //     let results: (string | boolean)[] = [];
        //     for await (const [index, user] of target.users.entries()) {
        //         let result: string | boolean = false;
        //         try {
        //             let password = target_passwords[index];
        //             if (!password) throw new Error("Unable to find password to change to");
        //             const passwordResult = await changePasswordOf(target, user, password);
        //             if (typeof passwordResult == "string" || passwordResult.error) {
        //                 throw new Error(typeof passwordResult == "string" ? passwordResult : passwordResult.error ? passwordResult.error : "");
        //             }
        //             let wrote = await runningDB.writeUserResult(user.user_id, passwordResult);

        //             bar.done(`${user.username} ${user.ipaddress} ${user.hostname}`);
        //             success++;
        //             if (!wrote) throw new Error("Unable to write user password");
        //             result = `Success ${user.username} ${user.ipaddress} ${user.hostname}`;
        //         } catch (error) {
        //             let passwordTried = target_passwords[index];
        //             if (passwordTried) await runningDB.writeUserFailedPassword(user.user_id, passwordTried);
        //             bar.done(`Errored: ${user.username} ${user.ipaddress} ${user.hostname}`);
        //             result = `Errored: ${user.username} ${user.ipaddress} ${user.hostname} ` + (error as Error).message;
        //             fails++;
        //         }
        //         results.push(result);
        //     }

        //     return results;
        // });

        // var results = await Promise.allSettled(promises);
        // var now = new Date();

        // var lapse_time = now.getTime() - then.getTime();
        // logger.log(`Successfully changed passwords on ${success} of ${amountOfPasswords} in ${lapse_time} ms`, "info");

        // console.log(`Successfully changed passwords on ${success} of ${amountOfPasswords} in ${lapse_time} ms`.green);

        const runningLog = results.reduce((prev, value) => {
            if (!value) return prev;
            if (typeof value == "boolean") return prev + "UNKNOWN\n";
            // console.log(JSON.stringify(value))

            let results = (value as PromiseFulfilledResult<string[]>).value;
            let computerLine = "";
            for (let line of results) {
                computerLine += line + "\n";
            }

            return prev + computerLine;
        }, `Log for ${new Date().toISOString()} running on ${computers.length} computers\n\n`);

        await logToFile(removeANSIColorCodes(runningLog + "\n\nLOG:\n" + capturedOutput));
        await delay(1000);
    } catch (error) {
        console.log(`Error while updating passwords ${error}`);
        await delay(1000);
    } finally {
        console.log = originalConsoleLog;
    }
    //Set up reporting

    Home();
}

async function runSingleScript(ip: string, user_id: string) {
    try {
        const computer = await runningDB.getComputer(ip);
        if (!computer) {
            throw new Error("Computer doesn't Exist");
        }
        const user = await runningDB.getUserByID(user_id);
        if (!user) {
            throw new Error("Computer doesn't Exist");
        }
        console.log(`Password changing script for ${user.username} on ${computer.Name}`);
        const { password } = await inquirer.prompt([
            {
                name: "password",
                type: "password",
                message: "Please enter a new password",
                validate: function (value) {
                    if (value.length > 8) {
                        return true;
                    }
                    return "password must be longer then 8 characters";
                },
            },
        ]);

        let then = new Date();

        log(`Running script on ${computer.Name}`, "info");
        let passwordTried = password;
        const result = await changePasswordOf(computer, user, password);
        let now = new Date();
        var lapse_time = now.getTime() - then.getTime();
        if (typeof result == "string" || result.error) {
            log(`Error changing password Error: ${typeof result == "string" ? result : result.error ? result.error : ""}`, "error");
            logger.log(`${user.ipaddress} Error changing password in ${lapse_time} ms`, "error");
            if (passwordTried) await runningDB.writeUserFailedPassword(user.user_id, passwordTried);
            await delay(1000);
        } else {
            logger.log(`${computer.ipaddress} Successfully changed passwords`, "info");

            log(`${computer.ipaddress} Successfully changed passwords in ${lapse_time} ms`.green);
            await runningDB.writeUserResult(user.user_id, result);
        }

        await pressEnter();
    } catch (error) {
        console.log(`Error while updating passwords ${error}`);
        await delay(1000);
    }
}

async function runScriptNetworkSelect(debug?: boolean) {
    const originalConsoleLog = console.log;
    let capturedOutput = "";

    try {
        const computersALL = await runningDB.readComputers();
        let ips = Array.from(
            new Set(
                computersALL
                    .map((comp) => comp.ipaddress)
                    .map((ip) => {
                        let ip_digits = ip.split(".");
                        ip_digits.pop();
                        return ip_digits.join(".").trim();
                    })
            )
        );

        const { networks }: { networks: string[] } = await inquirer.prompt([
            {
                name: "networks",
                type: "checkbox",
                message: "Please Select the Networks You'd Like:",
                choices: [...ips],
            },
        ]);
        if (networks.length === 0) return Home();

        const computers = computersALL.filter((server) => {
            let ip_digits = server.ipaddress.split(".");
            ip_digits.pop();
            let network = ip_digits.join(".").trim();
            if (networks.includes(network)) return true;
            return false;
        });

        log(`Selected ${computers.length} targets on ${networks.join(" ")}`);

        const { seed } = await inquirer.prompt([
            {
                name: "seed",
                type: "input",
                message: "Please enter a seed",
            },
        ]);

        //Hold Original Log for later
        console.log = function (...args) {
            const string = args.map((arg) => String(arg)).join(" ");
            capturedOutput += string + "\n";
            originalConsoleLog(string);
        };

        let results = await runScriptOn(computers, seed, debug);
        const runningLog = results.reduce((prev, value) => {
            if (!value) return prev;
            if (typeof value == "boolean") return prev + "UNKNOWN\n";

            let results = (value as PromiseFulfilledResult<string[]>).value;
            let computerLine = "";
            for (let line of results) {
                computerLine += line + "\n";
            }

            return prev + computerLine;
        }, `Log for ${new Date().toISOString()} running on ${computers.length} computers\n\n`);

        await logToFile(removeANSIColorCodes(runningLog + "\n\nLOG:\n" + capturedOutput));
        await delay(1000);
    } catch (error) {
        console.log(`Error while updating passwords ${error}`);
        await delay(1000);
    } finally {
        console.log = originalConsoleLog;
    }

    Home();
}

export { runScript, runSingleScript, runScriptNetworkSelect };
