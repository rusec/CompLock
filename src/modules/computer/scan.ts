import { options } from "../util/options";
import { getOutput } from "../util/run_command";
import { commands } from "../util/commands";
import { log } from "../console/debug";
import { SSH2CONN, detect_hostname, detect_os } from "../util/ssh_utils";
import { pressEnter } from "../console/enddingModules";
import csv from "csvtojson";
import fs from "fs";
import asTable from "as-table";

async function scanComputer(conn: SSH2CONN, os_type: options, wait_for_enter: boolean = true): Promise<string> {
    let hostname = await detect_hostname(conn);
    let os = await detect_os(conn);
    let openPorts: port[] = [];

    let installedApplications: application[] = [];

    let osInfo: os_info = {
        osName: "Unknown",
        osVersion: "Unknown",
        osManufacturer: "Unknown",
        arch: "Unknown",
    };
    let users: user[] = [];
    switch (os_type) {
        case "windows":
            openPorts = await getPortsWindows(conn);
            installedApplications = await getInstalledAppsWindows(conn);
            osInfo = await getOsInfoWindows(conn);
            users = await getUsersWindows(conn);
            break;
        case "linux":
            installedApplications = await getInstalledAppsLinux(conn);
            osInfo = await getOsInfoLinux(conn);
            openPorts = await getPortsLinux(conn);
            users = await getUsersLinux(conn);

            break;
        case "sunos":
            installedApplications = await getInstallAppsSunOS(conn);
            osInfo = await getOsInfoLinux(conn);
            openPorts = [];
            users = await getUsersLinux(conn);
            break;

        case "freebsd":
            osInfo = await getOsInfoLinux(conn);
            installedApplications = await getInstallAppsFreeBsd(conn);
            openPorts = await getPortsFreeBSD(conn);
            users = await getUsersLinux(conn);

            break;

        case "darwin":
            osInfo = await getOsInfoLinux(conn);
            installedApplications = await getInstalledAppsLinux(conn);
            openPorts = await getPortsLinux(conn);
            users = await getUsersLinux(conn);

            break;
        case "Unknown":
            break;

        default:
            osInfo = {
                osName: "Unknown",
                osVersion: "Unknown",
                osManufacturer: "Unknown",
                arch: "Unknown",
            };
            break;
    }

    let text = createTextFile(hostname, os, openPorts, installedApplications, osInfo, users);
    wait_for_enter && (await pressEnter());
    await conn.close();
    return text;
}
type application = {
    name: string;
    description: string;
    installDate: string;
};

type port = {
    protocol: string;
    port: string;
};

type os_info = {
    osName: string;
    osVersion: string;
    osManufacturer: string;
    arch: string;
};

