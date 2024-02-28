import { ejectSSHkey, makeConnection, removeSSHkey } from "../src/modules/util/ssh_utils";
import { computers, computerUsers } from "./computers";
import assert from "assert";

for (let computer of computers) {
    describe(`SSH ${computer["OS Type"]} ${computer.Name} ${computer["IP Address"]}`, () => {
        let user = computerUsers[computer.users[0]];
        if (!user) {
            throw new Error("Unable to find User");
        }
        it("Can Make Connection to server", async () => {
            let ssh = await makeConnection(user, 3000, 3);
            assert.ok(ssh, "Unable to connect to target server");
            if (ssh) await ssh.close();
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
