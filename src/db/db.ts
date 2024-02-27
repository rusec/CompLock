import { Level } from "level";
import crypto from "crypto";
import path from "path";
import os from "os";
import { AbstractSublevel } from "abstract-level";
import { machineIdSync } from "node-machine-id";
import keccak256 from "keccak256";
import keygen from "ssh-keygen-lite";
import csv from "csvtojson";
import { Server, ServerCSV, ServerInfo, User } from "./dbtypes";
import logger from "../modules/console/logger";
import { options } from "../modules/util/options";
import bcrypt from "bcryptjs";
import { password_result } from "../modules/password/change_passwords";
import { log } from "../modules/console/debug";
import inquirer from "inquirer";
import { delay, findAndRemove, makeId } from "../modules/util/util";
import fs from "fs";
import LoggerTo from "../modules/console/loggerToFile";
import { json2csv } from "json-2-csv";
let UUID = "";
class Encryption {
    constructor() {}
    encrypt(data: string, key: string) {
        try {
            const iv = crypto.randomBytes(16).toString("hex");
            const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key, "hex"), Buffer.from(iv, "hex"));
            let encryptedData = cipher.update(data, "utf8", "base64");
            encryptedData += cipher.final("base64");
            return iv + encryptedData;
        } catch (error) {
            throw new Error(`Error writing and encrypting file: ${error}`);
        }
    }
    decrypt(data: string, key: string) {
        try {
            if (!data) {
                throw new Error("Data cannot be undefined");
            }
            let encryptedData = data;
            let iv = encryptedData.substring(0, 32);
            encryptedData = encryptedData.substring(32);
            const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "hex"), Buffer.from(iv, "hex"));
            let decryptedData = decipher.update(encryptedData, "base64", "utf8");
            decryptedData += decipher.final("utf8");
            return decryptedData;
        } catch (error) {
            return false;
        }
    }
}
async function genKey(): Promise<{
    key: string;
    pubKey: string;
}> {
    return new Promise((resolve) => {
        keygen({
            comment: "My_Lonely_Script",
            read: true,
            format: "PEM",
        })
            .then((value) => resolve(value))
            .catch(async (err) => await genKey());
    });
}
function normalizeServerInfo(jsonArr: Array<ServerCSV>): Array<ServerCSV> {
    const normalizedArr: ServerCSV[] = [];

    for (const jsonObj of jsonArr) {
        const serverInfo: ServerCSV = {
            Name: jsonObj.Name || "",
            "IP Address": jsonObj["IP Address"] || "",
            username: jsonObj.username || "",
            password: jsonObj.password || "",
            "OS Type": jsonObj["OS Type"] || "",
            domain: jsonObj["domain"] || "",
        };

        normalizedArr.push(serverInfo);
    }

    return normalizedArr;
}
async function bcryptPassword(password: string): Promise<string> {
    try {
        // Generate a salt (a random string)
        const saltRounds = 10; // You can adjust this according to your needs
        const salt = await bcrypt.genSalt(saltRounds);

        // Hash the password using the salt
        const hashedPassword = await bcrypt.hash(password, salt);

        return hashedPassword;
    } catch (error) {
        throw error;
    }
}

class DataBase {
    process_dir: string;
    filePath: string;
    db: Level<string, any>;
    configs: AbstractSublevel<Level<string, any>, string | Buffer | Uint8Array, string, string>;
    computers: AbstractSublevel<Level<string, ServerInfo>, string | Buffer | Uint8Array, string, ServerInfo>;
    encrypt: Encryption;
    ready: boolean;
    masterHash: string;
    users: AbstractSublevel<Level<string, User>, string | Buffer | Uint8Array, string, User>;
    log: LoggerTo;

