import SSH2Promise from "@fabio286/ssh2-promise";
import runningDB from "../../db/db";
import { Server, ServerInfo, User } from "../../db/dbtypes";
import { getOutput, runCommand, runCommandNoExpect } from "./run_command";
import SSHConfig from "@fabio286/ssh2-promise/lib/sshConfig";
import { options } from "./options";
import { log } from "../console/debug";
import { commands } from "./commands";
import { delay } from "./util";
import logger from "../console/logger";
import { exec } from "child_process";
import temp from "temp";
import fs from "fs";
import os from "os";
import { isValidSession } from "./checkPassword";
import LoggerTo from "../console/loggerToFile";
import { Algorithms } from "ssh2";
// SSH COMMANDS for ejections
temp.track();
let connectionLog = new LoggerTo("connections");

async function findAnyConnection(Users: User[], timeout = 3000) {
    let privateKey = await runningDB.getPrivateSSHKey();

    for (let user of Users) {
        try {
            const sshConfig: SSHConfig = {
                host: user.ipaddress,
                username: user.username,
                password: user.password,
                privateKey: privateKey,
                authHandler: ["publickey", "password"],
                readyTimeout: timeout,
                reconnectTries: 3,
                algorithms: acceptedAlgos,

                reconnectDelay: 1000,
            };
            const ssh = new SSH2CONN(user.hostname, sshConfig);
            await ssh.connect();
            ssh.on("ssh", async (e) => {
                connectionLog.log(`[${ssh.config[0].host}] [${user.hostname}] Event: ${e}`);
            });
            ssh.on("close", async () => {
                connectionLog.log(`[${ssh.config[0].host}] [${user.hostname}] Event: Closed Connections`);
            });

            ssh.on(SSH2CONN.errorMonitor, (err) => {
                recentlyConnection.delete(user.ipaddress);

                connectionLog.log(`[${ssh.config[0].host}] [${user.hostname}] Event: ERROR ${err}`);
            });
            recentlyConnection.set(user.ipaddress, true);

            return ssh;
        } catch (error) {}
    }
    return false;
}

let recentlyConnection: Map<string, boolean> = new Map();
function getConnectedIps() {
    return Array.from(recentlyConnection.keys());
}
async function makeConnection(user: User, timeout = 3000, retryCount = 5, retryDelay = 1000) {
    let privateKey = await runningDB.getPrivateSSHKey();

    try {
        const sshConfig: SSHConfig = {
            host: user.ipaddress,
            username: user.username,
            password: user.password,
            privateKey: privateKey,
            authHandler: ["publickey", "password"],
            readyTimeout: timeout,
            algorithms: acceptedAlgos,
            reconnectTries: retryCount,
            reconnectDelay: retryDelay,
        };
        const ssh = new SSH2CONN(user.hostname, sshConfig);
        await ssh.connect();
        ssh.on("ssh", async (e) => {
            connectionLog.log(`[${ssh.config[0].host}] [${user.hostname}] Event: ${e}`);
        });
        ssh.on("close", async () => {
            connectionLog.log(`[${ssh.config[0].host}] [${user.hostname}] Event: Closed Connections`);
        });

        ssh.on(SSH2CONN.errorMonitor, (err) => {
            recentlyConnection.delete(user.ipaddress);
            connectionLog.log(`[${ssh.config[0].host}] [${user.hostname}] Event: ERROR ${err}`);
        });
        recentlyConnection.set(user.ipaddress, true);
        return ssh;
    } catch (error) {
        console.log(error);
        return false;
    }
}

// Note remove permanent connection
//NOTE : MAKE PUBLIC KEY OUTPUT

