import { options } from "../modules/util/options";

export type ServerCSV = {
    Name: string;
    "IP Address": string;
    "OS Type": options;
    username: string;
    password: string;
    domain: string;
};

export type ServerInfo = {
    Name: string;
    "IP Address": string;
    "OS Type": options;
    password_changes: number;
    domain: string;
    users: string[];
};

export type User = {
    user_id: string;
    hostname: string;
    ipaddress: string;
    username: string;
    domain: string;
    password: string;
    ssh_key: boolean;
    password_changes: number;
    oldPasswords: string[];
    failedPasswords:string[];
};

export type Server = {
    Name: string;
    ipaddress: string;
    "OS Type": options;
    password_changes: number;
    domain: string;
    users: User[];
};

export type ServerUser = {
    Name: string;
    user_id: string;
    "IP Address": string;
    Username: string;
    Password: string;
    OldPasswords: string[];
    "OS Type": options;
    ssh_key: boolean;
    password_changes: number;
    domain: string;
};