const portMappings = new Map([
    [20, "FTP (Data)"],
    [21, "FTP (Control)"],
    [22, "SSH"],
    [23, "Telnet"],
    [25, "SMTP"],
    [53, "DNS"],
    [80, "HTTP"],
    [110, "POP3"],
    [143, "IMAP"],
    [443, "HTTPS"],
    [587, "SMTP (Submission)"],
    [993, "IMAPS"],
    [995, "POP3S"],
    [3306, "MySQL"],
    [3389, "Remote Desktop (RDP)"],
    [5432, "PostgreSQL"],
    [5900, "VNC"],
    [6379, "Redis"],
    [8080, "HTTP Proxy"],
    [8443, "HTTPS (alternative)"],
    [27017, "MongoDB"],
    [28015, "RethinkDB"],
    [3305, "MySQL (alternative)"],
    [9000, "Docker Swarm"],
    [10000, "Webmin"],
    [11211, "Memcached"],
    [27018, "MongoDB (alternative)"],
    [5000, "UPnP"],
    [8081, "HTTP Proxy (alternative)"],
    [8500, "Consul"],
    [9200, "Elasticsearch"],
    [5433, "PostgreSQL (alternative)"],
    [9999, "OpenShift"],
    [5672, "RabbitMQ"],
    [111, "RPCBIND"],
    [2049, "NFS"],
    [4444, "Metasploit"],
    [6666, "IRC"],
    [6667, "IRC (alternative)"],
    [8000, "HTTP (alternative)"],
    [9090, "CockroachDB"],
    [2375, "Docker"],
    [2376, "Docker (TLS)"],
    [27019, "MongoDB (alternative)"],
    [6660, "IRC (alternative)"],
    [6661, "IRC (alternative)"],
    [6662, "IRC (alternative)"],
    [6663, "IRC (alternative)"],
    [6664, "IRC (alternative)"],
    [6665, "IRC (alternative)"],
    [6666, "IRC (alternative)"],
    [6667, "IRC (alternative)"],
    [6668, "IRC (alternative)"],
    [6669, "IRC (alternative)"],
    [8888, "HTTP (alternative)"],
    [9990, "HTTP Proxy (alternative)"],
    [50000, "SAP"],
    [2379, "etcd"],
    [2380, "etcd (alternative)"],
    [5984, "CouchDB"],
    [63700, "Ambari"],
    [8001, "HTTP (alternative)"],
    [8140, "Puppet"],
    [8444, "HTTPS (alternative)"],
    [8880, "HTTP (alternative)"],
    [8883, "HTTPS (alternative)"],
    [8884, "HTTPS (alternative)"],
    [8885, "HTTPS (alternative)"],
    [8886, "HTTPS (alternative)"],
    [8887, "HTTPS (alternative)"],
    [8889, "HTTPS (alternative)"],
    [9999, "HTTP (alternative)"],
    [10001, "HTTP Proxy (alternative)"],
    [10002, "HTTP Proxy (alternative)"],
    [32768, "Backdoor"],
    [32769, "Backdoor (alternative)"],
    [32770, "Backdoor (alternative)"],
    [32771, "Backdoor (alternative)"],
    [32772, "Backdoor (alternative)"],
    [32773, "Backdoor (alternative)"],
    [32774, "Backdoor (alternative)"],
    [32775, "Backdoor (alternative)"],
    [32776, "Backdoor (alternative)"],
    [32777, "Backdoor (alternative)"],
    [32778, "Backdoor (alternative)"],
    [32779, "Backdoor (alternative)"],
    [32803, "Backdoor (alternative)"],
    [32815, "Backdoor (alternative)"],
    [33434, "Traceroute"],
    [33848, "Backdoor (alternative)"],
    [34567, "TrickBot"],
    [34599, "TrickBot (alternative)"],
    [40421, "CEPH"],
    [41524, "CEPH (alternative)"],
    [47001, "Windows RPC"],
    [47557, "Windows RPC (alternative)"],
]);

function createTextFile(hostname: string, os: string, ports: port[], applications: application[], osInfo: os_info, users: user[]) {
    let date = new Date();
    let mappedPorts = ports.map((v) => {
        return { ...v, description: portMappings.get(parseInt(v.port)) };
    });

    let file = new stringBuilder();
    file.text("Generated Sever Report");
    file.text("Date: " + date.toUTCString());
    file.text("");
    file.text("");
    file.text(`System Name: ${hostname.toUpperCase()}`);
    file.text(`System Detected OS: ${os.toUpperCase()}`);
    file.text(
        `System Info: \nOperating System: ${osInfo.osName}\nOS Version: ${osInfo.osVersion}\nOS Manufacturer: ${osInfo.osManufacturer}\nArchitecture: ${osInfo.arch}`
    );
    file.text("");
    file.text("");
    file.text("Users:");
    file.text("");
    file.text(`${splitTable(users)}`);
    file.text("");
    file.text(`Number of Users: ${users.length}`);
    file.text("");
    file.text(`Applications Installed:`);
    file.text("");
    file.text(`${splitTable(applications)}`);
    file.text("");
    file.text(`Number of Installed Applications: ${applications.length}`);
    file.text("");
    file.text("");
    file.text(`Network configurations:`);
    file.text("");
    file.text(`${asTable(mappedPorts)}`);
    file.text("");
    file.text(`Number of Listening Ports: ${ports.length}`);

    if (!fs.existsSync("./scans")) {
        fs.mkdirSync("./scans");
    }
    fs.writeFileSync(`./scans/${hostname}.txt`, file.finish());
    log("Created Text File " + `./scans/${hostname}.txt`, "success");
    return file.finish();
}
async function getUsersWindows(conn: SSH2CONN) {
    try {
        let usersOutput = await getOutput(conn, commands.users.parsing.windows);
        return parseUsersWindows(usersOutput);
    } catch (error) {}
    return [];
}
type user = {
    username: string;
    dir: string;
    id: string;
    gid: string;
    description: string;
};
type windowsUser = {
    Node: string;
    Caption: string;
    Description: string;
    Domain: string;
    Name: string;
    SID: string;
};
async function parseUsersWindows(str: string) {
    let users: user[] = [];
    try {
        let windowsUsers: windowsUser[] = await csv().fromString(str.trim());

        users = windowsUsers.map((u) => {
            return {
                username: u.Name,
                dir: u.Caption,
                description: u.Description,
                gid: u.Domain,
                id: u.SID,
            };
        });
    } catch (error) {}
    return users;
}

