import ldap from "ldapjs-promise";
import util from "util";
import logger from "../console/logger";
import { Server, ServerInfo, User } from "../../db/dbtypes";
import { delay } from "../util/util";
import { log } from "../console/debug";

async function ChangeADPassword(ADIpAddress: string, hostname: string, domain: string, username: string, oldPassword: string, newPassword: string) {
    logger.log("Attempting to change Password using LDAP");
    const client = new LDAP(hostname, ADIpAddress, {
        url: `ldaps://${ADIpAddress}`, // Use ldaps for secure communication
        tlsOptions: {
            rejectUnauthorized: false,
        },
    });

    client.log("LDAP Connected");

    const bindDN = `CN=${username},CN=Users,` + domain_to_ldap(domain);
    client.log(`Trying to bind to ${bindDN}`);

    await client.client.bind(bindDN, oldPassword);
    try {
        await client.client.modify(
            bindDN,
            new ldap.Change({
                operation: "delete",
                modification: {
                    type: "unicodePwd",
                    values: [encodePassword(oldPassword)],
                },
            })
        );
    } catch (error) {}

    await client.client.modify(
        bindDN,
        new ldap.Change({
            operation: "replace",
            modification: {
                type: "unicodePwd",
                values: [encodePassword(newPassword)],
            },
        })
    );
    client.success(`Changed Password of ${ADIpAddress} using LDAP`);

    await client.client.unbind();
    return true;
}
async function LDAPChangePassword(server: User, newPassword: string) {
    if (server.domain == "") {
        throw new Error("Unable to change Server without domain Set, please set domain");
    }
    return await ChangeADPassword(server.ipaddress, server.hostname, server.domain, stripDomain(server.username), server.password, newPassword);
}
async function TestLDAPPassword(server: User, newPassword: string): Promise<boolean> {
    if (server.domain == "" || !server.domain) {
        return false;
    }
    try {
        const bindDN = `CN=${stripDomain(server.username)},CN=Users,` + (server.domain != "" ? domain_to_ldap(server.domain) : "");

        const client = new LDAP(server.hostname, server.ipaddress, {
            url: `ldaps://${server.ipaddress}`,
            // Use ldaps for secure communication
            tlsOptions: {
                rejectUnauthorized: false,
            },
            timeout: 7000,
        });
        client.log(`Attempting to test Password using  ${bindDN}`);

        client.log("Connected, Attempting Password");
        try {
            await client.client.bind(bindDN, newPassword);
            client.success("Successful bind to LDAP");
            await client.client.unbind();
            return true;
        } catch (error) {
            client.warn("Unable to use password");
            logger.log(`Password Not working from LDAP ${client.ipaddress}, Possible No LDAP`, "warn");
            return false;
        }
    } catch (error) {
        logger.log(`Unable to connect`);
        return false;
    }
}
class LDAP {
    ipaddress: string;
    hostname: string;
    client: ldap.Client;
    constructor(hostname: string, ipaddress: string, options?: ldap.ClientOptions | undefined) {
        this.ipaddress = ipaddress;
        this.hostname = hostname;
        this.client = ldap.createClient(options);
        this.client.on("error", (err) => {
            this.error(err);
        });
    }
    _getTag() {
        return `[${this.ipaddress}]`.bgGreen + ` ` + `[${this.hostname}]`.white + " LDAP: ";
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

// extracts the username from a domain
function stripDomain(fullUsername: string): string {
    // Use a regex pattern to match "domain\username"
    const regex = /(?:\\|@)([^\\@]+)$/;
    const match = fullUsername.match(regex);

    if (match && match[1]) {
        // If a match is found, return the captured group (username)
        return match[1];
    } else {
        // If no match is found, return the original string
        return fullUsername;
    }
}

function domain_to_ldap(domain: string): string {
    let domains_parts = domain.split(".");
    let mapping = domains_parts.map((v, k) => {
        if (k == domains_parts.length - 1) {
            return "DC=" + v;
        } else {
            return "DC=" + v + ",";
        }
    });
    return mapping.join("");
}
function encodePassword(str: string) {
    var output = "";
    str = '"' + str + '"';

    for (var i = 0; i < str.length; i++) {
        output += String.fromCharCode(str.charCodeAt(i) & 0xff, (str.charCodeAt(i) >>> 8) & 0xff);
    }

    return output;
}

export { LDAPChangePassword, TestLDAPPassword };
