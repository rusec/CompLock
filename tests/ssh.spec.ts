import { getOutput, runCommand, runCommandNoExpect, runCommandNotExpect } from "../src/modules/util/run_command";
import { changePasswordOf } from "../src/modules/password/change_passwords";
import { detect_hostname, detect_os, ejectSSHkey, makeConnection, removeSSHkey, testPassword } from "../src/modules/util/ssh_utils";
import { computers } from "./computers";
import assert from "assert";
import dotenv from "dotenv";
dotenv.config();

const defaultPassword = process.env.DEFAULT;

for (let computer of computers) {
    console.log("\n\n\n");
    describe(`SSH ${computer["OS Type"]} ${computer.Name} ${computer.ipaddress}`, () => {
        let user = computer.users[0];
        if (!user) {
            throw new Error("Unable to find User");
        }
        it("Can Make Connection to server", async () => {
            let ssh = await makeConnection(user, 3000, 3);
            assert.ok(ssh, "Unable to connect to target server");
            if (ssh) await ssh.close();
        });
        describe("Getting Status", () => {
            it("get hostname", async () => {
                let ssh = await makeConnection(user, 3000, 3);
                if (!ssh) {
                    throw new Error("Unable to connect to target server");
                }
                let hostname = await detect_hostname(ssh);
                assert.ok(hostname, "Unable to get hostname");
                await ssh.close();
            });

            it("get os", async () => {
                let ssh = await makeConnection(user, 3000, 3);
                if (!ssh) {
                    throw new Error("Unable to connect to target server");
                }
                let os = await detect_os(ssh);
                assert.ok(os, "Unable to get hostname");
                await ssh.close();
            });
        });

        describe("Password Test", () => {
            it("Test Current password", async () => {
                let ssh = await makeConnection(user, 3000, 3);
                if (!ssh) {
                    throw new Error("Unable to connect to target server");
                }
                let password_active = await testPassword(ssh, user.password);

                assert.ok(password_active, "User Password Check was false");
                await ssh.close();
            });
            it("Test Incorrect password", async () => {
                let ssh = await makeConnection(user, 3000, 3);
                if (!ssh) {
                    throw new Error("Unable to connect to target server");
                }
                let password_active = await testPassword(ssh, "RandomPassword");
                assert.ok(!password_active, "User Password Check was true");
                await ssh.close();
            });
            it("Can Change Password (Runs Password Script,)", async () => {
                if (!defaultPassword) {
                    throw new Error("Unable to change password no default password");
                }
                let currUser = user;
                let passwordResult = await changePasswordOf(computer, currUser, defaultPassword + "123");
                assert.ok(!(typeof passwordResult === "string"), passwordResult.toString());
                if (typeof passwordResult === "string") {
                    return;
                }
                console.log("Change Password Back!");

                currUser.password = defaultPassword + "123";
                let passwordResultBack = await changePasswordOf(computer, currUser, defaultPassword);
                assert.ok(!(typeof passwordResultBack === "string"), "Unable to change password back: " + passwordResult.toString());
                if (typeof passwordResultBack === "string") {
                    return;
                }
            });
        });
        describe("Command Utils", async () => {
            let ssh = await makeConnection(user, 3000, 3);
            if (!ssh) {
                throw new Error("Unable to connect to target server");
            }

            it("runCommandNotExpect", async () => {
                let result = await runCommandNotExpect(ssh, "hostname", "error");
                assert.ok(!(typeof result === "string"), "Got Error: " + result.toString());
            });
            it("runCommand", async () => {
                let result = await runCommand(ssh, "echo hello", "hello");
                if (typeof result === "string") {
                    assert.ok(false, result);
                    return;
                }
                assert.ok(result, "Command returned false");
            });
            it("runCommandNoExpect", async () => {
                let result = await runCommandNoExpect(ssh, "exit 1");
                assert.ok(result, "Got output on expect no output");
            });
            it("getOutput", async () => {
                let result = await getOutput(ssh, "echo This Should be Echoed");
                assert.ok(result.includes("This Should be Echoed"), "Got Error: " + result);
            });
            await ssh.close();
        });

        describe("SSH Key", () => {
            it("Can deploy to Server", async () => {
                let ssh = await makeConnection(user, 3000, 3);
                if (!ssh) {
                    throw new Error("Unable to connect to target server");
                }
                let sshkey = await ejectSSHkey(ssh, computer["OS Type"]);
                assert.ok(sshkey, "Unable to inject SSH key");
                await ssh.close();
            });

            it("Can remove from Server", async () => {
                let ssh = await makeConnection(user, 3000, 3);
                if (!ssh) {
                    throw new Error("Unable to connect to target server");
                }
                let sshkey = await removeSSHkey(ssh, computer["OS Type"]);
                assert.ok(sshkey, "Unable to remove SSH key");
                await ssh.close();
            });
        });
    });
}