    constructor() {
        this.log = new LoggerTo("db_log");
        this.encrypt = new Encryption();
        this.process_dir = path.join(os.homedir() + "/Tortilla");
        this.filePath = path.join(this.process_dir, "muffins");
        this.checkAndCreateDB();
        this.db = new Level(this.filePath);
        this.configs = this.db.sublevel("app_configs");
        this.computers = this.db.sublevel("computers", { valueEncoding: "json" });
        this.users = this.db.sublevel("users", { valueEncoding: "json" });

        this.masterHash = "";
        this.ready = false;
        this.initDB();
    }
    private checkAndCreateDB() {
        try {
            if (!fs.existsSync(this.process_dir)) {
                fs.mkdirSync(this.process_dir);
            }
            if (!fs.existsSync(this.filePath)) {
                // If not, create the muffins folder
                fs.mkdirSync(this.filePath);
                ``;
            } else {
                // If muffins path exists, check if it's a directory
                const stats = fs.statSync(this.filePath);
                if (!stats.isDirectory()) {
                    // If it's not a directory, throw an error or handle accordingly
                    fs.unlinkSync(this.filePath);
                    fs.mkdirSync(this.filePath);
                    return;
                }
            }
        } catch (error) {
            this.log.log((error as Error).message, "error");
        }
    }
    async initDB() {
        try {
            await this.db.open();

            this.configs = this.db.sublevel("app_configs");
            this.computers = this.db.sublevel("computers", { valueEncoding: "json" });
            this.users = this.db.sublevel("users", { valueEncoding: "json" });

            //check for configs
            let encryptedSSHPkey = await this.configs.get("privateKey");
            let sshPkey = this.encrypt.decrypt(encryptedSSHPkey, this._getPKey(""));
            if (!sshPkey) {
                throw new Error("unable to parse ssh private key resetting db");
            }
            this.ready = true;
        } catch (error) {
            logger.log(error as string);
            await this._resetDB();
        }
    }

    private async _resetDB() {
        try {
            let encryptKey = this._getPKey("");
            await this.deleteDB();
            var keys = await genKey();
            await this.configs.put("privateKey", this.encrypt.encrypt(keys.key, encryptKey));
            await this.configs.put("publicKey", this.encrypt.encrypt(keys.pubKey, encryptKey));

            fs.writeFileSync(this.process_dir + "/id_rsa.pub", keys.pubKey);
            this.ready = true;
        } catch (error) {
            await this._resetDB();
        }
    }
    async deleteDB() {
        await this.computers.clear();
        await this.users.clear();
    }
    async readCSV(): Promise<void> {
        let encryptionKey = this._getPKey("");
        try {
            let passwd_hash = this.encrypt.decrypt(await this.configs.get("master_hash").catch(() => ""), encryptionKey);
            if (!passwd_hash) {
                throw new Error("no master password");
            }
            await this.deleteDB();
            let jsonArray = await csv().fromFile("./computers.csv");
            let computers = normalizeServerInfo(jsonArray);
            for (const target of computers) {
                let check = await this.computers.get(target["IP Address"]).catch(() => undefined);
                if (!check) await this.addTarget(target.Name, target["IP Address"], target["OS Type"], target.domain);
                await this.addUser(target["IP Address"], target.username, target.password, target.Name, target.domain);
            }
            logger.log("Read computers from CSV", "info");
        } catch (error) {
            this.log.error((error as Error).message);
        }
    }
    async exportDB() {
        try {
            let db = await this.readComputers();
            let lines: ServerCSV[] = [];

            for (let computer of db) {
                for (let user of computer.users) {
                    lines.push({
                        "IP Address": computer.ipaddress,
                        Name: computer.Name,
                        "OS Type": computer["OS Type"],
                        domain: computer.domain,
                        password: user.password,
                        username: user.username,
                    });
                }
            }
            fs.writeFileSync("./computers.csv", json2csv(lines), "utf-8");
        } catch (error) {
            this.log.error((error as Error).message);
        }
    }