async function removeSSHkey(conn: SSH2CONN, os_type: options): Promise<boolean> {
    const ssh_key = await runningDB.getPublicSSHKey();
    conn.log("Removing SSH Key");

    switch (os_type) {
        case "sunos":
            var output = await runCommandNoExpect(conn, commands.ssh.remove.sunos(ssh_key));
            if (!output) {
                return false;
            }
            // var authorizedKeyFile = await getOutput(conn, commands.ssh.echo.sunos);
            // var pwd = await getOutput(conn, 'cd $HOME/.ssh && pwd');

            // const connSFTP = await conn.sftp();
            // console.log(authorizedKeyFile)
            // console.log(pwd)

            // let removedAuthorizedKeyFile = authorizedKeyFile.replace(ssh_key, "");

            // await connSFTP.writeFile(pwd + "/authorized_keys", removedAuthorizedKeyFile,  {})
            // var authorizedKeyFileCheck = await getOutput(conn, commands.ssh.echo.sunos);

            // console.log(authorizedKeyFileCheck)
            // if (authorizedKeyFileCheck.includes(ssh_key)) {
            //     return false;
            // }
            break;
        case "linux":
            var output = await runCommandNoExpect(conn, commands.ssh.remove.linux(ssh_key));
            if (!output) {
                return false;
            }
            break;
        case "freebsd":
            var output = await runCommandNoExpect(conn, commands.ssh.remove.freebsd(ssh_key));
            if (typeof output === "string" && output.includes("setenv")) {
                output = await runCommandNoExpect(conn, commands.ssh.remove.linux(ssh_key));
                if (!output) {
                    return false;
                }
            }
            break;
        case "windows":
            var output = await runCommand(conn, commands.ssh.remove.windows(ssh_key), "successfully processed");
            if (output.toString().includes("Timed")) {
                conn.warn(
                    "Using CMD to remove make sure %ProgramData%\\ssh\\administrators_authorized_keys Exists, We are unable to detect completion"
                );
                output = await runCommandNoExpect(conn, commands.ssh.remove.windows_cmd(ssh_key));
            }

            if (!output) {
                return false;
            }
            break;
    }
    conn.log("Removed SSH Key");
    return !(await testSSH(conn));
}
/**
 *
 * @param conn
 * @returns Should return true if it can connect using the public key
 */
async function testSSH(conn: SSH2CONN) {
    try {
        conn.info("Testing SSH Private Key");
        const sshConfig: SSHConfig = {
            host: conn.config[0].host,
            username: conn.config[0].username,
            privateKey: await runningDB.getPrivateSSHKey(),
            authHandler: ["publickey"],
            reconnect: false,
            algorithms: acceptedAlgos,
            keepaliveInterval: 0,
            uniqueId: "SshKEY_TEST" + conn.config[0].host + conn.config[0].username,
            readyTimeout: 7000,
            reconnectTries: 3,
            reconnectDelay: 1000,
        };
        const ssh = new SSH2CONN(conn.config[0].host ? conn.config[0].host : "", sshConfig, true);
        ssh.on("ssh", async (e) => {
            connectionLog.log(`[${ssh.config[0].host}] [] Event: ${e}`);
        });
        await ssh.connect();
        await ssh.close();
        conn.info("Testing SSH Private Key active");
        return true;
    } catch (error) {
        conn.error("Unable to use SSH Private Key");
        return false;
    }
}
async function testPassword(conn: SSH2CONN, password: string) {
    try {
        conn.info("Testing Password");

        const sshConfig: SSHConfig = {
            host: conn.config[0].host,
            username: conn.config[0].username,
            password: password,
            authHandler: ["password"],
            reconnect: false,
            readyTimeout: 7000,
            algorithms: acceptedAlgos,
            reconnectTries: 3,
            reconnectDelay: 1000,
            uniqueId: "PasswordTest" + conn.config[0].host + conn.config[0].username,
        };
        const ssh = new SSH2Promise(sshConfig, true);
        await ssh.connect();
        await ssh.close();
        conn.info("Login Password active");
        return true;
    } catch (error) {
        if (error && typeof error == "object" && error.toString().includes("All configured authentication methods failed")) {
            return false;
        }
        conn.info("Unable to use Password");
        return false;
    }
}
//eject ssh function
//should check for ssh key in the folder, if it doesn't exist inject it.
//will try to ssh using the key, if it cant it will eject one more time
//TO DO DARWIN
async function injectSSHkey(conn: SSH2CONN, os_type: options, force?: undefined | boolean, trials: number = 0): Promise<boolean> {
    if (trials > 1) {
        return false;
    }
    const ssh_key = await runningDB.getPublicSSHKey();
    if (force) {
        await injectKey();
        return await test();
    }
    switch (os_type) {
        case "linux":
            var ssh_keys = await getOutput(conn, commands.ssh.echo.linux);
            if (ssh_keys.includes(ssh_key)) {
                return await test();
            }
            break;
        case "sunos":
            var ssh_keys = await getOutput(conn, commands.ssh.echo.sunos);
            if (ssh_keys.includes(ssh_key)) {
                return await test();
            }
            break;
        case "freebsd":
            var ssh_keys = await getOutput(conn, commands.ssh.echo.linux);
            if (ssh_keys.includes(ssh_key)) {
                return await test();
            }
            break;
        case "darwin":
            break;
        case "windows":
            var ssh_keys = await getOutput(conn, commands.ssh.echo.windows);
            if (ssh_keys.includes("Timed")) {
                conn.warn(
                    "Using CMD to inject make sure %ProgramData%\\ssh\\administrators_authorized_keys Exists, We are unable to detect completion"
                );
                return await injectSSHKeyWindowsCMD(conn, "windows");
            }
            if (ssh_keys.includes(ssh_key)) {
                return await test();
            }
            break;
    }
    conn.log("Ejecting SSH Key");
    await injectKey();
    return await test();

    // Tries to connect to the ssh with the private key
    async function test() {
        try {
            let result = await testSSH(conn);
            if (result) return true;
            else {
                trials = trials + 1;
                return await injectSSHkey(conn, os_type, true, trials);
            }
        } catch (error) {
            trials = trials + 1;
            return await injectSSHkey(conn, os_type, true, trials);
        }
    }
    async function injectKey() {
        switch (os_type) {
            case "windows":
                await runCommandNoExpect(conn, commands.ssh.eject.windows(ssh_key));
                break;
            case "sunos":
                await runCommandNoExpect(conn, commands.ssh.eject.sunos(ssh_key));
                break;
            case "linux":
            case "freebsd":
            case "darwin":
                await runCommandNoExpect(conn, commands.ssh.eject.linux(ssh_key));
                break;
        }
    }
}