async function getUsersLinux(conn: SSH2CONN) {
    try {
        let usersOutput = await getOutput(conn, commands.users.parsing.linux);

        return parseUsersLinux(usersOutput);
    } catch (error) {}
    return [];
}
function parseUsersLinux(str: string) {
    let users: user[] = [];
    try {
        let user_line = str.split("\n").filter((v) => {
            if (v == "") return false;
            if (v.startsWith("#")) return false;
            return true;
        });
        for (let i = 0; i < user_line.length; i++) {
            let currUser_line = user_line[i];
            let currUser_Array = currUser_line.split(" ");
            let currUser: user = {
                username: currUser_Array[0],
                id: currUser_Array[1],
                gid: currUser_Array[2],
                dir: currUser_Array[3],
                description: currUser_Array[4],
            };
            users.push(currUser);
        }
    } catch (error) {}
    return users;
}

//OS info

async function getOsInfoWindows(conn: SSH2CONN) {
    let os_infoOutput;
    try {
        os_infoOutput = await getOutput(conn, commands.os_info.windows);
        os_infoOutput = await csv().fromString(os_infoOutput.trim());
        let curr_os: os_info = {
            osName: os_infoOutput[0]["OS Name"],
            osVersion: os_infoOutput[0]["OS Version"],
            osManufacturer: os_infoOutput[0]["OS Manufacturer"],
            arch: os_infoOutput[0]["System Type"],
        };
        return curr_os;
    } catch (error) {}
    return {
        osName: "Unknown",
        osVersion: "Unknown",
        osManufacturer: "Unknown",
        arch: "Unknown",
    };
}

async function getOsInfoLinux(conn: SSH2CONN) {
    let os_infoOutput;
    try {
        os_infoOutput = await getOutput(conn, commands.os_info.linux);
        let os_name = await getOutput(conn, commands.os_info.linux_name);
        os_infoOutput = os_infoOutput.split(" ").filter((v) => v != "");
        let curr_os: os_info = {
            osName: os_name.trim(),
            osVersion: os_infoOutput[2].trim(),
            osManufacturer: os_infoOutput[1].trim(),
            arch: os_infoOutput[3].trim(),
        };
        return curr_os;
    } catch (error) {}
    return {
        osName: "Unknown",
        osVersion: "Unknown",
        osManufacturer: "Unknown",
        arch: "Unknown",
    };
}