    async addUser(ip: string, username: string, password: string, hostname: string, domain: string = "") {
        let encryptionKey = this._getPKey("");
        try {
            let passwd_hash = this.encrypt.decrypt(await this.configs.get("master_hash").catch(() => ""), encryptionKey);
            if (!passwd_hash) {
                throw new Error("no master password");
            }

            let computer = await this.computers.get(ip).catch(() => undefined);
            if (!computer) {
                throw new Error(`Computer ${ip} not found`);
            }

            let user: User = {
                user_id: makeId(),
                ipaddress: ip,
                hostname: hostname,
                domain: domain,
                username: username,
                password: this.encrypt.encrypt(password || "", this._getPKey(passwd_hash)),
                oldPasswords: [],
                failedPasswords: [],
                password_changes: 0,
                ssh_key: false,
            };
            await this.users.put(user.user_id, user);
            computer.users.push(user.user_id);
            await this.computers.put(ip, computer);
            return true;
        } catch (error) {
            this.log.error((error as Error).message);

            return false;
        }
    }
    async getUserByID(id: string) {
        try {
            let encryptionKey = await this.getDbEncryptionKey();
            if (!encryptionKey) {
                throw new Error("Unable to get encryption key");
            }
            let user = await this.users.get(id).catch(() => undefined);
            if (!user) throw new Error("User Not Found");

            let password = this.encrypt.decrypt(user.password, encryptionKey);
            if (password) user.password = password;
            user.failedPasswords = user.failedPasswords.map((pass_hash: string) => {
                if (typeof encryptionKey == "boolean") return pass_hash;
                let pass = this.encrypt.decrypt(pass_hash, encryptionKey);
                if (pass) return pass;
                return pass_hash;
            })
            user.oldPasswords = user.oldPasswords.map((pass_hash: string) => {
                if (typeof encryptionKey == "boolean") return pass_hash;
                let pass = this.encrypt.decrypt(pass_hash, encryptionKey);
                if (pass) return pass;
                return pass_hash;
            });
            return user;
        } catch (error) {
            this.log.error((error as Error).message);

            return false;
        }
    }
    async setAdmin(ip: string, admin_index: number) {
        try {
            let computer = await this.computers.get(ip).catch(() => undefined);
            if (!computer) throw new Error(`Computer ${ip} not found`);

            const user = computer.users.splice(admin_index, 1)[0];
            if (!user) throw new Error(`User ${admin_index} not found`);
            computer.users.unshift(user);

            await this.computers.put(ip, computer);
            return true;
        } catch (error) {
            this.log.error((error as Error).message);

            return false;
        }
    }
    async getUser(ip: string, username: string) {
        try {
            let computer = await this.computers.get(ip).catch(() => undefined);
            if (!computer) throw new Error(`Computer ${ip} not found`);
            let encryptionKey = await this.getDbEncryptionKey();
            if (!encryptionKey) {
                throw new Error("Unable to get encryption key");
            }
            for await (let id of computer.users) {
                let user = await this.users.get(id).catch(() => undefined);
                if (!user) continue;
                if (user.username != username) continue;

                let password = this.encrypt.decrypt(user.password, encryptionKey);
                if (password) user.password = password;
                user.failedPasswords = user.failedPasswords.map((pass_hash: string) => {
                    if (typeof encryptionKey == "boolean") return pass_hash;
                    let pass = this.encrypt.decrypt(pass_hash, encryptionKey);
                    if (pass) return pass;
                    return pass_hash;
                })
                user.oldPasswords = user.oldPasswords.map((pass_hash: string) => {
                    if (typeof encryptionKey == "boolean") return pass_hash;
                    let pass = this.encrypt.decrypt(pass_hash, encryptionKey);
                    if (pass) return pass;
                    return pass_hash;
                });
                return user;
            }
            return false;
        } catch (error) {
            this.log.error((error as Error).message);

            return false;
        }
    }

    async editUser(user_id: string, username: string | undefined, domain: string | undefined) {
        try {
            let encryptionKey = await this.getDbEncryptionKey();
            if (!encryptionKey) {
                throw new Error("Unable to get encryption key");
            }

            let user = await this.users.get(user_id).catch(() => undefined);
            if (!user) throw new Error("User Not Found");

            if (username) {
                user.username = username;
            }

            if (domain) {
                user.domain = domain;
            }

            await this.users.put(user.user_id, user);
            return true;
        } catch (error) {
            this.log.error((error as Error).message);

            return false;
        }
    }
    async removeUser(ip: string, user_id: string) {
        try {
            let computer = await this.computers.get(ip).catch(() => undefined);
            if (!computer) throw new Error(`Computer ${ip} not found`);

            let index = computer.users.findIndex((v) => user_id === v);
            if (index == -1) throw new Error(`User ${user_id} not found`);

            computer.users = computer.users.filter((v) => v != user_id);

            await this.computers.put(ip, computer);
            await this.users.del(user_id);
            return true;
        } catch (error) {
            this.log.error((error as Error).message);

            return false;
        }
    }