async function injectSSHKeyWindowsCMD(conn: SSH2CONN, os_type: options, force?: undefined | boolean, trials: number = 0): Promise<boolean> {
    if (trials > 1) {
        return false;
    }
    const ssh_key = await runningDB.getPublicSSHKey();

    if (force) {
        await injectKey();
        return await test();
    }
    var ssh_keys = await getOutput(conn, commands.ssh.echo.windows_cmd);

    if (ssh_keys.includes(ssh_key)) {
        return await test();
    }

    conn.log("Ejecting SSH Key Using CMD");
    await injectKey();
    return await test();

    async function test() {
        try {
            let result = await testSSH(conn);
            if (result) return true;
            else {
                trials = trials + 1;
                return await injectSSHKeyWindowsCMD(conn, os_type, true, trials);
            }
        } catch (error) {
            trials = trials + 1;
            return await injectSSHKeyWindowsCMD(conn, os_type, true, trials);
        }
    }
    async function injectKey() {
        await runCommandNoExpect(conn, commands.ssh.eject.windows_cmd(ssh_key));
    }
}

async function injectCustomKey(conn: SSH2CONN, ssh_key: string, os_type: options) {
    conn.warn("Ejecting CUSTOM SSH Key");
    logger.log(`${conn.config[0].host} Ejecting CUSTOM SSH Key`, "warn");

    switch (os_type.toLowerCase()) {
        case "windows":
            await runCommandNoExpect(conn, commands.ssh.eject.windows(ssh_key));
            break;
        case "sunos":
            await runCommandNoExpect(conn, commands.ssh.eject.sunos(ssh_key));
            break;
        case "linux":
        case "freebsd":
        case "darwin":
            await runCommandNoExpect(conn, commands.ssh.eject.linux(ssh_key));
            break;
    }
    switch (os_type.toLowerCase()) {
        case "sunos":
            var ssh_keys = await getOutput(conn, commands.ssh.echo.sunos);
            if (ssh_keys.includes(ssh_key)) {
                return true;
            }
            break;
        case "linux":
            var ssh_keys = await getOutput(conn, commands.ssh.echo.linux);
            if (ssh_keys.includes(ssh_key)) {
                return true;
            }
            break;
        case "freebsd":
            var ssh_keys = await getOutput(conn, commands.ssh.echo.linux);
            if (ssh_keys.includes(ssh_key)) {
                return true;
            }
            break;
        case "darwin":
            break;
        case "windows":
            var ssh_keys = await getOutput(conn, commands.ssh.echo.windows);
            if (ssh_keys.includes(ssh_key)) {
                return true;
            }
            break;
    }
    return false;
}
async function addSSH(user: User, os: options) {
    const conn = await makeConnection(user);
    if (!conn) {
        return false;
    }
    let results = await injectSSHkey(conn, os);
    return results;
}
async function addCustomSSH(user: User, ssh_key: string, os: options) {
    const conn = await makeConnection(user);
    if (!conn) {
        return false;
    }
    let results = await injectCustomKey(conn, ssh_key, os);
    return results;
}

