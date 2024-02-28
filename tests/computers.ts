import { ServerInfo, User } from "src/db/dbtypes";
import dotenv from "dotenv";
dotenv.config();

const defaultPassword = process.env.DEFAULT;

const computers: ServerInfo[] = [
    {
        "IP Address": "192.168.15.11",
        Name: "Ubuntu 24",
        "OS Type": "linux",
        domain: "",
        password_changes: 0,
        users: ["ubuntu24"],
    },
];
interface Users {
    [key: string]: User;
}

const computerUsers: Users = {
    ubuntu24: {
        domain: "",
        failedPasswords: [],
        hostname: "Ubuntu 24",
        ipaddress: "192.168.15.11",
        password: defaultPassword || "Password123",
        password_changes: 0,
        ssh_key: false,
        user_id: "ubuntu24",
        username: "root",
        oldPasswords: [],
    },
};

export { computers, computerUsers };
