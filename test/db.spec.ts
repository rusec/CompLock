import assert from "assert";
import db from "../src/db/db";
describe("DataBase", () => {
    before(async () => {
        await db.writePassword("ThisIsTheTestPassword");
    });
    describe("Add Computer", () => {
        it("should add a user successfully", async () => {
            const ip = "192.168.1.1";
            const os = "linux";
            const hostname = "myhost";
            const domain = "example.com";
            const result = await db.addTarget(hostname, ip, os, domain);

            assert.ok(result);
        });
    });
    describe("Add User", () => {
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
});
