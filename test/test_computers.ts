import { ServerInfo } from "../src/db/dbtypes";
const computer = {};
const target_freebsd: ServerInfo = {
    "IP Address": "192.168.1.160",
    Name: "Target",
    "OS Type": "freeBSD",
    Password: "password",
    Username: "root",
    ssh_key: false,
    OldPasswords: [],
    password_changes: 0,
    domain: "",
};
const target_rocky: ServerInfo = {
    "IP Address": "192.168.1.154",
    Name: "Target",
    "OS Type": "linux",
    Password: "password",
    Username: "root",
    ssh_key: false,
    password_changes: 0,
    OldPasswords: [],
    domain: "",
};
const target_linux: ServerInfo = {
    "IP Address": "192.168.64.3",
    Name: "Target",
    "OS Type": "linux",
    Password: "Password123",
    Username: "ubuntu",
    ssh_key: false,
    OldPasswords: [],
    password_changes: 0,
    domain: "",
};
const target_win: ServerInfo = {
    "IP Address": "192.168.1.165",
    Name: "Target",
    "OS Type": "windows",
    Password: "Password123",
    Username: "Administrator",
    ssh_key: false,
    password_changes: 0,
    OldPasswords: [],
    domain: "",
};
const target_win_12: ServerInfo = {
    "IP Address": "192.168.1.166",
    Name: "Target",
    "OS Type": "windows",
    Password: "Password123",
    Username: "Administrator",
    OldPasswords: [],
    ssh_key: false,
    password_changes: 0,
    domain: "",
};
export { target_freebsd, target_linux, target_rocky, target_win, target_win_12 };
