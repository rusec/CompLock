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
    describe("readComputers", () => {
        it("should be able to get computers in DB", async () => {
            const computer = await db.readComputers();
            assert.ok(computer, "was unable to get computers");
            assert.ok(computer.length > 0, "was unable to get user for computer");
        });
    });
    describe("getComputer", () => {
        it("should be able to get computer and user", async () => {
            const computer = await db.getComputer("192.168.1.3");
            assert.ok(computer, "was unable to find target");
            assert.ok(computer.users.length > 0, "was unable to get user for computer");
        });
        it("shouldnt be able to get non-existence computer", async () => {
            const computer = await db.getComputer("192.168.1.2");
            assert.ok(!computer, "was able to get computer that doesnt exit");
        });
    });

    describe("getUserByID", () => {
        it("should be able to get user by id", async () => {
            const computer = await db.getComputer("192.168.1.3");
            assert.ok(computer, "was unable to find target");
            assert.ok(computer.users.length > 0, "was unable to get user for computer");
            const user = await db.getUserByID(computer.users[0].user_id);
            assert.ok(user, "unable to get user");
        });
        it("shouldnt be able to get user by id they dont exist", async () => {
            const user = await db.getUserByID("Pineapples");
            assert.ok(!user, "able to get user");
        });
    });
    describe("getUser", () => {
        it("should be able to get user by username and ip", async () => {
            const computer = await db.getComputer("192.168.1.3");
            assert.ok(computer, "was unable to find target");
            assert.ok(computer.users.length > 0, "was unable to get user for computer");
            const user = await db.getUser(computer.ipaddress, computer.users[0].username);
            assert.ok(user, "unable to get user");
        });
        it("shouldnt be able to get user by username and ip if they dont exist", async () => {
            const user = await db.getUser("192.168.1.2", "username");
            assert.ok(!user, "able to get user");
        });
    });
    describe("editUser", () => {
        it("should be able to change user username and domain", async () => {
            const computer = await db.getComputer("192.168.1.3");
            assert.ok(computer, "was unable to find target");
            assert.ok(computer.users.length > 0, "was unable to get user for computer");

            let result = await db.editUser(computer.users[0].user_id, "pineapples", "www.example.com");
            assert.ok(result, "unable to edit user");

            const user = await db.getUserByID(computer.users[0].user_id);
            assert.ok(user, "unable to get user after edit");
            assert.ok(user.username == "pineapples", "username was unchanged");
            assert.ok(user.domain == "www.example.com", "domain was unchanged");
        });
        it("shouldnt be able to change non-existent user", async () => {
            let result = await db.editUser("BOB", "pineapples", "www.example.com");
            assert.ok(!result, "able to edit user which doesnt exit");
        });
    });
    describe("editComputer", () => {
        it("should be able to change domain and os", async () => {
            let computer = await db.getComputer("192.168.1.3");
            assert.ok(computer, "was unable to find target");

            let result = await db.editComputer(computer.ipaddress, "pineapples", "darwin");
            assert.ok(result, "unable to edit computer");

            computer = await db.getComputer(computer.ipaddress);
            assert.ok(computer, "unable to get computer after edit");
            assert.ok(computer.domain == "pineapples", "domain was unchanged");
            assert.ok(computer["OS Type"] == "darwin", "os was unchanged");
        });
        it("shouldnt be able to change non-existent computer", async () => {
            let result = await db.editComputer("192.168.1.2", "pineapples", "darwin");
            assert.ok(!result, "was able to edit computer which doesn't exist in db");
        });
    });
    describe("updateComputerHostname", () => {
        it("should be able to change target hostname", async () => {
            let computer = await db.getComputer("192.168.1.3");
            assert.ok(computer, "was unable to find target");
            assert.ok(computer.users.length > 0, "was unable to get user for computer");

            let result = await db.updateComputerHostname(computer.ipaddress, "pineapples");
            assert.ok(result, "unable to edit computer");

            computer = await db.getComputer(computer.ipaddress);
            assert.ok(computer, "unable to get user after edit");
            assert.ok(computer.Name == "pineapples", "hostname was unchanged");
            for (let user of computer.users) {
                assert.ok(user.hostname == "pineapples", "hostname was unchanged");
            }
        });
        it("shouldnt be able to change hostname of non-existent computer", async () => {
            let result = await db.updateComputerHostname("192.168.1.2", "pineapples");
            assert.ok(!result, "was able to edit computer which doesn't exist in db");
        });
    });
    describe("removeUser", () => {
        it("can remove user from target", async () => {
            const computer = await db.getComputer("192.168.1.3");
            assert.ok(computer, "was unable to find target");
            assert.ok(computer.users.length > 0, "was unable to get user for computer");

            let result = await db.removeUser("192.168.1.3", computer.users[0].user_id);
            assert.ok(result, "unable to remove user");
        });
    });
    describe("removeComputer", () => {
        it("can remove user from target", async () => {
            const computer = await db.getComputer("192.168.1.3");
            assert.ok(computer, "was unable to find target");

            let result = await db.removeComputer("192.168.1.3");
            assert.ok(result, "unable to remove target");
        });
    });
    describe("deleteDb", () => {
        it("can reset DB", async () => {
            await db.deleteDB();
            let servers = await db.readComputers();
            assert.ok(servers.length === 0, "there were computers read after db delete");
        });
    });
    describe("SSH Keys", () => {
        it("Private Key", async () => {
            let privatekey = await db.getPrivateSSHKey();
            assert.ok(typeof privatekey === "string" && privatekey.length > 10, "was unable get private key");
        });
        it("Public Key", async () => {
            let publicKey = await db.getPublicSSHKey();
            assert.ok(typeof publicKey === "string" && publicKey.length > 10, "was unable get public key");
        });
    });
});
