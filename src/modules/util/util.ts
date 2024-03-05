import bcrypt from "bcryptjs";
import crypto from "crypto";
var sha512crypt = require("sha512crypt-node");

function removeANSIColorCodes(inputString: string): string {
    const colorCodePattern = /\x1B\[[0-9;]*[A-Za-z]/g;

    const stringWithoutColor = inputString.replace(colorCodePattern, "");

    return stringWithoutColor;
}
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isValidIPAddress(ip: string): boolean {
    const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

    const match = ip.match(ipPattern);

    if (!match) {
        return false;
    }

    for (let i = 1; i <= 4; i++) {
        const octet = parseInt(match[i], 10);
        if (octet < 0 || octet > 255) {
            return false;
        }
    }

    return true;
}
async function bcryptPassword(password: string): Promise<string> {
    try {
        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);

        const hashedPassword = await bcrypt.hash(password, salt);

        return hashedPassword;
    } catch (error) {
        throw error;
    }
}
function encryptPassword(password: string): string {
    var passwordHash;
    var passwordSalt = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 5; i++) passwordSalt += possible.charAt(Math.floor(Math.random() * possible.length));
    passwordHash = sha512crypt.sha512crypt(password, passwordSalt);
    return passwordHash;
}

function replaceAll(string: string, search: string, replace: string) {
    return string.split(search).join(replace);
}
function mapDateString(inputString: string) {
    const dateObject = new Date(inputString);
    const formattedDate = `${dateObject.getFullYear()}/${(dateObject.getMonth() + 1).toString().padStart(2, "0")}/${dateObject
        .getDate()
        .toString()
        .padStart(2, "0")}  Time: ${dateObject.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`;

    return {
        name: formattedDate,
        value: inputString,
    };
}
function makeId() {
    const id = crypto.randomUUID();
    return id;
}

function findAndRemove(array: any[], target: any) {
    return array.filter((v) => v != target);
}
export { removeANSIColorCodes, delay, isValidIPAddress, bcryptPassword, replaceAll, encryptPassword, mapDateString, makeId, findAndRemove };