    async addTarget(name: string, ip: string, os_type: options, domain: string = "") {
        try {
            let computer = await this.computers.get(ip).catch(() => undefined);
            if (computer) {
                await this.computers.put(ip, {
                    Name: name || computer.Name,
                    "IP Address": ip,
                    users: computer.users || [],
                    "OS Type": os_type || computer["OS Type"],
                    domain: domain || computer.domain,
                    password_changes: computer.password_changes || 0,
                });
                return true;
            } else {
                await this.computers.put(ip, {
                    Name: name,
                    "IP Address": ip,
                    users: [],
                    "OS Type": os_type,
                    domain: domain,
                    password_changes: 0,
                });
                return true;
            }
        } catch (error) {
            this.log.error((error as Error).message);
            return false;
        }
    }
    async addTargetAndUser(name: string, ip: string, user: string, pass: string, os: options, domain: string) {
        try {
            let computer = await this.computers.get(ip).catch(() => undefined);
            if (!computer) await this.addTarget(name, ip, os, domain);
            await this.addUser(ip, user, pass, name, domain);
            return true;
        } catch (error) {
            this.log.error((error as Error).message);
            return false;
        }
    }


    async updateComputers(old_key: string, new_key: string) {
        for await (const ip of this.computers.keys()) {
            let computer = await this.computers.get(ip);
            for await (const id of computer.users) {
                let user = await this.users.get(id).catch(() => undefined);
                if (!user) {
                    computer.users = findAndRemove(computer.users, user);
                    continue;
                }
                let old_pass = this.encrypt.decrypt(user.password, old_key);
                if (!old_pass) {
                    this.log.error(`Unable to read Password of ${computer["IP Address"]} [${computer.Name}]`);
                } else user.password = this.encrypt.encrypt(old_pass, new_key);
                await this.users.put(id, user);
            }
            await this.computers.put(ip, computer);
        }
    }

    async writePassword(password_string: string): Promise<void> {
        logger.log(`Request to update Master Password`, "info");
        let encryptionKey = this._getPKey("");
        const hash = await bcryptPassword(password_string);
        const old_hash_encrypted = await this.configs.get("master_hash").catch(() => "");
        //has old hash
        const old_hash = this.encrypt.decrypt(old_hash_encrypted, encryptionKey);
        // unable to read old_hash means either corruption or no password and db is just init
        if (!old_hash || old_hash == '') {
            await this.configs.put("master_hash", this.encrypt.encrypt(hash, encryptionKey));
            await this._resetDB();
            logger.log(`Reset Database with new password`, "error");
            logger.log(`Database ready`, "info");
            this.ready = true;
            return;
        }
        await this.configs.put("master_hash", this.encrypt.encrypt(hash, encryptionKey));
        await this.updateComputers(this._getPKey(old_hash), this._getPKey(hash));
        logger.log(`Updated Database with new password`, "info");
        return;
    }
    async editComputer(ip: string, domain?: string, os?: options) {
        try {
            let computer = await this.computers.get(ip).catch(() => undefined);
            if (!computer) throw new Error("Computer not found");

            if (domain) {
                computer.domain = domain;
            }
            if (os) {
                computer["OS Type"] = os;
            }
            await this.computers.put(ip, computer);
            return true;
        } catch (err) {
            return false;
        }
    }

    async updateComputerHostname(ip: string, hostname: string) {
        try {
            let computer = await this.computers.get(ip).catch(() => undefined);
            if (!computer) throw new Error("Computer not found");

            computer.Name = hostname;

            for (const id of computer.users) {
                let user = await this.users.get(id).catch(() => undefined);
                if (!user) {
                    computer.users = findAndRemove(computer.users, user);
                    continue;
                }
                user.hostname = hostname;
                await this.users.put(id, user);
            }
            await this.computers.put(ip, computer);
            return true;
        } catch (err) {
            return false;
        }
    }
    async getPasswordChanges() {
        let result = 0;
        for await (let ip of this.users.keys()) {
            let user = await this.users.get(ip);
            result += user.password_changes;
        }
        return result;
    }

