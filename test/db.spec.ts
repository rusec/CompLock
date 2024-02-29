import assert from "assert";
import db from "../src/db/db";
describe("DataBase", () => {
    before(() => {
        return new Promise<boolean>((resolve) => {
            db.writePassword("ThisIsTheTestPassword").then(() => resolve(true));
        });
    });

    describe("addTarget", () => {
        it("should add a target successfully", async () => {
            const ip = "192.168.1.1";
            const os = "linux";
            const hostname = "myhost";
            const domain = "example.com";
            const result = await db.addTarget(hostname, ip, os, domain);

            assert.ok(result);
        });
    });
    describe("addUser", () => {
        it("should add a user successfully", async () => {
            const ip = "192.168.1.1";
            const username = "testuser";
            const password = "secretpassword";
            const hostname = "myhost";
            const domain = "example.com";

            const result = await db.addUser(ip, username, password, hostname, domain);

            assert.ok(result, "unable to add user to pc");
        });
        it("shouldn't add user to computer that doesn't exist", async () => {
            const ip = "192.168.1.2";
            const username = "testuser";
            const password = "secretpassword";
            const hostname = "myhost";
            const domain = "example.com";

            const result = await db.addUser(ip, username, password, hostname, domain);

            assert.ok(!result, "added user to computer that doesnt exist");
        });
    });
    describe("addTargetAndUser", () => {
        it("should add a target and user", async () => {
            const ip = "192.168.1.3";
            const os = "linux";
            const hostname = "myhost";
            const domain = "example.com";
            const username = "username";
            const password = "password";
            const result = await db.addTargetAndUser(hostname, ip, username, password, os, domain);

            assert.ok(result);
        });
    });
});
