import assert from "assert";
import db from "../src/db/db";
describe("DataBase", () => {
    before(async () => {
        await db.writePassword("ThisIsTheTestPassword");
    });
    describe("Add User", () => {
        it("should add a user successfully", async () => {
            const ip = "192.168.1.1";
            const username = "testuser";
            const password = "secretpassword";
            const hostname = "myhost";
            const domain = "example.com";

            const result = await db.addUser(ip, username, password, hostname, domain);

            assert.ok(result);
        });
    });
});