    /**
     * Removes a computer entry from the list of computers by its index.
     *
     * @param {string} ip - The index of the computer entry to remove.
     * @returns {Promise<void>} A promise that resolves when the computer entry is successfully removed.
     */
    async removeComputer(ip: string): Promise<boolean> {
        await this._backUp();
        let computer = await this.computers.get(ip).catch(() => undefined);
        if (!computer) return false;
        let promises = computer.users.map(async (id) => await this.removeUser(ip, id));
        await Promise.allSettled(promises);
        await this.computers.del(ip).catch(() => "");
        logger.log(`Removed Computer ${ip}`, "info");
        return true;
    }

    /**
     * Reads the master password hash and returns it from the current instance.
     *
     * @returns {Promise<string | false>} A promise that resolves to the master password.
     */
    async readPassword() {
        try {
            return this.encrypt.decrypt(await this.configs.get("master_hash").catch(() => ""), this._getPKey(""));
        } catch (error) {
            return false;
        }
    }
    private async getDbEncryptionKey() {
        let encryptionKey = this._getPKey("");
        let passwd_hash_encrypted = await this.configs.get("master_hash").catch(() => "");
        if (passwd_hash_encrypted == "") {
            return false;
        }
        let hash = this.encrypt.decrypt(passwd_hash_encrypted, encryptionKey);
        if (!hash) {
            return false;
        }
        return this._getPKey(hash);
    }
    async writeUserPassword(user_id: string, password: string) {
        try {
            let encryptKey = await this.getDbEncryptionKey();
            if (!encryptKey) {
                throw new Error("Unable to get encryption key");
            }
            let user = await this.users.get(user_id).catch(() => undefined);
            if (!user) {
                throw new Error(`User ${user_id} not found`);
            }
            let oldPassword = user.password;
            user.password = this.encrypt.encrypt(password, encryptKey);
            user.password_changes = user.password_changes + 1;
            user.oldPasswords.push(oldPassword);
            await this.users.put(user.user_id, user);
            return true;
        } catch (error) {
            this.log.log((error as Error).message);

            return false;
        }
    }
    async writeUserSSH(user_id: string, result: boolean) {
        try {
            let user = await this.users.get(user_id).catch(() => undefined);
            if (!user) {
                throw new Error(`User ${user_id} not found`);
            }
            logger.log(`${result ? "Added" : "Removed"} SSH to Computer ${user.ipaddress}`, "info");
            user.ssh_key = result;
            await this.users.put(user_id, user);
            return true;
        } catch (error) {
            this.log.log((error as Error).message);
            return false;
        }
    }
    async writeUserFailedPassword(user_id:string, password:string){
        if (!password) {
            return false;
        }

        let encryptKey = await this.getDbEncryptionKey();
        if (!encryptKey) {
            this.log.log("Unable to get encryption key");
            return false;
        }
        let user = await this.users.get(user_id).catch(() => undefined);
        if (!user) {
            return false;
        }

        let password_encrypted = this.encrypt.encrypt(password, encryptKey);
        user.failedPasswords ? user.failedPasswords.push(password_encrypted) : [password_encrypted];

        await this.users.put(user.user_id, user);
        return true;

    }
    
