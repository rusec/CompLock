import logger from "../console/logger";
import { commands } from "../util/commands";
import { SSH2CONN } from "../util/ssh_utils";
import { encryptPassword } from "../util/util";
import { changePasswordUsingShadowFile } from "./shadow_file";

async function changePasswordSunOS(conn: SSH2CONN, username: string, password: string, sudoPassword: string){
    let then = new Date();
    try {
        let passwordHash = encryptPassword(password);
        let passwordResult = await changePasswordUsingShadowFile(conn, username, passwordHash, password, password);
        return passwordResult;
    } catch (error) {
        
    }finally{
        var now = new Date();
        var lapse_time = now.getTime() - then.getTime();
        logger.log(`Time to change Password ${lapse_time} ms on Sunos`);
    }
    
}

export {changePasswordSunOS}
