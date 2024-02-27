import { commands } from "../util/commands";
import { getOutput, runCommandNoExpect } from "../util/run_command";
import { SSH2CONN, testPassword } from "../util/ssh_utils";



async function  changePasswordUsingShadowFile(conn:SSH2CONN, username:string, password_hash:string, password:string,sudoPassword:string){
    let backupShadowFile = await backUpShadow(conn);
    if(!backupShadowFile){
        return "Unable to backup Shadow File"
    }
    // Do not continue if shadow cannot be backed up 

    let shadowFile = await getShadowFile(conn);
    if(!shadowFile) return "Unable to get Shadow File";

    let lines = [];
    let shadowLines = shadowFile.split('\n');
    let foundUser = false;
    for (let i = 0; i < shadowLines.length; i++) {
        let line = shadowLines[i];
        let felids = line.trim().split(":");
        if(felids[0] != username){
            lines.push(line);
            continue;
        }
        foundUser = true;
        felids[1] = password_hash;
        felids[2] =  Math.floor(((new Date()).getTime()) / 86400000).toString();
        line = felids.join(":")
        lines.push(line);
    }
    let newShadowFile = lines.join("\n");
    if(!foundUser) return "Unable to find User in Shadow File"
    let resultShadow = await writeShadowFile(conn, newShadowFile);
    if(!resultShadow) {
        resultShadow = await restoreShadow(conn);
        if(!resultShadow) return "Restoring Shadow File Failed"
        resultShadow = await removeCopyShadow(conn);
        if(!resultShadow) return "Unable to remove copy of shadow file."
        return "Unable to write Shadow File, Old Shadow File restored";
    }
    conn.success("Wrote Shadow file");

    let resultPassword = await testPassword(conn, password);
    if(!resultPassword) {
        resultShadow = await restoreShadow(conn);
        if(!resultShadow) return "Unable to Access Computer After Shadow File, Restoring Shadow File Failed"
        resultShadow = await removeCopyShadow(conn);
        if(!resultShadow) return "Unable to Access Computer After Shadow File, Unable to remove copy of shadow file."
        return "Unable to Access Computer After Shadow File, Old Shadow File restored";
    }
    resultShadow = await removeCopyShadow(conn);
    if(!resultShadow) conn.warn("unable to remove the copied shadow file")
    return resultPassword;

}
async function writeShadowFile(conn:SSH2CONN, shadowFile:string){
    try {
        let connSftp = await conn.sftp();
        await connSftp.writeFile("/etc/shadow", shadowFile, {
            encoding: "utf-8",
            flag:"w"
        });
    } catch (error) {
        conn.error(`${(error as Error).message}`)
        return false;
    }

    return true    
}

async function getShadowFile(conn:SSH2CONN){
    conn.log("Getting Shadow File")

    let shadow_file = await getOutput(conn, commands.password.linux.shadow.cat_shadow_file);
    if(shadow_file.includes("Timed Out")) return false;
    if(shadow_file.toLowerCase().includes("denied")) return false;

    return shadow_file;
}


async function backUpShadow(conn:SSH2CONN){
    conn.log("Backing Up Shadow File")
    let result = await runCommandNoExpect(conn, commands.password.linux.shadow.copy_shadow_file)
    if(typeof result ==  'string'){
        conn.error("Unable to backup Shadow File")
        console.log(result)
        return false;
    }
    return true;
}

async function removeCopyShadow(conn:SSH2CONN){
    conn.log("Removing Copy Shadow File")

    let result = await runCommandNoExpect(conn,commands.password.linux.shadow.del_shadow_copy_file)
    if(typeof result ==  'string'){
        conn.error("Unable to delete Shadow File copy")
        console.log(result)
        return false;
    }
    return true
}


async function restoreShadow(conn:SSH2CONN){
    conn.log("Restoring Shadow File")
    let result = await runCommandNoExpect(conn, commands.password.linux.shadow.revert_shadow_file)
    if(typeof result ==  'string'){
        conn.error("Unable to restore Shadow File")
        console.log(result)
        return false;
    }
    return true;
}



export {changePasswordUsingShadowFile}