async function removeSSH(user: User, os: options) {
    const conn = await makeConnection(user);
    if (!conn) {
        return false;
    }
    let results = await removeSSHkey(conn, os);
    return results;
}

async function getStatus(target: Server) {
    try {
        const ssh = await findAnyConnection(target.users, 4000);
        if (!ssh) return false;
        await ssh.close();
        return true;
    } catch (error: any) {
        return false;
    }
}

async function scanSSH(
    ip: string,
    username: string,
    password: string
): Promise<{ operatingSystem: options; hostname: string; domain: string } | boolean> {
    try {
        const sshConfig: SSHConfig = {
            host: ip,
            username: username,
            password: password,
            privateKey: await runningDB.getPrivateSSHKey(),
            authHandler: ["publickey", "password"],
            reconnect: false,
            algorithms: acceptedAlgos,
            readyTimeout: 6000,
        };
        const ssh = new SSH2CONN("", sshConfig);
        await ssh.connect();
        let hostname = await detect_hostname(ssh);
        ssh.on("ssh", async (e) => {
            connectionLog.log(`[${ssh.config[0].host}] [] Event: ${e}`);
        });
        ssh.log("Connected");
        ssh.updateHostname(hostname);
        let os = await detect_os(ssh);
        let domain = "";
        if (os == "windows") {
            domain = await detect_domain(ssh);
        }
        await ssh.exec("exit").catch(() => "");
        await ssh.close();
        return { operatingSystem: os, hostname: hostname, domain: domain } || true;
    } catch (error: any) {
        // console.log(error)
        log((error as Error)?.message + ` ${ip}`, "error");
        return false;
    }
}

async function makeInteractiveShell(server: User): Promise<boolean> {
    const conn = await makeConnection(server);
    if (!conn) {
        return false;
    }
    conn.close();
    return new Promise(async (resolve, reject) => {
        temp.open("temp_key", async function (err, info) {
            if (err) {
                logger.log("unable to write temp file for ssh");
                reject(false);
                return;
            }
            fs.write(info.fd, await runningDB.getPrivateSSHKey(), (err) => {
                console.log(err);
            });
            fs.close(info.fd, async (err) => {
                await execShell(info);
                await temp.cleanup();
                logger.log("cleaned up files");
                resolve(true);
            });
        });

        async function execShell(info: temp.OpenFile) {
            logger.log("Running interactive shell in different window");
            try {
                switch (os.platform()) {
                    case "win32":
                        exec(`start cmd.exe /K ssh ${server.username}@${server.ipaddress} -i ${info.path}`);
                        break;
                    case "darwin":
                        exec(
                            `echo "ssh ${server.username}@${server.ipaddress} -i ${info.path}" > /tmp/tmp.sh ; chmod +x /tmp/tmp.sh ; open -a Terminal /tmp/tmp.sh ; sleep 2 ; rm /tmp/tmp.sh`
                        );
                        break;
                    case "linux":
                        exec(`x-terminal-emulator -e "ssh ${server.username}@${server.ipaddress} -i ${info.path}"`);
                        break;
                    case "freebsd":
                    case "netbsd":
                    case "openbsd":
                        exec(`xterm -e "ssh ${server.username}@${server.ipaddress} -i ${info.path}"`);
                        break;
                    default:
                        break;
                }
            } catch (error) {
                logger.log("unable to start shell");
            }

            await delay(3000);
        }
    });
}
async function detect_os(conn: SSH2CONN): Promise<options> {
    conn.log("Checking For Os");
    try {
        const system = await conn.exec(commands.detect.linux);
        const name = system?.toLowerCase();

        if (name.includes("linux")) {
            return "linux";
        } else if (name.includes("freebsd") || name.includes("openbsd") || name.includes("netbsd") || name.includes("dragon")) {
            return "freebsd";
        } else if (name.includes("sunos")) {
            return "sunos";
        } else if (name.includes("darwin")) {
            return "darwin";
        } else {
            const windowsInfo = await conn.exec(commands.detect.windows);
            if (windowsInfo.toLowerCase().includes("windows")) {
                return "windows";
            }
            return "Unknown";
        }
    } catch (error) {
        if (typeof error === "string" && error.toLowerCase().includes("is not recognized")) {
            return "windows";
        }
        return "Unknown";
    }
}
async function detect_domain(conn: SSH2CONN) {
    conn.log("Checking for Domain");
    try {
        const domain_string = await conn.exec(commands.AD.domain);
        return domain_string.split(":")[1].trim();
    } catch (error) {
        return "unknown";
    }
}
async function detect_hostname(conn: SSH2CONN) {
    conn.log("Checking For Hostname");
    try {
        const system = await conn.exec(commands.hostname);
        return system.trim();
    } catch (error) {
        return "unknown";
    }
}