//Getting installed APPs
async function getInstalledAppsLinux(conn: SSH2CONN) {
    let applications;
    try {
        applications = await getOutput(conn, commands.processes.installed.linux.step_1);
        if (applications.includes("No such file")) {
            applications = await getOutput(conn, commands.processes.installed.linux.step_2);
            return parseLinuxAppsStepTwo(applications);
        }
        return parseLinuxApps(applications);
    } catch (error) {}
    return [];
}
async function getInstallAppsFreeBsd(conn: SSH2CONN) {
    let applications;
    try {
        applications = await getOutput(conn, commands.processes.installed.freebsd.step_1);
        if (applications.includes("not found")) {
            applications = await getOutput(conn, commands.processes.installed.freebsd.step_2);
        }
        return parseFreeBSDApps(applications);
    } catch (error) {}
    return [];
}
async function getInstallAppsSunOS(conn:SSH2CONN){
    let applications;
    try {
        applications = await getOutput(conn, commands.processes.installed.sunos);
        return parseSunOSApps(applications)
    } catch (error) {
        
    }
    return [];

}
async function getInstalledAppsWindows(conn: SSH2CONN) {
    let applications;
    try {
        applications = await getOutput(conn, commands.processes.installed.windows.step_1);
        if (applications.includes("Cannot find path")) {
            applications = await getOutput(conn, commands.processes.installed.windows.step_2);
        }
        return parseWindowsApps(applications);
    } catch (error) {}
    return [];
}
function parseWindowsApps(str: string) {
    let applications: application[] = [];

    try {
        let app_line = str.split("\n").filter((v) => {
            if (v == "") return false;
            if (v === "\r") return false;
            if (v.startsWith("----")) return false;
            return true;
        });
        let first_end = 0;
        let second_end = 0;
        for (let i = 0; i < app_line.length; i++) {
            let currApp_line = app_line[i];
            if (currApp_line.startsWith("DisplayName")) {
                first_end = currApp_line.indexOf("Publisher");
                second_end = currApp_line.indexOf("InstallDate");
                continue;
            }
            // let currApp_Array = currApp_line.split("   ").filter((v) => v != "");
            // let installDate = new Date(currApp_Array[2] ? currApp_Array[2] : 0);
            let name = currApp_line.substring(0, first_end).trim();
            if (name.length == 0) {
                continue;
            }
            let currApp: application = {
                installDate: currApp_line.substring(second_end).trim(),
                name: currApp_line.substring(0, first_end).trim(),
                description: currApp_line.substring(first_end, second_end).trim(),
            };
            applications.push(currApp);
        }
    } catch (error) {}
    return applications;
}

function parseFreeBSDApps(str: string) {
    let applications: application[] = [];
    try {
        let app_line = str.split("\n").filter((v) => v != "");
        for (let i = 0; i < app_line.length; i++) {
            let currApp_line = app_line[i];
            let currApp_Array = currApp_line.split(" ");
            let currApp: application = {
                installDate: "Unknown",
                name: currApp_Array[0],
                description: currApp_Array[currApp_Array.length - 1],
            };
            applications.push(currApp);
        }
    } catch (error) {}
    return applications;
}

function parseSunOSApps(str:string){
    let applications: application[] = [];
    try {
        let app_line = str.split("\n").filter((v) => v != "");
        for (let i = 0; i < app_line.length; i++) {
            let currApp_line = app_line[i];
            let currApp_Array = currApp_line.split(" ").filter((v) => v != "").map((v)=> v.trim());
            let currApp: application = {
                installDate: "unknown",
                name: currApp_Array[1],
                description: currApp_Array[2],
            };
            applications.push(currApp);
        }
    } catch (error) {
        
    }
   

    return applications;

}

function parseLinuxApps(str: string) {
    let applications: application[] = [];
    try {
        let app_line = str.split("\n").filter((v) => v != "");
        for (let i = 0; i < app_line.length; i++) {
            let currApp_line = app_line[i];
            let currApp_Array = currApp_line.split(" ");
            let installDate = new Date(currApp_Array[0] + " " + currApp_Array[1]);
            let currApp: application = {
                installDate: installDate.toUTCString(),
                name: currApp_Array[3],
                description: currApp_Array[2],
            };
            applications.push(currApp);
        }
    } catch (error) {}
    return applications;
}
function parseLinuxAppsStepTwo(str: string) {
    let applications: application[] = [];
    try {
        let app_line = str.split("\n").filter((v) => v != "");
        for (let i = 0; i < app_line.length; i++) {
            let currApp_line = app_line[i];
            let currApp_Array = currApp_line.split(" ");
            let installDate = new Date(parseInt(currApp_Array[0]));
            let currApp: application = {
                installDate: installDate.toUTCString(),
                name: currApp_Array[currApp_Array.length - 1],
                description: "install",
            };
            applications.push(currApp);
        }
    } catch (error) {}
    return applications;
}

