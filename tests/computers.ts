import { Server, ServerInfo, User } from "../src/db/dbtypes";
import dotenv from "dotenv";
dotenv.config();

const defaultPassword = process.env.DEFAULT;

const computers: Server[] = [
    {
        ipaddress: "192.168.15.11",
        Name: "Ubuntu 24",
        "OS Type": "linux",
        domain: "",
        password_changes: 0,
        users: [
            {
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
        ],
    },
    {
        ipaddress: "192.168.15.12",
        Name: "Centos 8",
        "OS Type": "linux",
        domain: "",
        password_changes: 0,
        users: [
            {
                domain: "",
                failedPasswords: [],
                hostname: "Centos 8",
                ipaddress: "192.168.15.12",
                password: defaultPassword || "Password123",
                password_changes: 0,
                ssh_key: false,
                user_id: "Centos8",
                username: "root",
                oldPasswords: [],
            },
        ],
    },
    {
        ipaddress: "192.168.15.13",
        Name: "Centos 7",
        "OS Type": "linux",
        domain: "",
        password_changes: 0,
        users: [
            {
                domain: "",
                failedPasswords: [],
                hostname: "Centos 7",
                ipaddress: "192.168.15.13",
                password: defaultPassword || "Password123",
                password_changes: 0,
                ssh_key: false,
                user_id: "Centos7",
                username: "root",
                oldPasswords: [],
            },
        ],
    },
    {
        ipaddress: "192.168.15.14",
        Name: "Freebsd 13",
        "OS Type": "freebsd",
        domain: "",
        password_changes: 0,
        users: [
            {
                domain: "",
                failedPasswords: [],
                hostname: "Freebsd 13",
                ipaddress: "192.168.15.14",
                password: defaultPassword || "Password123",
                password_changes: 0,
                ssh_key: false,
                user_id: "Freebsd 13",
                username: "root",
                oldPasswords: [],
            },
        ],
    },
];

export { computers };