class SSH2CONN extends SSH2Promise {
    hostname: string;
    ipaddress: string | undefined;
    username: string | undefined;
    constructor(hostname: string, options: Array<SSHConfig> | SSHConfig, disableCache?: boolean) {
        super(options, disableCache);
        this.username = this.config[0].username;
        this.hostname = hostname;
        this.ipaddress = this.config[0].host;
    }
    _getTag() {
        return `[${this.ipaddress}]`.bgGreen + ` ` + `[${this.hostname}]`.white + " " + `[${this.username}]` + " SSH: ";
    }
    info(str: string) {
        log(this._getTag() + `${str}`, "info");
    }
    log(str: string) {
        log(this._getTag() + `${str}`, "log");
    }
    error(str: string) {
        log(this._getTag() + `${str}`, "error");
    }
    warn(str: string) {
        log(this._getTag() + `${str}`, "warn");
    }
    success(str: string) {
        log(this._getTag() + `${str}`, "success");
    }
    updateHostname(hostname: string) {
        this.hostname = hostname;
    }
}

export {
    SSH2CONN,
    injectSSHkey as ejectSSHkey,
    makeConnection,
    getStatus,
    removeSSHkey,
    removeSSH,
    addSSH,
    makeInteractiveShell,
    testPassword,
    detect_os,
    detect_hostname,
    addCustomSSH,
    findAnyConnection,
    getConnectedIps,
    scanSSH,
};

const acceptedAlgos: Algorithms = {
    // Cipher algorithms (ordered from most secure to least secure)
    cipher: [
        "chacha20-poly1305@openssh.com",
        "aes256-gcm",
        "aes256-gcm@openssh.com",
        "aes128-gcm",
        "aes128-gcm@openssh.com",
        "aes256-ctr",
        "aes192-ctr",
        "aes128-ctr",
        "aes256-cbc",
        "aes192-cbc",
        "aes128-cbc",
        //   'arcfour256',
        //   'arcfour128',
        //   'arcfour',
        //   'blowfish-cbc',
        //   'cast128-cbc',
        //   '3des-cbc',
    ],
    // Compression algorithms (ordered from most secure to least secure)
    compress: ["none", "zlib@openssh.com", "zlib"],
    // HMAC algorithms (ordered from most secure to least secure)
    hmac: [
        "hmac-sha2-512-etm@openssh.com",
        "hmac-sha2-256-etm@openssh.com",
        "hmac-sha1-etm@openssh.com",
        "hmac-sha2-512",
        "hmac-sha2-256",
        "hmac-sha1",
        "hmac-ripemd160",
        "hmac-md5",
        "hmac-sha2-512-96",
        "hmac-sha2-256-96",
        "hmac-md5-96",
        "hmac-sha1-96",
    ],
    // Key exchange algorithms (ordered from most secure to least secure)
    kex: [
        "curve25519-sha256",
        "curve25519-sha256@libssh.org",
        "ecdh-sha2-nistp521",
        "ecdh-sha2-nistp384",
        "ecdh-sha2-nistp256",
        "diffie-hellman-group18-sha512",
        "diffie-hellman-group17-sha512",
        "diffie-hellman-group16-sha512",
        "diffie-hellman-group15-sha512",
        "diffie-hellman-group14-sha256",
        "diffie-hellman-group-exchange-sha256",
        "diffie-hellman-group1-sha1",
        "diffie-hellman-group14-sha1",
        "diffie-hellman-group-exchange-sha1",
    ],
    // Server host key formats (ordered from most secure to least secure)
    serverHostKey: [
        "ssh-ed25519",
        "ecdsa-sha2-nistp521",
        "ecdsa-sha2-nistp384",
        "ecdsa-sha2-nistp256",
        "rsa-sha2-512",
        "rsa-sha2-256",
        "ssh-rsa",
        "ssh-dss",
    ],
};
