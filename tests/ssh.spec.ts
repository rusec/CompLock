import { makeConnection } from "src/modules/util/ssh_utils";
import { computers, computerUsers } from "./computers";
import { assert } from "console";

for (let computer of computers) {
    describe(`SSH ${computer["OS Type"]} ${computer.Name} ${computer["IP Address"]}`, () => {
        let user = computerUsers[computer.users[0]];
        if (!user) {
            throw new Error("Unable to find User");
        }
        it("Can Make Connection to server", async () => {
            let ssh = await makeConnection(user, 3000, 3);
            assert(ssh, "Unable to find ");
            if (ssh) await ssh.close();
        });
    });
}