    private async updateDomainUser(username:string, domain:string, passwordHash:string, skip_id:string){
        for await(let id of this.users.keys()){
            try {
                if(skip_id == id) continue;
                let user = await this.users.get(id).catch(()=>undefined);
                if (!user) {
                    throw new Error("Unable to find user");
                }
                if(user.domain != domain || user.username != username) continue;
                let oldPassword = user.password;
                user.password = passwordHash;
                user.oldPasswords ? user.oldPasswords.push(oldPassword) : [oldPassword];
    
                await this.users.put(user.user_id, user);
            } catch (error) {
            this.log.error((error as Error).message);
                
            }
           
        
        }
    }
    async writeUserResult(user_id: string, result: password_result) {
        try {
            if (!result.password) {
                throw new Error("Password cannot be undefined");
            }
            let encryptKey = await this.getDbEncryptionKey();
            if (!encryptKey) {
                this.log.log("Unable to get encryption key");

                return false;
            }
            let user = await this.users.get(user_id).catch(() => undefined);
            if (!user) {
                return false;
            }
            let oldPass = user.password;

            user.password = this.encrypt.encrypt(result.password, encryptKey);
            user.ssh_key = result.ssh;
            user.oldPasswords ? user.oldPasswords.push(oldPass) : [oldPass];
            user.password_changes = user.password_changes + 1;

            log(`Writing computer ${user.ipaddress} ${user.username}`, "info");
            logger.log(`Writing Computer ${user.ipaddress} ${user.username} in Database`, "info");

            await this.users.put(user.user_id, user);

            if(user.domain != '' || user.domain != undefined){
                await this.updateDomainUser(user.username, user.domain, user.password, user.user_id)
            }


            return true;
        } catch (error) {
            this.log.error((error as Error).message);

            return false;
        }
    }

    async getComputer(ip: string): Promise<Server | false> {
        let encryptionKey = await this.getDbEncryptionKey();
        if (!encryptionKey) {
            this.log.log("Unable to get encryption key");
            return false;
        }
        try {
            let computer = await this.computers.get(ip).catch(() => undefined);
            if (!computer) throw new Error(`Computer ${ip} not found`);

            let users = [];

            let password_changes = 0;
            for await (let id of computer.users) {
                let user = await this.users.get(id).catch(() => undefined);
                if (!user) {
                    continue;
                }
                let password = this.encrypt.decrypt(user.password, encryptionKey);
                if (password) user.password = password;
                user.failedPasswords = user.failedPasswords.map((pass_hash: string) => {
                    if (typeof encryptionKey == "boolean") return pass_hash;
                    let pass = this.encrypt.decrypt(pass_hash, encryptionKey);
                    if (pass) return pass;
                    return pass_hash;
                })
                user.oldPasswords = user.oldPasswords.map((pass_hash: string) => {
                    if (typeof encryptionKey == "boolean") return pass_hash;
                    let pass = this.encrypt.decrypt(pass_hash, encryptionKey);
                    if (pass) return pass;
                    return pass_hash;
                });
                password_changes += user.password_changes;

                users.push(user);
            }

            let server: Server = {
                Name: computer.Name,
                ipaddress: computer["IP Address"],
                "OS Type": computer["OS Type"],
                password_changes: password_changes,
                domain: computer.domain,
                users: users,
            };

            return server;
        } catch (error) {
            this.log.error((error as Error).message);
            return false;
        }
    }

    async readComputers(): Promise<Array<Server>> {
        let computers: Array<Server> = [];
        let encryptionKey = await this.getDbEncryptionKey();
        if (!encryptionKey) {
            this.log.error("Unable to get encryption key");
            return computers;
        }
        for await (let ip of this.computers.keys()) {
            let computer = await this.computers.get(ip);

            let users = [];

            let password_changes = 0;
            for await (let id of computer.users) {
                let user = await this.users.get(id).catch(() => undefined);
                if (!user) {
                    continue;
                }
                let password = this.encrypt.decrypt(user.password, encryptionKey);
                if (password) user.password = password;
                user.failedPasswords = user.failedPasswords.map((pass_hash: string) => {
                    if (typeof encryptionKey == "boolean") return pass_hash;
                    let pass = this.encrypt.decrypt(pass_hash, encryptionKey);
                    if (pass) return pass;
                    return pass_hash;
                })
                user.oldPasswords = user.oldPasswords.map((pass_hash: string) => {
                    if (typeof encryptionKey == "boolean") return pass_hash;
                    let pass = this.encrypt.decrypt(pass_hash, encryptionKey);
                    if (pass) return pass;
                    return pass_hash;
                });
                password_changes += user.password_changes;

                users.push(user);
            }

            let server: Server = {
                Name: computer.Name,
                ipaddress: computer["IP Address"],
                "OS Type": computer["OS Type"],
                password_changes: password_changes,
                domain: computer.domain,
                users: users,
            };
            computers.push(server);
        }

        return computers;
    }