//Getting listening ports
async function getPortsLinux(conn: SSH2CONN) {
    let network;
    try {
        network = await getOutput(conn, commands.network.ports.linux.step_1);
        if (network.includes("netstat")) {
            network = await getOutput(conn, commands.network.ports.linux.step_2);
        }
        return parseLinuxPorts(network);
    } catch (error) {
        log(`${conn.config[0].host} Unable to get Ports`, "error");
    }
    return [];
}
async function getPortsFreeBSD(conn: SSH2CONN) {
    let network;
    try {
        network = await getOutput(conn, commands.network.ports.freebsd);
        return parseLinuxPorts(network);
    } catch (error) {
        log(`${conn.config[0].host} Unable to get Ports`, "error");
    }
    return [];
}
async function getPortsWindows(conn: SSH2CONN) {
    let network;
    try {
        network = await getOutput(conn, commands.network.ports.windows);
        return parseWindowsPorts(network);
    } catch (error) {
        log(`${conn.config[0].host} Unable to get Ports`, "error");
    }
    return [];
}

function parseWindowsPorts(str: string) {
    let ports: port[] = [];
    try {
        let network_line = str.split("\n").filter((v) => v != "");
        for (let i = 0; i < network_line.length; i++) {
            let port_line = network_line[i];
            let currentPort: port = {
                protocol: "tcp",
                port: port_line.replace("\r", ""),
            };
            if (ports.findIndex((v) => v.port == currentPort.port) != -1) {
                continue;
            }
            ports.push(currentPort);
        }
    } catch (error) {}
    return ports;
}

function parseLinuxPorts(str: string) {
    let ports: port[] = [];
    try {
        let network_line = str.split("\n").filter((v) => v != "");
        for (let i = 0; i < network_line.length; i++) {
            let port_line = network_line[i];
            if (!(port_line.startsWith("TCP") || port_line.startsWith("UDP"))) {
                continue;
            }
            let split_line = port_line.split(":");

            let currentPort: port = {
                protocol: port_line.startsWith("TCP") ? "tcp" : "udp",
                port: split_line[split_line.length - 1],
            };
            if (ports.findIndex((v) => v.port == currentPort.port) != -1) {
                continue;
            }
            ports.push(currentPort);
        }
    } catch (error) {}

    return ports;
}

class stringBuilder {
    output: string;
    constructor() {
        this.output = "";
    }
    text(str: string) {
        this.output += str + "\n";
    }
    finish() {
        return this.output;
    }
}

function splitTable(object: any[]) {
    if (object.length < 20) {
        return asTable(object);
    }
    let middle = Math.floor(object.length / 2);

    let first_half = object.splice(0, middle + 1);
    let second_half = object;
    let first_table = asTable(first_half);
    let second_table = asTable(second_half);
    let first_table_rows = first_table.split("\n");
    let second_table_rows = second_table.split("\n");
    let maxLength = 0;
    for (let i = 0; i < first_table_rows.length; i++) {
        const element = first_table_rows[i];
        if (element.length > maxLength) {
            maxLength = element.length;
        }
    }
    maxLength += 10;
    let table = [];
    for (let i = 0; i < first_table_rows.length; i++) {
        let curr_first_row = first_table_rows[i];
        let curr_second_row = second_table_rows[i];

        table.push(curr_first_row.padEnd(maxLength) + curr_second_row);
    }
    return table.join("\n");
}
export { scanComputer, parseUsersLinux };