    /**
     * Resets the master password in the database by prompting the user for the old and new passwords.
     *
     * @returns {Promise<void>} A promise that resolves when the master password is successfully reset.
     */
    async resetMasterPassword(): Promise<void> {
        const me = this;
        let trails = 3;
        let new_password = "";
        let trails_password = 3;
        let password_hash: string | false = await this.readPassword();

        //FIX THIS, Currently any hash can be sent to validate.
        const { master_password } = await inquirer.prompt([
            {
                name: "old",
                type: "password",
                validate: function (value) {
                    if (trails <= 0) {
                        process.exit(0);
                    }
                    trails--;
                    return me.validateMasterPassword(password_hash, value) ? true : "Invalid Password";
                },
            },
            {
                name: "master_password",
                type: "password",
                validate: function (value) {
                    if (value.length > 8) {
                        new_password = value;
                        return true;
                    }
                    return "Password must be longer then 8 characters";
                },
                message: "please enter a master password",
            },
            {
                name: "confirm",
                type: "password",
                validate: function (value) {
                    if (trails_password <= 0) {
                        process.exit(0);
                    }
                    if (value == new_password) {
                        return true;
                    }
                    trails_password--;
                    return "Password must match";
                },
                message: "please confirm new password",
            },
        ]);

        await this.writePassword(master_password);
    }

    /**
     * Validates the Master Password for the program ensuring that the password hash is the same.
     * @param {string | boolean} hash
     * @param {string} master_password
     * @returns {boolean} returns true if password is correct
     */
    validateMasterPassword(hash: string | false, master_password: string): boolean {
        if (typeof master_password != "string") {
            return false;
        }
        if (hash === undefined) {
            return false;
        }
        if (hash === "") {
            return false;
        }
        if (!hash) {
            return false;
        }
        return bcrypt.compareSync(master_password, hash);
    }
    private async _backUp() {}

    private _getPKey(password_hash: string) {
        var uuid = this._getUUID();
        var plat = process.platform;
        let _encryptionKey = keccak256(uuid + plat + this._string() + password_hash + "shrimp_key").toString("hex");

        return _encryptionKey;
    }
    private _getUUID() {
        if (UUID == "") {
            UUID = machineIdSync(true).toUpperCase();
        }
        return UUID;
    }
    private _string() {
        var _ = [
            "kadjv",
            "ketchup",
            "room",
            "atomsphere",
            "chair",
            "hat",
            "glasses",
            "napkin",
            "43",
            "load",
            "truck",
            "freemon",
            "soymilk",
            "light",
            "coke",
            "false",
            "kitchen",
            "laptop",
            "fork",
            "mask",
            "soda",
            "airplane",
            "song",
            "heads",
            "people",
            "usa",
            "town",
            "car",
            "sandwich",
        ];
        var uuid = this._getUUID() + process.platform;
        var result = "j";
        for (var i = 0; i < uuid.length; i++) {
            if (uuid[i] === "-" || uuid[i] === ":") {
                result += "k";
            } else {
                if (!isNaN(parseInt(uuid[i]))) {
                    result += _[parseInt(uuid[i])];
                } else {
                    var code = uuid[i].toUpperCase().charCodeAt(0);
                    if (code > 64 && code < 91) result += _[code - 64];
                }
            }
        }
        return result;
    }
    async getPrivateSSHKey() {
        const encrypted_ssh = await this.configs.get("privateKey").catch(() => "");
        let key = this.encrypt.decrypt(encrypted_ssh, this._getPKey(""));
        return key ? key : "";
    }
    async getPublicSSHKey() {
        const encrypted_ssh = await this.configs.get("publicKey").catch(() => "");
        let key = this.encrypt.decrypt(encrypted_ssh, this._getPKey(""));
        return key ? key : "";
    }
}

const runningDB = new DataBase();

export default runningDB;
